#!/usr/bin/env python3
"""
Put a real app screenshot onto the screen of a generated phone render.

Generate the render with the phone's screen showing one flat key colour (magenta #FF00FF by default). This script
finds that screen, fits its four edges as straight lines (so a phone seen in perspective works), builds an iOS screen
from the screenshot (status bar, Dynamic Island, home indicator), warps it onto the phone, keeps the reflections the
render painted on the glass, and turns whatever key colour is left at the rim into bezel black.

  python3 phone_screen.py render.png shot.png out.png [--key ff00ff] [--upscale 2] [--debug]
  python3 phone_screen.py render.png shot.png out.png --corners 812,240,1190,262,1160,1010,790,990

--corners gives the screen's corners clockwise from the top-left, in render pixels, and skips the detection.
Needs numpy and Pillow.
"""
import argparse
import math
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

_RS = getattr(Image, 'Resampling', Image)
_TR = getattr(Image, 'Transform', Image)
LANCZOS, BICUBIC, PERSPECTIVE = _RS.LANCZOS, _RS.BICUBIC, _TR.PERSPECTIVE

PT = 3  # the screen is drawn at @3x
SCREEN_W = 440  # iPhone Pro Max screen width in points
STATUS_H = 59  # status bar height in points


def hex_rgb(s):
    s = s.lstrip('#')
    return np.array([int(s[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255


def luminance(c):
    return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255


def keyness(rgb, key):
    """1 for the key colour at any brightness; near 0, or below, for everything else."""
    on = key >= 0.5
    mx = rgb.max(axis=2) + 1e-6
    k = (rgb[..., on].min(axis=2) - rgb[..., ~on].max(axis=2)) / mx
    k[mx < 0.12] = 0
    return k


# ── finding the screen ────────────────────────────────────────────────────────────────────────────────────────────

def label(mask):
    """4-connected regions: (labels, sizes), labels 1..n, sizes[i] for label i + 1."""
    try:
        from scipy import ndimage
        lab, n = ndimage.label(mask)
        return lab, np.bincount(lab.ravel(), minlength=n + 1)[1:]
    except ImportError:
        pass
    runs, parent = [], []

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    prev = []
    for y in range(mask.shape[0]):
        if not mask[y].any():
            prev = []
            continue
        d = np.diff(np.concatenate(([0], mask[y].astype(np.int8), [0])))
        cur = []
        for s, e in zip(np.flatnonzero(d == 1), np.flatnonzero(d == -1)):
            i = len(runs)
            runs.append((y, s, e))
            parent.append(i)
            for j in prev:
                if runs[j][1] < e and s < runs[j][2]:
                    a, b = find(i), find(j)
                    if a != b:
                        parent[a] = b
            cur.append(i)
        prev = cur
    lab = np.zeros(mask.shape, np.int32)
    ids = {}
    for i, (y, s, e) in enumerate(runs):
        lab[y, s:e] = ids.setdefault(find(i), len(ids) + 1)
    return lab, np.bincount(lab.ravel(), minlength=len(ids) + 1)[1:]


def find_screen(rgb, key):
    """The pixels of the key-coloured screen, including pieces a reflection split off."""
    lab, sizes = label(keyness(rgb, key) > 0.3)
    if not len(sizes) or sizes.max() < 0.002 * lab.size:
        sys.exit('no screen in the key colour found; check the render or pass --corners')
    big = int(np.argmax(sizes)) + 1
    xs = np.flatnonzero((lab == big).any(axis=0))
    x0, x1 = xs[0], xs[-1]
    keep = [big]
    for i in np.flatnonzero(sizes >= 0.05 * sizes.max()) + 1:
        if i != big:
            cx = np.flatnonzero((lab == i).any(axis=0))
            if min(x1, cx[-1]) - max(x0, cx[0]) > 0.5 * (cx[-1] - cx[0]):
                keep.append(int(i))
    return np.isin(lab, keep)


def hull(points):
    """Convex hull, monotone chain."""
    pts = sorted(set(points))
    if len(pts) < 3:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def polygon_mask(size, poly):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).polygon([(float(x), float(y)) for x, y in poly], fill=255)
    return np.asarray(m) > 127


def hull_mask(mask):
    """The screen with its holes (the island, reflections) and dents filled: its convex hull."""
    pts = []
    for y in np.flatnonzero(mask.any(axis=1)):
        xs = np.flatnonzero(mask[y])
        a, b = int(xs[0]), int(xs[-1]) + 1
        pts += [(a, int(y)), (b, int(y)), (a, int(y) + 1), (b, int(y) + 1)]
    return polygon_mask((mask.shape[1], mask.shape[0]), hull(pts))


def fit_line(t, s):
    """s = a * t + b, refitted without outliers."""
    t, s = np.asarray(t, float), np.asarray(s, float)
    keep = np.ones(len(t), bool)
    for _ in range(5):
        a, b = np.polyfit(t[keep], s[keep], 1)
        r = np.abs(s - (a * t + b))
        new = r <= max(1.5, 3 * float(np.median(r[keep])))
        if new.sum() < 8 or (new == keep).all():
            break
        keep = new
    return a, b


def fit_quad(mask):
    """Screen corners, clockwise from the top-left: where the four fitted edges meet, past the rounded corners."""
    ys, xs = np.flatnonzero(mask.any(axis=1)), np.flatnonzero(mask.any(axis=0))
    y0, y1, x0, x1 = ys[0], ys[-1], xs[0], xs[-1]
    h, w = y1 - y0, x1 - x0
    left, right, top, bottom = [], [], [], []
    for y in range(int(y0 + 0.2 * h), int(y1 - 0.2 * h)):
        r = np.flatnonzero(mask[y])
        if r.size:
            left.append((y, r[0]))
            right.append((y, r[-1] + 1))
    for x in range(int(x0 + 0.18 * w), int(x1 - 0.18 * w)):
        c = np.flatnonzero(mask[:, x])
        if c.size:
            if not 0.36 < (x - x0) / w < 0.64:  # the island hangs under the middle of the top edge
                top.append((x, c[0]))
            bottom.append((x, c[-1] + 1))
    aL, bL = fit_line(*zip(*left))  # x = a * y + b
    aR, bR = fit_line(*zip(*right))
    cT, dT = fit_line(*zip(*top))  # y = c * x + d
    cB, dB = fit_line(*zip(*bottom))

    def meet(a, b, c, d):
        x = (a * d + b) / (1 - a * c)
        return (x, c * x + d)

    return [meet(aL, bL, cT, dT), meet(aR, bR, cT, dT), meet(aR, bR, cB, dB), meet(aL, bL, cB, dB)]


def measure_radius(filled, quad, px_per_pt):
    """Screen corner radius in points, from the area the rounded corners leave out of the sharp quad."""
    missing = polygon_mask((filled.shape[1], filled.shape[0]), quad) & ~filled
    box = max(4, int(0.18 * SCREEN_W * px_per_pt))
    rs = []
    for x, y in quad:
        x, y = int(round(x)), int(round(y))
        cut = missing[max(0, y - box):y + box, max(0, x - box):x + box]
        rs.append(math.sqrt(cut.sum() / (1 - math.pi / 4)))
    return min(75.0, max(30.0, float(np.median(rs)) / px_per_pt))


# ── building the screen ───────────────────────────────────────────────────────────────────────────────────────────

def fit_rows(img, target):
    """Make the screenshot exactly `target` rows tall by taking rows out of (or repeating rows in) its longest band of
    plain rows, so the layout is kept instead of being squashed or cut off."""
    rows = np.asarray(img.convert('RGB'))
    diff = rows.shape[0] - target
    if diff == 0:
        return img
    a = rows.astype(np.int16)
    plain = (a.max(axis=1) - a.min(axis=1)).max(axis=1) <= 6
    plain[1:] &= np.abs(a[1:].mean(axis=1) - a[:-1].mean(axis=1)).max(axis=1) <= 1.5
    best, start, run = 0, 0, 0
    for y, ok in enumerate(plain):
        run = run + 1 if ok else 0
        if run > best:
            best, start = run, y - run + 1
    if best < abs(diff) + 40:
        print('warning: no plain band tall enough; the bottom is cut or extended', file=sys.stderr)
        if diff > 0:
            return Image.fromarray(rows[:target])
        return Image.fromarray(np.concatenate([rows, np.repeat(rows[-1:], -diff, axis=0)]))
    mid = start + best // 2
    if diff > 0:
        cut = mid - diff // 2
        return Image.fromarray(np.concatenate([rows[:cut], rows[cut + diff:]]))
    return Image.fromarray(np.concatenate([rows[:mid], np.repeat(rows[mid:mid + 1], -diff, axis=0), rows[mid:]]))


def ui_font(size):
    try:
        f = ImageFont.truetype('/System/Library/Fonts/SFNS.ttf', size)
        try:
            names = f.get_variation_names()
            f.set_variation_by_name(next(n for n in names if (n.decode() if isinstance(n, bytes) else n).lower() == 'semibold'))
        except Exception:
            pass
        return f
    except OSError:
        pass
    for path in ('/System/Library/Fonts/HelveticaNeue.ttc', '/System/Library/Fonts/Helvetica.ttc'):
        try:
            return ImageFont.truetype(path, size, index=1)
        except OSError:
            continue
    return ImageFont.load_default()


def chrome(W, H, fg, home, ss=2):
    """Status bar, Dynamic Island and home indicator on a transparent layer, drawn large for smooth edges."""
    u = PT * ss  # layer pixels per point
    layer = Image.new('RGBA', (W * ss, H * ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx = W * ss / 2
    iw, ih, it = 126 * u, 37 * u, 11 * u
    d.rounded_rectangle([cx - iw / 2, it, cx + iw / 2, it + ih], radius=ih / 2, fill=(0, 0, 0, 255))
    mid = it + ih / 2
    ear = (SCREEN_W / 2 - 63) / 2  # middle of the space beside the island, points from the edge
    d.text((ear * u, mid), '9:41', font=ui_font(round(17 * u)), fill=fg, anchor='mm')
    base = mid + 5.5 * u
    gx = (SCREEN_W - ear - 36) * u  # left of the 72-point group: signal, wi-fi, battery
    for i, h in enumerate((4.5, 6.5, 8.75, 11)):
        x = gx + i * 4.7 * u
        d.rounded_rectangle([x, base - h * u, x + 3 * u, base], radius=0.9 * u, fill=fg)
    wx, wy = gx + 30.9 * u, base
    for r, pie in ((11, False), (7.3, False), (3.6, True)):
        box = [wx - r * u, wy - r * u, wx + r * u, wy + r * u]
        if pie:
            d.pieslice(box, 225, 315, fill=fg)
        else:
            d.arc(box, 225, 315, fill=fg, width=round(2.3 * u))
    dim = fg[:3] + (100,)
    bx = gx + 45 * u
    d.rounded_rectangle([bx, mid - 6 * u, bx + 24.5 * u, mid + 6 * u], radius=3.8 * u, outline=dim, width=round(1.1 * u))
    d.rounded_rectangle([bx + 2.1 * u, mid - 3.9 * u, bx + 22.4 * u, mid + 3.9 * u], radius=2.2 * u, fill=fg)
    d.rounded_rectangle([bx + 25.7 * u, mid - 2.2 * u, bx + 27.1 * u, mid + 2.2 * u], radius=0.7 * u, fill=dim)
    hw, hh = 144 * u, 5 * u
    hy = H * ss - 8 * u - hh
    d.rounded_rectangle([cx - hw / 2, hy, cx + hw / 2, hy + hh], radius=hh / 2, fill=home)
    return layer.convert('RGBa').resize((W, H), LANCZOS).convert('RGBA')


def build_screen(shot, aspect, radius):
    """The full phone screen at @3x: status bar over the app's top colour, the screenshot, island, home indicator."""
    W = SCREEN_W * PT
    H = round(W / aspect)
    rgb = shot.convert('RGB')
    px = np.asarray(rgb)
    top = tuple(int(v) for v in np.median(px[:4].reshape(-1, 3), axis=0))
    bottom = tuple(int(v) for v in np.median(px[-4:].reshape(-1, 3), axis=0))
    body = rgb.resize((W, round(rgb.height * W / rgb.width)), LANCZOS)
    bar = STATUS_H * PT
    body = fit_rows(body, H - bar)
    screen = Image.new('RGB', (W, H), top)
    screen.paste(body, (0, bar))
    fg = (255, 255, 255, 255) if luminance(top) < 0.6 else (0, 0, 0, 255)
    home = (0, 0, 0, 230) if luminance(bottom) > 0.5 else (255, 255, 255, 230)
    screen = Image.alpha_composite(screen.convert('RGBA'), chrome(W, H, fg, home)).convert('RGB')
    m = Image.new('L', (W * 2, H * 2), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, W * 2 - 1, H * 2 - 1], radius=radius * PT * 2, fill=255)
    return screen, m.resize((W, H), LANCZOS)


# ── putting it on the phone ───────────────────────────────────────────────────────────────────────────────────────

def persp_coeffs(dst, src):
    """PIL perspective coefficients that send output points dst to input points src."""
    A, b = [], []
    for (x, y), (u, v) in zip(dst, src):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        b.append(u)
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y])
        b.append(v)
    return np.linalg.solve(np.array(A, float), np.array(b, float)).tolist()


def warp(img, quad, size, ss=2):
    """img's whole rectangle onto quad, in an image of `size`; shrunk first and supersampled, so text stays clean."""
    W, H = size
    tall = max(math.dist(quad[0], quad[3]), math.dist(quad[1], quad[2]))
    k = min(1.0, tall * ss * 1.1 / img.height)
    if k < 1:
        img = img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), LANCZOS)
    w, h = img.size
    c = persp_coeffs([(x * ss, y * ss) for x, y in quad], [(0, 0), (w, 0), (w, h), (0, h)])
    return img.transform((W * ss, H * ss), PERSPECTIVE, c, BICUBIC).resize((W, H), LANCZOS)


