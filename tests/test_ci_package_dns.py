"""Regression coverage for bounded CI package DNS recovery (no real hosts edits)."""
import copy
import importlib.util
import io
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from unittest import mock

spec = importlib.util.spec_from_file_location("ci_package_dns", Path(__file__).resolve().parents[1] / "scripts/ci_package_dns.py")
dns = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dns)


class PackageDNS(unittest.TestCase):
    def test_answers_reject_unsafe_records(self):
        host = dns.HOSTS[0]
        valid = {"Status": 0, "TC": False, "CD": False,
                 "Question": [{"name": host, "type": 1}],
                 "Answer": [{"name": host, "type": 5, "data": "mirror.example"},
                            {"name": "mirror.example", "type": 1, "data": "1.1.1.1"}]}
        self.assertEqual(dns.addresses(host, valid), ["1.1.1.1"])
        for change in ("private", "unrelated", "empty", "loop", "status", "question"):
            data = copy.deepcopy(valid)
            if change == "private": data["Answer"][1]["data"] = "10.0.0.1"
            if change == "unrelated": data["Answer"][1]["name"] = "other.example"
            if change == "empty": data["Answer"] = []
            if change == "loop": data["Answer"][0]["data"] = host
            if change == "status": data["Status"] = 2
            if change == "question": data["Question"][0]["name"] = "other.example"
            with self.subTest(change=change), self.assertRaises(ValueError):
                dns.addresses(host, data)

    def test_restore_and_config_on_success_failure_signal_and_partial_write(self):
        for mode in ("success", "failure", "signal", "partial"):
            with self.subTest(mode=mode):
                original = b"127.0.0.1 localhost\n# exact bytes"
                state = {"hosts": original, "writes": 0, "config": False}
                class Child:
                    pid = 999
                    def wait(self, timeout=None):
                        if mode == "signal" and not getattr(self, "interrupted", False):
                            self.interrupted = True
                            raise InterruptedError()
                        return 17 if mode == "failure" else 0
                    def poll(self): return 0
                def run(args, **kwargs):
                    if args[0] == "getent": return subprocess.CompletedProcess(args, 1)
                    if args[0] == "cp":
                        Path(args[2]).write_bytes(state["hosts"])
                    elif args[:2] == ["sudo", "tee"]:
                        state["writes"] += 1
                        state["hosts"] = kwargs["input"] if "input" in kwargs else kwargs["stdin"].read()
                        if mode == "partial" and state["writes"] == 1:
                            state["hosts"] = b"partial"
                            raise subprocess.CalledProcessError(1, args)
                    else: raise AssertionError(args)
                    return subprocess.CompletedProcess(args, 0)
                def popen(args, **kwargs):
                    config = Path(kwargs["env"]["APT_CONFIG"])
                    state["config"] = config.is_file() and 'APT::Update::Error-Mode "any"' in config.read_text()
                    return Child()
                real_open = open
                def fake_open(path, *args, **kwargs):
                    if path == "/etc/hosts": return io.BytesIO(state["hosts"])
                    return real_open(path, *args, **kwargs)
                with mock.patch.object(dns.sys, "platform", "linux"), mock.patch.object(dns.sys, "argv", ["wrapper", "command"]), \
                     mock.patch.dict(os.environ, {"GITHUB_ACTIONS": "true", "RUNNER_ENVIRONMENT": "github-hosted"}), \
                     mock.patch("builtins.open", side_effect=fake_open), mock.patch.object(dns.subprocess, "run", side_effect=run), \
                     mock.patch.object(dns.subprocess, "Popen", side_effect=popen), mock.patch.object(dns, "recover", return_value=["1.1.1.1"]), \
                     mock.patch.object(dns, "stop_group"):
                    status = dns.main()
                self.assertEqual(status, {"success": 0, "failure": 17, "signal": 1, "partial": 1}[mode])
                self.assertEqual(state["hosts"], original)
                self.assertEqual(state["writes"], 2)
                self.assertEqual(state["config"], mode != "partial")

    @unittest.skipUnless(sys.platform == "linux", "requires Linux process groups and /proc")
    def test_cleanup_kills_descendant_after_timeout_or_leader_exit(self):
        for leader_exits in (False, True):
            with self.subTest(leader_exits=leader_exits), tempfile.TemporaryDirectory() as directory:
                ready = Path(directory, "pid")
                code = '''import os, signal, sys, time
pid = os.fork()
if pid == 0:
    signal.signal(signal.SIGTERM, signal.SIG_IGN)
    open(sys.argv[1], "w").write(str(os.getpid()))
    while True: time.sleep(1)
while not os.path.exists(sys.argv[1]): time.sleep(0.01)
if sys.argv[2] == "exit": sys.exit(0)
while True: time.sleep(1)
'''
                child = subprocess.Popen([sys.executable, "-c", code, str(ready), "exit" if leader_exits else "wait"], start_new_session=True)
                try:
                    deadline = time.monotonic() + 5
                    while not ready.exists() and time.monotonic() < deadline: time.sleep(0.01)
                    self.assertTrue(ready.exists())
                    descendant = int(ready.read_text())
                    if leader_exits:
                        self.assertEqual(child.wait(timeout=5), 0)
                    else:
                        with self.assertRaises(subprocess.TimeoutExpired): child.wait(timeout=0.05)
                    dns.stop_group(child)
                    # A killed child can remain a zombie until its new parent reaps it.
                    try:
                        state = Path(f"/proc/{descendant}/stat").read_text().rsplit(")", 1)[1].split()[0]
                    except FileNotFoundError:
                        state = "Z"
                    self.assertEqual(state, "Z", "descendant still running after group cleanup")
                finally:
                    try: os.killpg(child.pid, signal.SIGKILL)
                    except ProcessLookupError: pass
                    child.wait()


if __name__ == "__main__":
    unittest.main()
