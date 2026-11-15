# Asset tools

How the PlayReps 3D assets were made: generated in ChatGPT (white background), then cut out, sliced and recoloured
here. All of it runs locally on macOS.

| Tool | What it does |
| --- | --- |
| `lift.swift` | Cuts every subject out of an image with Apple's Vision framework (macOS 14+). `swiftc -O lift.swift -o lift && ./lift in.png out.png` |
| `slice.py` | Splits a transparent sheet into one PNG per object (by empty columns, or `--grid rows cols`), squares and resizes them. `--anchor bottom` keeps a portrait standing on the bottom edge. `python3 -P slice.py sheet.png public/art a,b,c --size 512` |
| `recolor.py` | Moves every hue of a render into the PlayReps violet family, keeping light and shading. `python3 -P recolor.py in.png out.png` |

Prompt pattern that matches the existing set: "premium glossy 3D render like modern consumer app illustrations,
smooth rounded chunky forms, glossy plastic and frosted glass, soft studio lighting, pure white background.
Monochrome palette strictly violet #6C63FF, lavender #B8B5FF, deep indigo #2B2570 and white. No other colours. No text."
After replacing an image in `public/`, clear `.next/dev/cache/images` so the dev server stops serving the old one.
