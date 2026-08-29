#!/usr/bin/env python3
"""
Local preview server WITH HTTP Range support (so audio seeking works).

Python's built-in `python3 -m http.server` does NOT support byte-range
requests, which breaks seeking within tracks. This one does. Run it from
the project root:

    python3 scripts/serve.py            # serves at http://localhost:8899
    python3 scripts/serve.py 3000       # custom port

GitHub Pages supports ranges natively, so this is only needed for local dev.
"""

import functools
import os
import socketserver
import sys
from http.server import SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8899


class RangeHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path.split("?")[0].split("#")[0])
        if os.path.isdir(path):
            return super().send_head()
        try:
            f = open(path, "rb")
        except OSError:
            self.send_error(404)
            return None
        size = os.fstat(f.fileno()).st_size
        ctype = self.guess_type(path)
        rng = self.headers.get("Range")
        if rng and rng.startswith("bytes="):
            try:
                start_s, end_s = rng[6:].split("-")
                start = int(start_s) if start_s else 0
                end = int(end_s) if end_s else size - 1
            except ValueError:
                start, end = 0, size - 1
            end = min(end, size - 1)
            self.send_response(206)
            self.send_header("Content-Type", ctype)
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.send_header("Content-Length", str(end - start + 1))
            self.end_headers()
            f.seek(start)
            self._f, self._remain = f, end - start + 1
            return None
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(size))
        self.end_headers()
        return f

    def copyfile(self, source, outputfile):
        if getattr(self, "_f", None):
            f, remain = self._f, self._remain
            self._f = None
            try:
                while remain > 0:
                    chunk = f.read(min(65536, remain))
                    if not chunk:
                        break
                    outputfile.write(chunk)
                    remain -= len(chunk)
            except (BrokenPipeError, ConnectionResetError):
                pass
            finally:
                f.close()
            return
        super().copyfile(source, outputfile)


socketserver.ThreadingTCPServer.allow_reuse_address = True
handler = functools.partial(RangeHandler, directory=ROOT)
print(f"Serving {ROOT}\n  → http://localhost:{PORT}  (Ctrl+C to stop)")
with socketserver.ThreadingTCPServer(("127.0.0.1", PORT), handler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
