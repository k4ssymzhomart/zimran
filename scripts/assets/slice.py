"""Slice a transparent sheet into its separate objects by finding columns/rows of empty alpha.
usage: python3 -I slice.py <sheet.png> <out_dir> <name1,name2,...> [--grid rows cols] [--size 512] [--pad 0.08]
Each object is trimmed to its alpha bounding box, padded to a square, and resized to --size."""
import sys
from PIL import Image

def bbox_of(img, box):
    return img.crop(box).getchannel('A').point(lambda a: 255 if a > 12 else 0).getbbox()

def runs(profile, min_gap):
    # profile: list of bools (has content). Return [start, end) runs of content separated by >= min_gap empty.
    out, start, gap = [], None, 0
    for i, v in enumerate(profile):
        if v:
            if start is None:
                start = i
            gap = 0
            end = i + 1
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                out.append((start, end)); start = None; gap = 0
    if start is not None:
        out.append((start, end))
    return out

def square(obj, size, pad, anchor='center'):
    w, h = obj.size
    side = int(max(w, h) * (1 + 2 * pad))
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    y = side - h if anchor == 'bottom' else (side - h) // 2
    canvas.paste(obj, ((side - w) // 2, y), obj)
    return canvas.resize((size, size), Image.LANCZOS)

def main():
    args = sys.argv[1:]
    src, out_dir, names = args[0], args[1], args[2].split(',')
    size = int(args[args.index('--size') + 1]) if '--size' in args else 512
    pad = float(args[args.index('--pad') + 1]) if '--pad' in args else 0.08
    anchor = args[args.index('--anchor') + 1] if '--anchor' in args else 'center'
    img = Image.open(src).convert('RGBA')
    W, H = img.size
    alpha = img.getchannel('A').point(lambda a: 255 if a > 12 else 0)
    boxes = []
    if '--grid' in args:
        i = args.index('--grid'); rows, cols = int(args[i + 1]), int(args[i + 2])
        for r in range(rows):
            for c in range(cols):
                cell = (c * W // cols, r * H // rows, (c + 1) * W // cols, (r + 1) * H // rows)
                bb = bbox_of(img, cell)
                if bb:
                    boxes.append((cell[0] + bb[0], cell[1] + bb[1], cell[0] + bb[2], cell[1] + bb[3]))
    else:
        cols = [any(alpha.getpixel((x, y)) for y in range(0, H, 2)) for x in range(W)]
        for x0, x1 in runs(cols, max(4, W // 200)):
            bb = bbox_of(img, (x0, 0, x1, H))
            if bb:
                boxes.append((x0 + bb[0], bb[1], x0 + bb[2], bb[3]))
    print(f'{src}: {W}x{H}, found {len(boxes)} objects')
    for name, box in zip(names, boxes):
        obj = img.crop(box)
        out = square(obj, size, pad, anchor)
        path = f'{out_dir}/{name}.png'
        out.save(path, optimize=True)
        print(f'  {name}: box={box} -> {path}')
    if len(boxes) != len(names):
        print(f'  WARNING: {len(boxes)} objects for {len(names)} names')

main()
