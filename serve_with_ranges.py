import http.server
import socketserver
import os
import re

PORT = 8000
DIRECTORY = "site"

class RangeHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """
    Custom HTTPRequestHandler with support for the 'Range' header.
    Needed for seeking in audio/video files during local development.
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def send_head(self):
        path = self.translate_path(self.path)
        f = None
        if os.path.isdir(path):
            parts = urllib.parse.urlsplit(self.path)
            if not parts.path.endswith('/'):
                # redirect browser - doing basically what simple_server does
                self.send_response(301)
                new_parts = (parts[0], parts[1], parts[2] + '/',
                             parts[3], parts[4])
                new_url = urllib.parse.urlunsplit(new_parts)
                self.send_header("Location", new_url)
                self.end_headers()
                return None
            for index in "index.html", "index.htm":
                index = os.path.join(path, index)
                if os.path.exists(index):
                    path = index
                    break
            else:
                return super().send_head()

        ctype = self.guess_type(path)
        
        # Handle Range header
        if "Range" in self.headers:
            try:
                f = open(path, 'rb')
            except OSError:
                self.send_error(404, "File not found")
                return None
            
            try:
                fs = os.fstat(f.fileno())
                file_len = fs[6]
                
                range_header = self.headers["Range"]
                range_match = re.search(r'bytes=(\d+)-(\d*)', range_header)
                
                if range_match:
                    start = int(range_match.group(1))
                    end = range_match.group(2)
                    if end:
                        end = int(end)
                    else:
                        end = file_len - 1
                    
                    if start >= file_len:
                        self.send_error(416, "Requested Range Not Satisfiable")
                        self.send_header("Content-Range", f"bytes */{file_len}")
                        self.end_headers()
                        return None
                        
                    length = end - start + 1
                    
                    self.send_response(206)
                    self.send_header("Content-type", ctype)
                    self.send_header("Content-Range", f"bytes {start}-{end}/{file_len}")
                    self.send_header("Content-Length", str(length))
                    self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
                    self.end_headers()
                    
                    f.seek(start)
                    self.copyfile(f, self.wfile)  # Note: copyfile might copy too much, but for simple seeking it often works or we limit read
                    # Ideally we should limit read to 'length' bytes.
                    # SimpleHTTPRequestHandler.copyfile copies until EOF. 
                    # We need to override or manually send.
                    return None # We handled the body
                    
            except:
                pass

        # Fallback to normal serving if no Range or error
        return super().send_head()

    # We need to override copyfile to support partial content if we want to be strict, 
    # but for a quick dev server, let's use a simpler implementation specifically for ranges.
    # Actually, a simpler way to support ranges in python http.server is tricky without external libs.
    # Let's use a simpler approach: just use `http.server` but acknowledge it doesn't support ranges by default.
    # WAIT. Python's http.server DOES NOT support ranges by default.
    # Writing a full Range support handler from scratch is error prone.
    # A better alternative for the user is to use `python -m http.server` which DOES NOT support ranges, 
    # OR use a tool that does, like `npx http-server` or `miniserve`.
    
    # Let's try to implement a basic one.
    
# RE-THINKING: Implementing a robust Range handler in a few lines is hard.
# However, the user wants to seek.
# Let's use a known snippet for RangeHTTPRequestHandler.

import urllib.parse

class RangeRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def send_head(self):
        if 'Range' not in self.headers:
            return super().send_head()
            
        path = self.translate_path(self.path)
        if os.path.isdir(path):
             return super().send_head()
             
        try:
            f = open(path, 'rb')
        except OSError:
            self.send_error(404, "File not found")
            return None

        ctype = self.guess_type(path)
        fs = os.fstat(f.fileno())
        file_len = fs[6]
        
        range_header = self.headers['Range']
        range_match = re.search(r'bytes=(\d+)-(\d*)', range_header)
        
        if range_match:
            start = int(range_match.group(1))
            end = range_match.group(2)
            if end:
                end = int(end)
            else:
                end = file_len - 1
            
            if start >= file_len:
                self.send_error(416, "Requested Range Not Satisfiable")
                self.send_header("Content-Range", f"bytes */{file_len}")
                self.end_headers()
                return None
            
            length = end - start + 1
            self.send_response(206)
            self.send_header("Content-type", ctype)
            self.send_header("Content-Range", f"bytes {start}-{end}/{file_len}")
            self.send_header("Content-Length", str(length))
            self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
            self.end_headers()
            
            f.seek(start)
            # Send only 'length' bytes
            try:
                self.wfile.write(f.read(length))
            except (ConnectionResetError, BrokenPipeError):
                pass
            f.close()
            return None
        
        return super().send_head()

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

if __name__ == "__main__":
    # Ensure site directory exists
    if not os.path.exists(DIRECTORY):
        print(f"Directory '{DIRECTORY}' not found. Run 'make build' first.")
        exit(1)
        
    print(f"Serving at http://localhost:{PORT} with Range support")
    try:
        with ReusableTCPServer(("", PORT), RangeRequestHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
    except OSError as e:
        if e.errno == 48:
            print(f"Error: Port {PORT} is already in use.")
            print("Try killing the process using it: lsof -i :{PORT} | xargs kill")
        else:
            raise
