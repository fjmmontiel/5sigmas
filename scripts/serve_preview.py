#!/usr/bin/env python3
"""Static preview server with single-range byte support for browser media lifecycle QA."""
from __future__ import annotations

import argparse
import http.server
import os
import re
import tempfile
import threading
import urllib.error
import urllib.request
from functools import partial
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

_RANGE_RE = re.compile(r"^bytes=(\d*)-(\d*)$")


class RangeRequestHandler(http.server.SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler plus deterministic single-byte-range responses."""

    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            parts = urlsplit(self.path)
            clean_path = urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))
            if not parts.path.endswith("/"):
                self.send_response(301)
                self.send_header("Location", clean_path + "/")
                self.end_headers()
                return None
            for index in ("index.html", "index.htm"):
                candidate = os.path.join(path, index)
                if os.path.isfile(candidate):
                    path = candidate
                    break
            else:
                return self.list_directory(path)

        ctype = self.guess_type(path)
        try:
            f = open(path, "rb")
        except OSError:
            self.send_error(404, "File not found")
            return None

        try:
            st = os.fstat(f.fileno())
            size = st.st_size
            self._range = None
            raw_range = self.headers.get("Range")
            if raw_range:
                parsed = parse_range(raw_range, size)
                if parsed is None:
                    self.send_response(416)
                    self.send_header("Content-Range", f"bytes */{size}")
                    self.send_header("Accept-Ranges", "bytes")
                    self.send_header("Content-Length", "0")
                    self.end_headers()
                    f.close()
                    return None
                start, end = parsed
                self._range = (start, end)
                self.send_response(206)
                self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
                self.send_header("Content-Length", str(end - start + 1))
                f.seek(start)
            else:
                self.send_response(200)
                self.send_header("Content-Length", str(size))
            self.send_header("Content-type", ctype)
            self.send_header("Last-Modified", self.date_time_string(st.st_mtime))
            self.send_header("Accept-Ranges", "bytes")
            self.end_headers()
            return f
        except Exception:
            f.close()
            raise

    def copyfile(self, source, outputfile):
        byte_range = getattr(self, "_range", None)
        if byte_range is None:
            return super().copyfile(source, outputfile)
        start, end = byte_range
        remaining = end - start + 1
        while remaining > 0:
            chunk = source.read(min(64 * 1024, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)

    def log_message(self, fmt, *args):
        print(f"[{self.log_date_time_string()}] {self.address_string()} {fmt % args}", flush=True)


def parse_range(value: str, size: int) -> tuple[int, int] | None:
    match = _RANGE_RE.fullmatch(value.strip())
    if not match or size <= 0:
        return None
    left, right = match.groups()
    if not left and not right:
        return None
    if left:
        start = int(left)
        if start >= size:
            return None
        end = int(right) if right else size - 1
        if end < start:
            return None
        return start, min(end, size - 1)
    suffix = int(right)
    if suffix <= 0:
        return None
    suffix = min(suffix, size)
    return size - suffix, size - 1


def self_test() -> None:
    payload = bytes(range(256)) * 8
    with tempfile.TemporaryDirectory() as tmp:
        sample = Path(tmp) / "sample.bin"
        sample.write_bytes(payload)
        handler = partial(RangeRequestHandler, directory=tmp)
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            url = f"http://127.0.0.1:{server.server_port}/sample.bin"
            request = urllib.request.Request(url, headers={"Range": "bytes=100-199"})
            with urllib.request.urlopen(request, timeout=3) as response:
                body = response.read()
                assert response.status == 206, response.status
                assert response.headers.get("Content-Range") == f"bytes 100-199/{len(payload)}"
                assert response.headers.get("Accept-Ranges") == "bytes"
                assert body == payload[100:200]
            request = urllib.request.Request(url, headers={"Range": "bytes=-32"})
            with urllib.request.urlopen(request, timeout=3) as response:
                assert response.status == 206
                assert response.read() == payload[-32:]
            try:
                request = urllib.request.Request(url, headers={"Range": "bytes=99999-100000"})
                urllib.request.urlopen(request, timeout=3)
            except urllib.error.HTTPError as error:
                assert error.code == 416
            else:
                raise AssertionError("unsatisfiable range did not return 416")
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=3)
    print("Range preview server self-test PASS")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", default="site")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--bind", default="127.0.0.1")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    handler = partial(RangeRequestHandler, directory=args.directory)
    with http.server.ThreadingHTTPServer((args.bind, args.port), handler) as server:
        print(f"Serving {args.directory} at http://{args.bind}:{args.port} with byte-range support", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()
