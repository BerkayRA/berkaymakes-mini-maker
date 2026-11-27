import re, json, os, glob, sys
# Rebuild gallery.json from the Class Heroes SVG folders:
#   python3 tools/build_gallery.py gallery.json default=PATH/svg default-wide=PATH/svg bold=PATH/svg mixed=PATH/svg
LABELS = {'default': 'Default', 'default-wide': 'Default-Wide', 'bold': 'Bold', 'mixed': 'Mixed'}
SETS = [(k, LABELS.get(k, k.title()), p) for k, p in (a.split('=', 1) for a in sys.argv[2:])]
RECT = re.compile(r'M(\d+) (\d+)h(\d+)v(\d+)h-(\d+)z')
def parse(path):
    s = open(path).read()
    m = re.search(r'viewBox="0 0 (\d+) (\d+)"', s); W, H = int(m[1]), int(m[2])
    grid = [None] * (W * H)
    for fill, d in re.findall(r'<path fill="(#[0-9a-fA-F]{6})" d="([^"]*)"', s):
        rest = RECT.sub('', d)
        if rest.strip(): raise SystemExit(f'unparsed path data in {path}: {rest[:60]}')
        for x, y, w, h, w2 in RECT.findall(d):
            x, y, w, h = int(x), int(y), int(w), int(h); assert w == int(w2)
            for yy in range(y, y + h):
                for xx in range(x, x + w): grid[yy * W + xx] = fill.upper()
    if re.search(r'<(rect|polygon|circle|g )', s): raise SystemExit('other shapes in ' + path)
    return W, H, grid
def title(stem):
    parts = stem.split('_'); g = parts[-1]; parts = parts[:-1]
    obsc = parts and parts[-1] == 'obscured'
    if obsc: parts = parts[:-1]
    cls = ' '.join(p.capitalize() for p in parts)
    return f"{cls}{' - Obscured Face' if obsc else ''} ({g})", cls, g
models = []
for key, label, d in SETS:
    fronts = sorted(f for f in glob.glob(d + '/*.svg') if not f.endswith('_back.svg'))
    for f in fronts:
        stem = os.path.basename(f)[:-4]; b = f[:-4] + '_back.svg'
        if not os.path.exists(b): raise SystemExit('no back for ' + f)
        W, H, F = parse(f); W2, H2, B = parse(b)
        if (W, H) != (W2, H2): raise SystemExit(f'size mismatch {f}')
        pal = []
        for c in F + B:
            if c and c not in pal: pal.append(c)
        if len(pal) > 10: raise SystemExit('too many colours ' + f)
        enc = lambda G: ''.join('.' if c is None else str(pal.index(c)) for c in G)
        name, cls, g = title(stem)
        models.append({'id': f'{key}/{stem}', 'n': name, 's': key, 'w': W, 'h': H, 'p': pal, 'f': enc(F), 'b': enc(B)})
    print(key, len(fronts), 'models', file=sys.stderr)
order = [k for k, _, _ in SETS]
json.dump({'v': 1, 'sets': [{'k': k, 'l': l} for k, l, _ in SETS], 'models': models},
          open(sys.argv[1], 'w'), separators=(',', ':'))
