#!/bin/sh
# Builds Fammy-deck.pdf from deck.html (ten slides, 1920x1080). Needs Google Chrome.
# Before the final build: put real screenshots in shots/ and fill in deck.config.js. See README.md.
set -e
cd "$(dirname "$0")"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=6000 \
  --print-to-pdf="$PWD/Fammy-deck.pdf" "file://$PWD/deck.html" 2>/dev/null
ls -lh Fammy-deck.pdf
for f in 1-answer 2-round 3-before-after today; do
  [ -f "shots/$f.png" ] || echo "NOTE: shots/$f.png is missing, the slide shows the Figma render marked \"Design render\"."
done
grep -q "url: ''" deck.config.js && echo "NOTE: the live link is empty in deck.config.js." || true
