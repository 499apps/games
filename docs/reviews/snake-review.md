# Snake review (`/games/snake/`)

| Field | Value |
| --- | --- |
| Scope | BUILD WALKTHROUGH (solo, automated) |
| Date | 2026-10-30 |
| Reviewed | Assembled `site/games/snake/`. Live loop on a real GPU (Intel UHD, ANGLE D3D11), Chromium. Phone 390x844 at DPR 3 with touch. Desktop 1440x900. A greedy bot played one round in Normal mode and ate 4 foods (score 100). Source in `game-snake/`. |
| Evidence | `shots/snake/phone-1-ready.png`, `phone-2-early.png`, `phone-3-midgame.png`, `desktop-1-ready.png`, `desktop-2-early.png`, `desktop-3-midgame.png`, `shots/timing-*.json`, CI result from the operator |
| Method | I looked at each screenshot and read the code. I did not run the build. I did not watch a child play. |

## Verdict

**FIX-THEN-SHIP. Overall 3.64 / 5.**

The rules are fair and kind. The controls are good. The snake has real character: eyes that follow the food, a blink, a gulp, and it falls asleep instead of dying. Fix three things before ship:

1. The meal flash covers the whole board in mint glow. The snake and the next food disappear at the moment the child must find them.
2. On phones the snake is pale mint on a pink-lavender board. The contrast is low.
3. On phones the board uses only 72% of the screen width.

## Top findings

| ID | Sev | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| S1 | P1 | After each meal the grid flashes so bright that the whole board turns mint. The snake and the food are hard to see for about half a second. | `phone-2-early.png`, `desktop-2-early.png`. Grid colour is mint x (0.6 + 1.6 x glow) (`game-snake/src/game/board.ts:142`). At rest that is x2.2, which is above the bloom threshold 1.05 (`game-snake/src/main.ts:186`). On a meal glow rises to 1.7 (x3.3) and bloom strength rises 45% (`game-snake/src/scene.ts:492-496`). | In `board.ts:142` use `0.35 + 0.55 * glow` so the rest value stays below 1. Flash only the rim and a small ring around the eaten cell. In `scene.ts:496` cap the bloom pulse at x1.15. |
| S2 | P2 | On phones the snake reads pale mint. The tiles, planned as deep indigo, render pink-lavender. Snake-to-board contrast is low. | `phone-2-early.png`, `phone-3-midgame.png`. Snake colour is a strong `#2fc45a` (`scene.ts:51-55`). Tile colours are dark (`board.ts:54-55`). The pink fill point light (intensity 28, `game-snake/src/kit/theme.ts:47-49`) and key light 2.8 lift them. | Use the kit lighting fix (K1 in FIXLIST). In Snake, lower `lights.fill.intensity` to 10 after `addStudioLights` (`scene.ts:131`). Set tile `envMapIntensity` 0.2 and `roughness` 0.6 (`board.ts:46-51`). |
| S3 | P2 | The gem food renders as a white blob. A child sees "a white thing", not a blue gem. | `phone-2-early.png` (centre), `desktop-2-early.png`, `desktop-3-midgame.png` (white cube). Gem has emissive 0.55, env 1.2, clearcoat 1 (`game-snake/src/game/food.ts:67-77`). | Set emissive 0.2, `envMapIntensity` 0.6, colour `#3d8bfd` in `food.ts:67-77`. |
| S4 | P2 | On phones the board is about 281 of 390 CSS px wide. There is about 160 CSS px of empty space between the board and the d-pad. | `phone-1-ready.png`. The left inset reserves room for the mid-left drawer button (`game-snake/src/main.ts:274-278`; button at `top: 50%`, `game-snake/src/kit/styles.css:304`). | Move the drawer button top-left on all pages (kit K5). Then skip the toggle inset in portrait in `main.ts:274-278`. Let `game-snake/src/game/framing.ts` use the free height so the board fills at least 90% of the width. |
| S5 | P2 | First-time default is Normal: walls end the round and the snake moves about 6 cells per second. The Easy (wrap) mode exists, but on a phone it is only in the drawer. A 4-year-old will hit a wall in seconds and cannot find Easy. | `game-snake/src/main.ts:64` (default `'normal'`), `game-snake/src/logic.ts:31-33`, mode item only in the rail (`main.ts:153-159`). The mode badge on the Play button is 40 px and not a button (`game-snake/src/game.css:106-119`). | When no mode is stored, start in `'easy'` (`main.ts:63-66`). Make the start-screen mode badge a 56 px button that cycles the mode (`game.css:106-119`, `game-snake/index.html`). |
| S6 | P3 | No first-run cue shows "swipe to steer". The d-pad shows on touch, so it is not a blocker. | `phone-1-ready.png`. | On the first round only, show a ghost finger that swipes over the board for 2 s. Skip it with reduced motion. |
| S7 | P3 | Rail labels are cut off ("D-pad ...", "Sound ...", "Fullscre...", "Clear m..."). | `desktop-1-ready.png`. | Kit fix K3 in FIXLIST. |
| S8 | P3 | One board, one rule set. Variety comes only from three food kinds and combos. | `logic.ts`, `food.ts`. | Later: optional "garden" boards with a few soft bushes, seeded. Keep it optional and calm. |

