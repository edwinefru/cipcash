#!/usr/bin/env python3
import http.server
import socketserver
import os

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Serve the mobile app for the root path
        if self.path == '/' or self.path == '/index.html':
            self.path = '/mobile-app-working.html'
        return super().do_GET()

# Change to the app directory where our HTML file is
os.chdir('/app')

PORT = 3001
Handler = MyHTTPRequestHandler

with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
    print(f"Serving at port {PORT}")
    httpd.serve_forever()