def dilate(mask, r):
    im = Image.fromarray(mask.astype(np.uint8) * 255)
    for _ in range(int(r)):
        im = im.filter(ImageFilter.MaxFilter(3))
    return np.asarray(im) > 127


def save_debug(render, filled, quad, path):
    dbg = render.convert('RGBA')
    tint = Image.new('RGBA', render.size, (0, 255, 255, 0))
    tint.putalpha(Image.fromarray((filled * 90).astype(np.uint8)))
    dbg = Image.alpha_composite(dbg, tint)
    d = ImageDraw.Draw(dbg)
    d.line([tuple(p) for p in quad] + [tuple(quad[0])], fill=(255, 0, 0, 255), width=2)
    for x, y in quad:
        d.ellipse([x - 6, y - 6, x + 6, y + 6], outline=(255, 0, 0, 255), width=2)
    dbg.convert('RGB').save(path)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('render')
    p.add_argument('shot')
    p.add_argument('out')
    p.add_argument('--key', default='ff00ff', help='the flat colour the render shows on the screen')
    p.add_argument('--corners', help='eight numbers: x,y of the screen corners clockwise from the top-left')
    p.add_argument('--upscale', type=float, default=1, help='enlarge the render first, so the screen text stays sharp')
    p.add_argument('--radius', type=float, help='screen corner radius in points (default: measured)')
    p.add_argument('--aspect', type=float, help='screen width / height (default: measured, kept within 0.42-0.5)')
    p.add_argument('--glare', type=float, default=0.6, help="share of the render's glass reflections to keep, 0 to 1")
    p.add_argument('--debug', action='store_true', help='also write <out>-debug.png showing the screen it found')
    args = p.parse_args()

    key = hex_rgb(args.key)
    if (key >= 0.5).all() or not (key >= 0.5).any():
        sys.exit('the key colour needs strong and weak channels, such as ff00ff or 0000ff')
    render = Image.open(args.render).convert('RGB')
    if args.upscale != 1:
        render = render.resize((round(render.width * args.upscale), round(render.height * args.upscale)), LANCZOS)
    base = np.asarray(render).astype(np.float32) / 255

    if args.corners:
        v = [float(t) * args.upscale for t in args.corners.split(',')]
        if len(v) != 8:
            sys.exit('--corners takes eight numbers')
        quad = list(zip(v[0::2], v[1::2]))
        filled = polygon_mask(render.size, quad)
    else:
        filled = hull_mask(find_screen(base, key))
        quad = fit_quad(filled)

    wide = (math.dist(quad[0], quad[1]) + math.dist(quad[3], quad[2])) / 2
    tall = (math.dist(quad[0], quad[3]) + math.dist(quad[1], quad[2])) / 2
    aspect = args.aspect or min(0.5, max(0.42, wide / tall))
    px_per_pt = wide / SCREEN_W
    radius = args.radius or measure_radius(filled, quad, px_per_pt)

    screen, alpha = build_screen(Image.open(args.shot), aspect, radius)
    content = np.asarray(warp(screen, quad, render.size)).astype(np.float32) / 255
    a = np.asarray(warp(alpha, quad, render.size)).astype(np.float32) / 255

    off = key < 0.5
    on = ~off
    # key colour left around the new screen becomes bezel black
    near = dilate(filled | polygon_mask(render.size, quad), max(3, round(4 * px_per_pt)))
    spill = near & (keyness(base, key) > 0.05) & (a < 0.98)
    if spill.any():
        fixed = base.copy()
        fixed[..., on] = np.minimum(base[..., on], base[..., off].max(axis=2, keepdims=True))
        base = np.where(spill[..., None], fixed, base)
    # light the render put on the glass shows up in the channels the key colour lacks
    glare = np.zeros_like(a)
    inside = a > 0.5
    if args.glare > 0 and inside.any():
        glow = base[..., off].min(axis=2)
        floor = float(np.percentile(glow[inside], 25))
        glare = np.clip((glow - floor) / max(1e-3, 1 - floor), 0, 1) * args.glare
        glare = np.asarray(Image.fromarray((glare * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)))
        glare = glare.astype(np.float32) / 255
    out = base * (1 - a[..., None]) + content * a[..., None]
    g = (glare * a)[..., None]
    out = out + (1 - out) * g

    img = Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8))
    if args.out.lower().endswith(('.jpg', '.jpeg')):
        img.save(args.out, quality=92, subsampling=0)
    else:
        img.save(args.out)
    print('screen corners', [(round(x), round(y)) for x, y in quad], f'aspect {aspect:.3f}', f'radius {radius:.0f} pt')
    if args.debug:
        save_debug(render, filled, quad, args.out.rsplit('.', 1)[0] + '-debug.png')


if __name__ == '__main__':
    main()