## Scores

| # | Dimension | Weight | Score | Evidence | Conf |
| --- | --- | --- | --- | --- | --- |
| 1 | Core loop and clarity of goal | 15% | 4 | Eat, grow, score. Food glows and bobs. The eyes look at the food (`scene.ts:476-486`), which points the way. | H |
| 2 | Onboarding / first time | 12% | 4 | Big green Play button over the board (`phone-1-ready.png`). One tap. D-pad on by default on touch (`main.ts:76-84`). Normal as the default is hard for small kids (S5). | H |
| 3 | Feedback and readability | 12% | 3 | Good: "+10 x2" pops, eat sound, gulp, particles, sleep "Zzz" on the end. Bad: meal flash hides the board (S1), pale snake (S2), white gem (S3). | H |
| 4 | Pacing and session length | 8% | 4 | Short rounds. Small speed-up per meal (`logic.ts:134-137`). The end card waits 1.3 s so the child sees the snake curl up (`main.ts:27`). | M |
| 5 | Difficulty and fairness | 10% | 4 | Three modes with wrap in Easy. A wall bump is a gentle stop (`logic.ts:171-178`). Two-turn input buffer (`logic.ts:125-131`). No-reverse rule. Default mode is too hard for small kids (S5). | H |
| 6 | Game feel, juice, controls | 15% | 4 | Smooth interpolated tube body, squash on gulp, blink, d-pad fires on press (`main.ts:390-411`), swipe, keyboard, gamepad. | M |
| 7 | Replayability and non-manipulative retention | 8% | 3 | Best score per mode, combos, three food kinds. No streaks or nags. Little variety beyond that (S8). | H |
| 8 | Accessibility and inclusivity | 10% | 3 | Good: reduced motion removes shake and the flash (`scene.ts:492,496`), wall height shows the mode without colour (`board.ts:125-131`), slow Easy mode. Bad: low contrast on phones (S2), flash (S1), cut-off labels, 44 px drawer close. | H |
| 9 | Presentation, art, audio | 6% | 3 | Cute 3D snake and a cosy room. On desktop the end state looks good (`desktop-3-midgame.png`). On phones the glow washes it out. Audio not heard. | M |
| 10 | Technical polish | 4% | 4 | CI green: 136 unit, 41 e2e (139.6 s). Ready in 2.1 s on phone. Seeded replay tests. | H |
| | **Weighted overall** | | **3.64** | 0.15x4 + 0.12x4 + 0.12x3 + 0.08x4 + 0.10x4 + 0.15x4 + 0.08x3 + 0.10x3 + 0.06x3 + 0.04x4 | |

## Rule checks

| Check | Result | Evidence |
| --- | --- | --- |
| Privacy (zero external requests, no cookies) | PASS | Snake `ci:local` and hub `ci:site` request guards passed. Best scores use `g499:snake:*` keys. |
| Menus on the left | PASS | Left rail on desktop. Left drawer on phone. Score and best sit top-right as HUD readouts, which the rule allows. The d-pad is a game control. |
| Phones first | PARTIAL | Zoom lock on the game page (`game-snake/index.html:7`), on-screen d-pad, safe-area probe (`main.ts:262-285`). Fails: small board (S4), 44 px drawer close (kit). |
| Trademarks and likeness | PASS | "Snake" is a generic word. Original art. |
| Content safety for kids | PASS | The snake falls asleep with "Zzz" and a moon icon. A full board shows a star. No harm shown. |

## First-run timing

| Step | Phone | Desktop |
| --- | --- | --- |
| Page ready | 2134 ms | 1745 ms |
| Taps to start | 1 (Play) | 1 (Play, Space or Enter) |
| Taps to steer | 1 per turn (d-pad) or 1 swipe | 1 key per turn |
| First meaningful action | about 2.2 s plus human reaction | about 1.8 s plus human reaction |

The bot ate 4 foods in one round on both sizes and scored 100. Four plain meals give 40, so combos added the rest (for example 10 + 20 + 30 + 40).

## What works

- The snake fails kindly. It stops, curls up and sleeps. Nothing breaks, nobody laughs at the child.
- Input is generous: a two-turn buffer and d-pad on press. A fast double turn never gets lost.
- The wall height shows the mode: tall pink walls stop you, low blue walls let you wrap. This works without colour vision.
- Rules are pure and seeded. A seed plus an input script replays the same round.

## Comparables (generic)

- The classic monochrome phone snake game: walls end the round, fast pace. This version is kinder.
- Modern 3D casual snake games on a tiled board with wrap modes.
- Pre-school "feed the caterpillar" games with no fail state. Easy mode is close to these. Make it the first-run default (S5).

## UNVERIFIED

- Audio: I heard no sound.
- The game-over card, the pause overlay and the drawer are not in any screenshot. In `phone-3-midgame.png` the d-pad shows Play, so the round had probably just ended, before the card delay. This is an inference.
- The Easy and Fast modes are not in the screenshots.
- Swipe input on a real phone. CI covers touch emulation only.
- Gamepad input: code only.
- The fixes for S1 to S4 are not tested.
