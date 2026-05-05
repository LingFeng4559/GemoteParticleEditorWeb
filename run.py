import http.server
import socketserver
import webbrowser
import threading
import os

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def open_browser():
    webbrowser.open(f"http://localhost:{PORT}")

if __name__ == "__main__":
    # 使用 Threading 在啟動伺服器前先延遲開啟瀏覽器
    threading.Timer(1.0, open_browser).start()
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"伺服器已啟動：http://localhost:{PORT}")
        print("按下 Ctrl+C 可停止伺服器")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n伺服器已停止")
            httpd.shutdown()
