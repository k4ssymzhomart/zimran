# The pitch deck

Ten slides, English, PDF, as the case rules ask (FAQ 53, 75, 76, 81). The source is `deck.html`; the file to submit
is `Fammy-deck.pdf`.

```bash
./docs/deck/build.sh
```

## Before the final build

1. **The live link.** Put it in `deck.config.js` (`url`). Until then slides 1 and 10 show a dashed placeholder.
2. **Real screenshots.** Slides 4 and 7 show product screens. Right now they are renders of the Figma design and
   each carries a "Design render" mark. Take real screenshots of the deployed product at 390×844 and save them here:

   | File | Screen |
   |---|---|
   | `shots/1-answer.png` | Mia says "I made a tower!", the answer field is under her |
   | `shots/2-round.png` | A round in progress, with the rings and a typed sentence |
   | `shots/3-before-after.png` | The before and after of one real run |
   | `shots/today.png` | Today, after at least one real session |

   A file in `shots/` replaces the render and removes the mark. Do not submit a deck that still shows a mark: the
   jury must see the product that is behind the link.
3. **The numbers that can change** are in `deck.config.js`: the test count (`npm test`), whether the test checkout
   passed on production, whether the AI summary is live (it changes the wording of slide 5), and real parents, if
   any tried it.
4. Check slide 7 against the product: every stage marked "Built" must be reachable on the live link.

## What each slide answers

| # | Headline | Criterion |
|---|---|---|
| 1 | Practice tonight. Use it tomorrow. | First impression, track |
| 2 | She has saved every script. She still says "Stop it." | Problem and user, 15% |
| 3 | Parents already pay for advice. Practice with a score is still stuck in clinics. | Why now |
| 4 | Before, a 30-second lesson, after on a new scene. | Product and engineering, 40% |
| 5 | No language model. Rules you can argue with. | Product and engineering, 40% |
| 6 | Everyone tells parents what to say. We let them practice it, with a score. | Originality, 10% |
| 7 | You pay for five coached minutes a day. You renew until you hit the numbers with your own child. | Value and retention, 20% |
| 8 | The ad lands on the product. Break-even is 1.35% click-to-pay. | Business potential, 15% |
| 9 | Beachhead: 1.3M US homes with daily tantrums. $100M takes three steps. | Business potential, 15% |
| 10 | Open it. No sign-up. Three minutes. | Product and engineering, 40% |

Every figure and its source come from `Fammy business strategy.md`. Every slide is written to be understood
without a speaker, because the top ten are chosen from the deck, the link and the repository alone (FAQ 77).
