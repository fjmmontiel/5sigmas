#!/usr/bin/env python3
"""Prepare and restore temporary Ubuntu mirror DNS on hosted CI runners."""
import ipaddress
import json
import os
import re
import subprocess
import sys
import tempfile

HOSTS = ("azure.archive.ubuntu.com", "archive.ubuntu.com", "security.ubuntu.com")
DNS_NAME = re.compile(r"(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")


def name(value):
    if not isinstance(value, str):
        raise ValueError("invalid name")
    value = value.rstrip(".").lower()
    if not DNS_NAME.fullmatch(value):
        raise ValueError("invalid name")
    return value


def addresses(host, response):
    if (not isinstance(response, dict) or type(response.get("Status")) is not int
            or response.get("Status") != 0 or response.get("TC") is not False
            or response.get("CD") is not False):
        raise ValueError("invalid DNS status")
    questions = response.get("Question")
    if not isinstance(questions, list) or len(questions) != 1 or not isinstance(questions[0], dict) or name(questions[0].get("name")) != host or questions[0].get("type") != 1:
        raise ValueError("invalid question")
    answers = response.get("Answer")
    if not isinstance(answers, list):
        raise ValueError("missing answers")
    aliases, records = {}, []
    for answer in answers:
        if not isinstance(answer, dict):
            raise ValueError("invalid answer")
        kind = answer.get("type")
        if kind == 5:
            owner, target = name(answer.get("name")), name(answer.get("data"))
            if owner in aliases:
                raise ValueError("duplicate alias")
            aliases[owner] = target
        elif kind == 1:
            owner = name(answer.get("name"))
            if not isinstance(answer.get("data"), str):
                raise ValueError("invalid address")
            address = ipaddress.IPv4Address(answer["data"])
            if not address.is_global:
                raise ValueError("non-global address")
            records.append((owner, str(address)))
    chain = [host]
    while chain[-1] in aliases:
        target = aliases[chain[-1]]
        if target in chain or len(chain) >= 8:
            raise ValueError("invalid alias chain")
        chain.append(target)
    if set(aliases) != set(chain[:-1]) or not records or any(owner != chain[-1] for owner, _ in records):
        raise ValueError("unrelated or missing answers")
    return [address for _, address in records]


def recover(host):
    result = subprocess.run(
        ["curl", "--silent", "--show-error", "--fail", "--connect-timeout", "5", "--max-time", "10",
         "--resolve", "cloudflare-dns.com:443:1.1.1.1", "-H", "accept: application/dns-json",
         f"https://cloudflare-dns.com/dns-query?name={host}&type=A"],
        check=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=12)
    return addresses(host, json.loads(result.stdout))



def restore(backup):
    if not os.path.exists(backup):
        return
    with open(backup, "rb") as saved:
        original = saved.read()
    subprocess.run(["sudo", "-n", "tee", "/etc/hosts"], input=original,
                   stdout=subprocess.DEVNULL, check=True, timeout=15)
    with open("/etc/hosts", "rb") as current:
        if current.read() != original:
            raise OSError("hosts restore mismatch")
    os.unlink(backup)
    print("package DNS: hosts restored", flush=True)


def prepare(backup):
    if os.path.lexists(backup):
        raise OSError("hosts backup already exists")
    additions = []
    for host in HOSTS:
        try:
            result = subprocess.run(["getent", "ahostsv4", host], stdout=subprocess.DEVNULL,
                                    stderr=subprocess.DEVNULL, timeout=5)
            healthy = result.returncode == 0
        except subprocess.TimeoutExpired:
            healthy = False
        if healthy:
            print(f"package DNS: {host} native ok", flush=True)
        else:
            print(f"package DNS: {host} native failed; recovering", flush=True)
            try:
                resolved = recover(host)
            except (ValueError, TypeError, KeyError, subprocess.SubprocessError, OSError):
                print(f"package DNS: {host} recovery failed", file=sys.stderr)
                raise
            additions.extend(f"{address} {host}\n" for address in resolved)
            print(f"package DNS: {host} recovery ok", flush=True)
    if not additions:
        return
    with open("/etc/hosts", "rb") as current:
        original = current.read()
    # Publish a fully written snapshot atomically, without overwriting a prior one.
    fd, temporary = tempfile.mkstemp(prefix=".package-dns-", dir=os.path.dirname(backup))
    try:
        with os.fdopen(fd, "wb") as saved:
            saved.write(original)
            saved.flush()
            os.fsync(saved.fileno())
        os.link(temporary, backup)
    finally:
        os.unlink(temporary)
    content = original + (b"\n" if original and not original.endswith(b"\n") else b"") + "".join(additions).encode("ascii")
    try:
        subprocess.run(["sudo", "-n", "tee", "/etc/hosts"], input=content,
                       stdout=subprocess.DEVNULL, check=True, timeout=15)
    except (OSError, subprocess.SubprocessError):
        try:
            restore(backup)
        except (OSError, subprocess.SubprocessError):
            print("package DNS: hosts restore failed", file=sys.stderr)
        raise


def main():
    runner_temp = os.getenv("RUNNER_TEMP", "")
    if (sys.platform != "linux" or os.getenv("GITHUB_ACTIONS") != "true"
            or os.getenv("RUNNER_ENVIRONMENT") != "github-hosted"
            or not os.path.isabs(runner_temp) or not os.path.isdir(runner_temp)
            or len(sys.argv) != 2 or sys.argv[1] not in ("prepare", "restore")):
        print("package DNS: unsupported environment or operation", file=sys.stderr)
        return 1
    backup = os.path.join(runner_temp, "5sigmas-package-dns-hosts.backup")
    try:
        (prepare if sys.argv[1] == "prepare" else restore)(backup)
    except (ValueError, TypeError, KeyError, subprocess.SubprocessError, OSError):
        print(f"package DNS: {sys.argv[1]} failed", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
