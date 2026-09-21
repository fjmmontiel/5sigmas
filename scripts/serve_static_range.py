#!/usr/bin/env python3
"""Serve a static directory with deterministic single-range HTTP support.

Python's stdlib SimpleHTTPRequestHandler does not provide the byte-range
semantics Chromium needs for representative MP4 seek testing. This helper is
only a local/CI preview server; production media remains unchanged.
"""

from __future__ import annotations

import argparse
import os
import re
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

_RANGE_RE = re.compile(r"^bytes=(\d*)-(\d*)$")


class RangeRequestHandler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def __init__(self, *args, directory: str | None = None, **kwargs):
        self._range: tuple[int, int] | None = None
        super().__init__(*args, directory=directory, **kwargs)

    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            return super().send_head()

        try:
            file = open(path, "rb")
        except OSError:
            self.send_error(HTTPStatus.NOT_FOUND, "File not found")
            return None

        try:
            stat = os.fstat(file.fileno())
            size = stat.st_size
            content_type = self.guess_type(path)
            range_header = self.headers.get("Range")

            if range_header:
                match = _RANGE_RE.fullmatch(range_header.strip())
                if not match:
                    self.send_error(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                    file.close()
                    return None

                start_text, end_text = match.groups()
                if not start_text and not end_text:
                    self.send_error(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                    file.close()
                    return None

                if start_text:
                    start = int(start_text)
                    end = int(end_text) if end_text else size - 1
                else:
                    suffix = int(end_text)
                    if suffix <= 0:
                        self.send_error(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                        file.close()
                        return None
                    start = max(0, size - suffix)
                    end = size - 1

                if start >= size or start < 0 or end < start:
                    self.send_response(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                    self.send_header("Content-Range", f"bytes */{size}")
                    self.send_header("Accept-Ranges", "bytes")
                    self.send_header("Content-Length", "0")
                    self.end_headers()
                    file.close()
                    return None

                end = min(end, size - 1)
                self._range = (start, end)
                self.send_response(HTTPStatus.PARTIAL_CONTENT)
                self.send_header("Content-type", content_type)
                self.send_header("Accept-Ranges", "bytes")
                self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
                self.send_header("Content-Length", str(end - start + 1))
                self.send_header("Last-Modified", self.date_time_string(stat.st_mtime))
                self.end_headers()
                file.seek(start)
                return file

            self._range = None
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-type", content_type)
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Length", str(size))
            self.send_header("Last-Modified", self.date_time_string(stat.st_mtime))
            self.end_headers()
            return file
        except Exception:
            file.close()
            raise

    def copyfile(self, source, outputfile):
        if self._range is None:
            return super().copyfile(source, outputfile)

        start, end = self._range
        remaining = end - start + 1
        while remaining > 0:
            chunk = source.read(min(64 * 1024, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", default=".")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    directory = str(Path(args.directory).resolve())

    def handler(*handler_args, **handler_kwargs):
        return RangeRequestHandler(*handler_args, directory=directory, **handler_kwargs)

    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"Serving {directory} on http://{args.host}:{args.port} with byte ranges", flush=True)
    server.serve_forever()
