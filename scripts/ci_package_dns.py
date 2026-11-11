#!/usr/bin/env python3
"""Run CI package preparation with temporary recovery for Ubuntu mirror DNS."""
import ipaddress
import json
import os
import re
import signal
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
         "--noproxy", "*", "--resolve", "cloudflare-dns.com:443:1.1.1.1", "-H", "accept: application/dns-json",
         f"https://cloudflare-dns.com/dns-query?name={host}&type=A"],
        check=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=12)
    return addresses(host, json.loads(result.stdout))


def main():
    if sys.platform != "linux" or os.getenv("GITHUB_ACTIONS") != "true" or os.getenv("RUNNER_ENVIRONMENT") != "github-hosted" or len(sys.argv) < 2:
        print("package DNS: unsupported environment or missing command", file=sys.stderr)
        return 1
    additions = []
    try:
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
                additions.extend(f"{address} {host}\n" for address in recover(host))
                print(f"package DNS: {host} recovery ok", flush=True)
    except (ValueError, TypeError, KeyError, json.JSONDecodeError, subprocess.SubprocessError, OSError):
        print("package DNS: recovery failed", file=sys.stderr)
        return 1

    child = None
    modified = False
    status = 1
    with tempfile.TemporaryDirectory(prefix="package-dns-") as directory:
        backup = os.path.join(directory, "hosts")
        apt_config = os.path.join(directory, "apt.conf")
        with open(apt_config, "w", encoding="ascii") as config:
            config.write('Acquire::http::Timeout "30";\nAcquire::https::Timeout "30";\nAcquire::Retries "0";\n')
        def interrupted(signum, _frame):
            raise InterruptedError(signum)
        for sig in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP):
            signal.signal(sig, interrupted)
        try:
            if additions:
                subprocess.run(["cp", "/etc/hosts", backup], check=True)
                # Mark before writing so a partial write is also restored.
                modified = True
                with open(backup, "rb") as saved:
                    original = saved.read()
                content = original + (b"\n" if original and not original.endswith(b"\n") else b"") + "".join(additions).encode("ascii")
                subprocess.run(["sudo", "tee", "/etc/hosts"], input=content, stdout=subprocess.DEVNULL, check=True)
            env = os.environ.copy()
            env["APT_CONFIG"] = apt_config
            child = subprocess.Popen(sys.argv[1:], env=env, start_new_session=True)
            try:
                # Bound the complete dependency preparation, including Playwright downloads.
                status = child.wait(timeout=300)
            except subprocess.TimeoutExpired:
                print("package DNS: command timeout", file=sys.stderr)
                os.killpg(child.pid, signal.SIGTERM)
                child.wait(timeout=10)
                status = 124
        except (OSError, subprocess.SubprocessError, InterruptedError):
            if child and child.poll() is None:
                os.killpg(child.pid, signal.SIGTERM)
                try:
                    child.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    os.killpg(child.pid, signal.SIGKILL)
                    child.wait()
            status = 1
        finally:
            if modified:
                # Ignore further catchable termination until restoration completes.
                for sig in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP):
                    signal.signal(sig, signal.SIG_IGN)
                try:
                    with open(backup, "rb") as saved:
                        subprocess.run(["sudo", "tee", "/etc/hosts"], stdin=saved, stdout=subprocess.DEVNULL, check=True)
                    with open(backup, "rb") as saved, open("/etc/hosts", "rb") as current:
                        if saved.read() != current.read():
                            raise OSError("hosts restore mismatch")
                    print("package DNS: hosts restored", flush=True)
                except (OSError, subprocess.SubprocessError):
                    print("package DNS: hosts restore failed", file=sys.stderr)
                    status = 1
    return status if status >= 0 else 128 - status


if __name__ == "__main__":
    sys.exit(main())
