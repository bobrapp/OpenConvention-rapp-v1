#!/usr/bin/env python3
"""Wrap app.html (the page body, as published to a Claude artifact) into a standalone index.html."""
from pathlib import Path
import hashlib

here = Path(__file__).parent
reset = ("html{color-scheme:light}"
         ":root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}"
         "body{margin:0;font:14px system-ui;background:#fafafa}img{max-width:100%}[hidden]{display:none!important}")
head = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        f"<style>{reset}</style></head><body>")
qr = (here / "vendor/qrcode.js").read_bytes()
assert hashlib.sha256(qr).hexdigest() == "18ae399f81182bc9de916e9c77b195df20cc58d6f2d55a62b085a299f1bf1780", "Review and update the vendored QR pin before rebuilding"
license = (here / "vendor/LICENSE").read_text()
source = (here / "app.html").read_text()
tag = '<script src="vendor/qrcode.js"></script>'
assert source.count(tag) == 1, "Expected one local QR asset"
source = source.replace(tag, '<script>/*\n' + license + '\n*/\n' + qr.decode().replace('</script', '<\\/script') + '</script>')
(here / "index.html").write_text(head + source + "</body></html>\n")
print("wrote", here / "index.html")
