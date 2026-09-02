import sys
from http.server import test, SimpleHTTPRequestHandler

class Handler(SimpleHTTPRequestHandler):
    extensions_map = SimpleHTTPRequestHandler.extensions_map.copy()
    extensions_map[".wgsl"] = "text/plain"
    # Always show the folder's file listing instead of auto-loading index.html
    index_pages = ()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
test(HandlerClass=Handler, port=port)