#!/usr/bin/env python3
"""Wrap app.html (the page body, as published to a Claude artifact) into a standalone index.html."""
from pathlib import Path

here = Path(__file__).parent
reset = ("html{color-scheme:light}"
         ":root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}"
         "body{margin:0;font:14px system-ui;background:#fafafa}img{max-width:100%}[hidden]{display:none!important}")
head = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        f"<style>{reset}</style></head><body>")
(here / "index.html").write_text(head + (here / "app.html").read_text() + "</body></html>\n")
print("wrote", here / "index.html")
