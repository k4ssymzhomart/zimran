"""Pull every hue in a transparent 3D render into one violet family, keeping light and shading.
usage: python3 -P recolor.py <in.png> <out.png>"""
import sys
import numpy as np
from PIL import Image

VIOLET = 246.0  # hue of #6C63FF in degrees

def main(src, dst):
    im = Image.open(src).convert('RGBA')
    a = np.asarray(im).astype(np.float32) / 255.0
    rgb, alpha = a[..., :3], a[..., 3:]
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = mx - mn
    v = mx
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.zeros_like(mx)
    m = d > 1e-6
    rc = np.where(m, (mx - r) / np.maximum(d, 1e-6), 0)
    gc = np.where(m, (mx - g) / np.maximum(d, 1e-6), 0)
    bc = np.where(m, (mx - b) / np.maximum(d, 1e-6), 0)
    h = np.where(r == mx, bc - gc, np.where(g == mx, 2.0 + rc - bc, 4.0 + gc - rc))
    h = (h / 6.0) % 1.0 * 360.0
    # Hues far from violet move into it; already-violet hues are only nudged. Greens become lighter lavender.
    dist = ((h - VIOLET + 180) % 360) - 180
    far = np.abs(dist) > 18
    green = (h > 90) & (h < 190)
    new_h = np.where(far, VIOLET + np.clip(dist, -60, 60) * 0.06, h)
    new_s = np.where(far & green, s * 0.55, np.where(far, s * 0.9, s))
    new_v = np.where(far & green, np.minimum(1.0, v * 1.06), v)
    # back to RGB
    hh = (new_h % 360) / 60.0
    i = np.floor(hh).astype(int) % 6
    f = hh - np.floor(hh)
    p = new_v * (1 - new_s)
    q = new_v * (1 - new_s * f)
    t = new_v * (1 - new_s * (1 - f))
    out = np.zeros_like(rgb)
    for k, (R, G, B) in enumerate([(new_v, t, p), (q, new_v, p), (p, new_v, t), (p, q, new_v), (t, p, new_v), (new_v, p, q)]):
        sel = i == k
        out[..., 0] = np.where(sel, R, out[..., 0])
        out[..., 1] = np.where(sel, G, out[..., 1])
        out[..., 2] = np.where(sel, B, out[..., 2])
    # leave greys alone (very low saturation): highlights and white plastic stay white
    keep = s < 0.08
    out = np.where(keep[..., None], rgb, out)
    res = np.concatenate([out, alpha], -1)
    Image.fromarray((np.clip(res, 0, 1) * 255).astype(np.uint8), 'RGBA').save(dst, optimize=True)

main(sys.argv[1], sys.argv[2])
