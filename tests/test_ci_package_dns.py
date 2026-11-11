"""Regression coverage for temporary CI DNS recovery; never edits real hosts."""
import copy
import importlib.util
import io
from pathlib import Path
import subprocess
import tempfile
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

    def test_prepare_and_restore(self):
        for mode in ("native", "mixed", "recovered", "partial", "restore_failure", "snapshot_failure"):
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as directory:
                original = b"127.0.0.1 localhost\n# exact bytes"
                state = {"hosts": original, "writes": 0, "lookups": 0}
                backup = str(Path(directory) / "backup")
                real_open = open
                def fake_open(path, *args, **kwargs):
                    if path == "/etc/hosts": return io.BytesIO(state["hosts"])
                    return real_open(path, *args, **kwargs)
                def run(args, **kwargs):
                    if args[0] == "getent":
                        state["lookups"] += 1
                        return subprocess.CompletedProcess(args, 0 if mode == "native" or (mode == "mixed" and state["lookups"] == 1) else 1)
                    self.assertEqual(args, ["sudo", "-n", "tee", "/etc/hosts"])
                    self.assertEqual(kwargs["timeout"], 15)
                    state["writes"] += 1
                    if mode in ("partial", "restore_failure") and state["writes"] == 1:
                        state["hosts"] = b"partial"
                        raise subprocess.CalledProcessError(1, args)
                    if mode == "restore_failure" and state["writes"] == 2:
                        raise subprocess.CalledProcessError(1, args)
                    state["hosts"] = kwargs["input"]
                    return subprocess.CompletedProcess(args, 0)
                real_fsync = dns.os.fsync
                def fsync(fd):
                    if mode == "snapshot_failure": raise OSError("injected failure")
                    real_fsync(fd)
                with mock.patch.object(dns.os, "fsync", side_effect=fsync), \
                     mock.patch("builtins.open", side_effect=fake_open), \
                     mock.patch.object(dns.subprocess, "run", side_effect=run), \
                     mock.patch.object(dns, "recover", return_value=["1.1.1.1"]):
                    if mode in ("partial", "restore_failure"):
                        with self.assertRaises(subprocess.CalledProcessError): dns.prepare(backup)
                    elif mode == "snapshot_failure":
                        with self.assertRaises(OSError): dns.prepare(backup)
                        self.assertFalse(Path(backup).exists())
                        self.assertEqual(state["writes"], 0)
                    else:
                        dns.prepare(backup)
                    if mode == "native":
                        self.assertFalse(Path(backup).exists())
                        self.assertEqual(state["writes"], 0)
                    elif mode in ("mixed", "recovered"):
                        self.assertEqual(Path(backup).read_bytes(), original)
                        self.assertIn(b"1.1.1.1 archive.ubuntu.com", state["hosts"])
                        if mode == "mixed": self.assertNotIn(b"1.1.1.1 azure.archive.ubuntu.com", state["hosts"])
                        with self.assertRaises(OSError): dns.prepare(backup)
                        dns.restore(backup)
                    elif mode == "restore_failure":
                        self.assertEqual(Path(backup).read_bytes(), original)
                        dns.restore(backup)  # always() cleanup's second chance
                    self.assertEqual(state["hosts"], original)
                    self.assertFalse(Path(backup).exists())
                    dns.restore(backup)  # no-op after successful restoration


if __name__ == "__main__":
    unittest.main()
