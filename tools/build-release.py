#!/usr/bin/env python3
"""Telepíthető WordPress ZIP készítése a Release/ mappába.

Használat:  python3 tools/build-release.py
A ZIP egyetlen `season-decor/` mappát tartalmaz, így a WordPressben
(Bővítmények > Új hozzáadása > Bővítmény feltöltése) közvetlenül telepíthető.
A Release/ mappában mindig csak az aktuális verzió ZIP-je marad.
"""
import os
import re
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGIN = os.path.join(ROOT, 'season-decor')
OUT = os.path.join(ROOT, 'Release')

with open(os.path.join(PLUGIN, 'season-decor.php'), encoding='utf-8') as f:
    match = re.search(r'^\s*\*\s*Version:\s*([\w.\-]+)', f.read(), re.M)
if not match:
    sys.exit('A plugin verziója nem található a season-decor.php fejlécében.')
version = match.group(1)

os.makedirs(OUT, exist_ok=True)
for name in os.listdir(OUT):
    if name.startswith('season-decor-') and name.endswith('.zip'):
        os.remove(os.path.join(OUT, name))

target = os.path.join(OUT, 'season-decor-%s.zip' % version)
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as z:
    for folder, dirs, files in os.walk(PLUGIN):
        dirs[:] = sorted(d for d in dirs if not d.startswith('.'))
        for name in sorted(files):
            if name.startswith('.'):
                continue
            full = os.path.join(folder, name)
            arc = os.path.join('season-decor', os.path.relpath(full, PLUGIN))
            z.write(full, arc.replace(os.sep, '/'))

print('Elkészült:', os.path.relpath(target, ROOT))
