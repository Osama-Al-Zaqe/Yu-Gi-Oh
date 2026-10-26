"""
YuGi Local Web Server
Lightweight HTTP Server for YuGi Ultimate Encyclopedia.
Serves BMP images, JSON datasets, CSS, and JS with correct MIME types and CORS headers.
Automatically opens the browser upon start.
"""

import sys
import os
import mimetypes
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler
import socket

# Ensure UTF-8 output
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Ensure correct base directory
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
os.chdir(BASE_DIR)

# Register correct MIME types
mimetypes.add_type('image/bmp', '.bmp')
mimetypes.add_type('application/json', '.json')
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('text/html', '.html')

class YuGiHTTPRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        # Allow cross-origin and disable caching
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, must-revalidate')
        super().end_headers()

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
            pass

    def log_message(self, format, *args):
        # Suppress noisy standard request logs
        pass

def find_available_port(start_port=8080, max_attempts=50):
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', port)) != 0:
                return port
    return start_port

def run_server():
    port = find_available_port(8080)
    server_address = ('127.0.0.1', port)
    
    try:
        httpd = HTTPServer(server_address, YuGiHTTPRequestHandler)
    except Exception as e:
        print(f"Error starting server on port {port}: {e}")
        return

    url = f"http://127.0.0.1:{port}/index.html"
    print("=" * 60)
    print("  ★ موسوعة YuGi — Yu-Gi-Oh! Ultimate Encyclopedia ★")
    print("=" * 60)
    print(f"  تم تشغيل الخادم المحلي بنجاح على العنوان:")
    print(f"  --> {url}")
    print("-" * 60)
    print("  • جميع الصور الأصلية (1,115 ملف) جاهزة ومفهرسة محلياً.")
    print("  • قاعدة البيانات وقوائم المجموعات تعمل بدون اتصال بالإنترنت.")
    print("  • لإيقاف الخادم في أي وقت: اضغط Ctrl + C في هذه النافذة.")
    print("=" * 60)

    # Open browser
    try:
        webbrowser.open(url)
    except Exception:
        pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nتم إيقاف خادم YuGi بنجاح. وداعاً!")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
