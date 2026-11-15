# Phones in the deck

Every phone in the deck is a rendered burgundy iPhone with a real screenshot from `../shots/` on its screen.

- `hero.jpg` (slide 1, 3840×2160): two phones on green, the first-answer screen on the front one.
- `1-answer.png`, `2-round.png`, `3-before-after.png` (slide 4), `live.png` (slide 7), `landing.png` (slide 10):
  one front-facing phone each, with a transparent background.

## How they are made

`src/` holds the two renders, generated with ChatGPT. Each phone's screen is a flat magenta (#FF00FF), so a
script can find it. `src/phone-matte.png` is Vision's cut-out of the single phone (`scripts/assets/lift_each.swift`).

`scripts/assets/phone_screen.py` finds the magenta screen, fits its four edges as straight lines (so angled phones
work), draws an iOS screen from the screenshot (status bar, Dynamic Island, home indicator), warps it on, keeps the
render's glass reflections and turns the leftover magenta at the rim into bezel black.

After a screenshot in `../shots/` changes, rebuild from the repository root:

```sh
# slide 4, 7 and 10 phones (name:width in pixels)
python3 scripts/assets/deck_phones.py docs/deck/phones/src/phone-render.png docs/deck/phones/src/phone-matte.png \
  docs/deck/shots docs/deck/phones 1-answer:640 2-round:640 3-before-after:640 live:560 landing:880

# slide 1: composite at 2.3x, then crop to 16:9 with green carried to the left
python3 scripts/assets/phone_screen.py docs/deck/phones/src/hero-render.png docs/deck/shots/1-answer.png /tmp/hero-comp.png --upscale 2.3
python3 scripts/assets/deck_hero.py /tmp/hero-comp.png docs/deck/phones/hero.jpg 2.3 -137 40
```

Then `docs/deck/build.sh`. Add `--debug` to `phone_screen.py` to see the screen it found.
