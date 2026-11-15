#!/usr/bin/env python3
"""Refresh only the shared boundary scripts in the standalone Muse source page."""
from pathlib import Path
import re

root = Path(__file__).parent
page = root / "R4 Muse V1"
source = page.read_text()
begin, end = "<!-- shared-boundaries:start -->", "<!-- shared-boundaries:end -->"
scripts = ['<script>window.R4_VARIANT = "muse";</script>']
for name in ("i18n.js", "backup.js", "calendar.js"):
    scripts.append("<script>\n" + (root / name).read_text().replace("</script", "<\\/script") + "</script>")
block = begin + "\n" + "\n".join(scripts) + "\n" + end
assert source.count(begin) == source.count(end) == 1, "Expected one shared boundary block"
source = re.sub(re.escape(begin) + r"[\s\S]*?" + re.escape(end), lambda _: block, source)
page.write_text(source)
print("updated Muse shared backup/calendar boundaries")
