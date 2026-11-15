"""Single front-facing phones for slides 4, 7 and 10: render D (one burgundy phone on white, magenta screen),
each app screenshot composited in, cut out with Vision's matte.
  python3 phones_d.py <render.png> <matte.png> <shots-dir> <out-dir> name:width ...
"""
import subprocess, sys, tempfile
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
UP = 2
render, matte, shots, out = sys.argv[1:5]
src = Image.open(render).convert('RGB')
size = (src.width * UP, src.height * UP)
alpha = Image.open(matte).getchannel('A').resize(size, Image.LANCZOS)
box = alpha.point(lambda v: 255 if v > 8 else 0).getbbox()
for job in sys.argv[5:]:
    name, width = job.split(':')
    comp = Path(tempfile.gettempdir()) / f'fammy-phone-{name}.png'
    comp.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([sys.executable, str(HERE / 'phone_screen.py'), render, str(Path(shots) / f'{name}.png'), str(comp),
                    '--upscale', str(UP)], check=True, stdout=subprocess.DEVNULL)
    import numpy as np
    rgb = np.asarray(Image.open(comp).convert('RGB')).astype(np.float32)
    a = np.asarray(alpha).astype(np.float32)[..., None] / 255
    # edge pixels are part white studio backdrop: take the white back out so no light rim shows on colour
    fg = np.where(a > 0.02, (rgb - (1 - a) * 255) / np.maximum(a, 0.02), rgb)
    rgba = Image.fromarray(np.dstack([np.clip(fg, 0, 255), a[..., 0] * 255]).astype(np.uint8), 'RGBA')
    phone = rgba.crop(box)
    w = int(width)
    phone = phone.resize((w, round(phone.height * w / phone.width)), Image.LANCZOS)
    phone.save(Path(out) / f'{name}.png', optimize=True)
    print(name, phone.size)
