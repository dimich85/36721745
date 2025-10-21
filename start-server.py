#!/usr/bin/env python3
"""
Simple HTTP Server для запуска Stage 8/9 демонстраций

Использование:
    python start-server.py

Затем откройте в браузере:
    http://localhost:8000/stage8-vfs-demo.html
    http://localhost:8000/stage9-ml-demo.html
"""

import http.server
import socketserver
import os
import sys

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers for Web Workers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

def main():
    # Change to the directory where this script is located
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    Handler = MyHTTPRequestHandler

    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            print("=" * 70)
            print("🚀 Stage 8/9 Demo Server запущен!")
            print("=" * 70)
            print()
            print(f"📍 Сервер работает на http://localhost:{PORT}")
            print()
            print("Откройте в браузере:")
            print(f"  • Stage 8 Demo: http://localhost:{PORT}/stage8-vfs-demo.html")
            print(f"  • Stage 9 Demo: http://localhost:{PORT}/stage9-ml-demo.html")
            print()
            print("Нажмите Ctrl+C для остановки сервера")
            print("=" * 70)
            print()

            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n👋 Сервер остановлен")
        sys.exit(0)
    except OSError as e:
        if e.errno == 98 or e.errno == 48:  # Address already in use
            print(f"\n❌ ОШИБКА: Порт {PORT} уже используется!")
            print(f"\nПопробуйте:")
            print(f"  1. Остановить другой процесс на порту {PORT}")
            print(f"  2. Изменить PORT в скрипте на другой (например, 8080)")
            sys.exit(1)
        else:
            raise

if __name__ == "__main__":
    main()
