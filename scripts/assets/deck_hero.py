"""Slide 1 hero, 3840x2160: the composited render, a slightly tight crop, green carried on to the left for the
headline, and the magenta glow the key colour left on the frame and the floor turned into the screen's violet."""
import sys
import numpy as np
from PIL import Image

comp_path, out_path, k, x0, y0 = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])
comp = Image.open(comp_path).convert('RGB')
hsv = np.asarray(comp.convert('HSV')).astype(np.float32)
h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
xs = np.arange(comp.width)[None, :]
d = np.abs(h - 216)  # magenta is about 216 on PIL's 0-255 hue wheel
w = np.clip((18 - d) / 8, 0, 1) * (s > 50) * (xs > 0.6 * comp.width)
hsv[..., 0] = h + w * (172 - h)  # 172 is the violet of the screen, #5B52FF
comp = Image.fromarray(hsv.astype(np.uint8), 'HSV').convert('RGB')
print('recoloured pixels', int((w > 0.5).sum()))

W, H = 3840, 2160
ox, oy = round(-x0 * k), round(-y0 * k)
a = np.zeros((H, W, 3), np.uint8)
src = np.asarray(comp)
# paste with clipping
sx0, sy0 = max(0, -ox), max(0, -oy)
dx0, dy0 = max(0, ox), max(0, oy)
wcopy = min(W - dx0, src.shape[1] - sx0)
hcopy = min(H - dy0, src.shape[0] - sy0)
a[dy0:dy0 + hcopy, dx0:dx0 + wcopy] = src[sy0:sy0 + hcopy, sx0:sx0 + wcopy]
if dx0 > 0:
    a[:, :dx0] = a[:, dx0:dx0 + 1]  # carry the backdrop's first column across the added strip
if dy0 + hcopy < H:
    a[dy0 + hcopy:] = a[dy0 + hcopy - 1:dy0 + hcopy]
hero = Image.fromarray(a)
hero.save(out_path, quality=90, subsampling=0)
hero.resize((1920, 1080), Image.LANCZOS).save(out_path.replace('.jpg', '-preview.jpg'), quality=86)
print(hero.size)
