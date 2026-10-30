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

## Re-score after fixes (g6)

| Field | Value |
| --- | --- |
| Date | 2026-10-30 |
| Pinned code | games-kit 94bac65, game-snake ba4913f |
| Checked | New real-GPU shots `shots/snake/phone-1-ready.png`, `phone-2-early.png`, `phone-3-midgame.png`, `desktop-1-ready.png`, `desktop-2-early.png`, `desktop-3-midgame.png`. `shots/timing-*.json`. CI baseline `game-snake/e2e/screenshots/iphone-win32/snake.png`. Source: `game-snake/src/{main,scene,logic}.ts`, `game-snake/src/game/{board,glow,food}.ts`, `game-snake/index.html`. Operator G7-RESULTS. |
| Not checked | The g5 shots (in git at 846a0c4). I compare with the g5 text. Game-over card, pause overlay, Garden boards and Fast mode are not in any shot. |

### Verdict (g7)

**SHIP WITH FIXES. Overall 4.04 / 5 (g5: 3.64).**

The g5 blockers are gone. The board no longer washes out after a meal. A first-time child starts in Easy. The board fills 90% of the phone width. Three look problems stay:

1. The board rim is a hard white neon frame. It is the brightest thing on screen, and it hides the mode colour.
2. The snake body still reads pale mint, not the strong green in the code.
3. The berry food is now the white blob that the gem was in g5.

### What I see in the new shots

- `phone-2-early.png` and `desktop-2-early.png` (just after a meal): the grid stays calm. The snake and the next food stay visible. S1 is fixed.
- All six shots: the rim is near-white with a wide glow. In Easy the rim should read sky blue (`game-snake/src/game/board.ts:152`). It reads white. The CI baseline `iphone-win32/snake.png` shows the same white rim, so it is not only bloom.
- All six shots: the body is pale mint with a glow, not `#2fc45a`.
- `phone-3-midgame.png`, `desktop-3-midgame.png`: the gem now reads as a blue diamond. S3 is fixed for the gem.
- `phone-2-early.png`, `desktop-2-early.png`: the food at the centre is a white cluster of 4 balls. That is the berry shape (`food.ts:87-102`).
- `phone-1-ready.png`: the 56 px "Easy" speed button sits next to Play. The board spans about 90% of the width.

### Scores (g7)

| # | Dimension | Weight | g5 | g7 | Evidence | Conf |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Core loop and clarity of goal | 15% | 4 | 4 | No change in the loop. The food is easier to find after a meal. | H |
| 2 | Onboarding / first time | 12% | 4 | 5 | Easy is the default (`game-snake/src/logic.ts:81-86`). A 56 px speed button on the start screen (`game-snake/index.html:42`, `main.ts:466-471`, `phone-1-ready.png`). Ready in 1.56 to 1.64 s (`timing-*.json`). The swipe cue (S6) is still missing, but the d-pad shows. | H |
| 3 | Feedback and readability | 12% | 3 | 3 | Fixed: meal flash (S1), gem (S3). New: white rim (S9), white berry (S10). Open: pale body (S2). | H |
| 4 | Pacing and session length | 8% | 4 | 4 | No change. | M |
| 5 | Difficulty and fairness | 10% | 4 | 5 | The only g5 issue was the hard default. Easy now wraps and is slow (`logic.ts:81`, unit test `logic.test.ts:102-105`). | M |
| 6 | Game feel, juice, controls | 15% | 4 | 4 | No change. | M |
| 7 | Replayability, non-manipulative retention | 8% | 3 | 4 | Optional seeded Garden boards, off by default, own best score per mode (`main.ts:36,82-85`). Not in a shot. | M |
| 8 | Accessibility and inclusivity | 10% | 3 | 4 | Board 90% wide on phones. Labels fit (`desktop-1-ready.png`). 56 px close button. The rim height still shows the mode; the rim colour no longer does (S9). | H |
| 9 | Presentation, art, audio | 6% | 3 | 3 | The board reads deep blue-violet now. The white rim and the pale body still flatten the look. Audio not heard. | H |
| 10 | Technical polish | 4% | 4 | 4 | 165 unit, 43 e2e, 0 flaky, with the look gate and the frame time on the host GPU. | H |
| | **Weighted overall** | | **3.64** | **4.04** | 0.15x4 + 0.12x5 + 0.12x3 + 0.08x4 + 0.10x5 + 0.15x4 + 0.08x4 + 0.10x4 + 0.06x3 + 0.04x4 | |

### g5 findings

| ID | Status | Evidence |
| --- | --- | --- |
| S1 | FIXED | Grid `0.35 + 0.55 * glow`, capped (`game-snake/src/game/glow.ts:13-15`). Flash on the rim and a ring only (`board.ts:126-138,167-175`). Bloom pulse max x1.15 (`glow.ts:10,28-31`, `scene.ts:556`). `phone-2-early.png` shows no wash. |
| S2 | PARTLY | Done: fill 10 (`scene.ts:143`), tiles env 0.2 and roughness 0.6 (`board.ts:50-55`), Neutral tone mapping and exposure 0.85 (`main.ts:211-217`). The tiles now read blue-violet. Not done: the body still reads pale mint in every shot and in the CI baseline. See S2-g7. |
| S3 | FIXED (gem) | `#3d8bfd`, emissive 0.2, env 0.6 (`food.ts:12,67-79`). The gem reads blue in `phone-3-midgame.png`. The berry has the same problem now (S10). |
| S4 | FIXED | The board spans about 90% of the phone width (`phone-1-ready.png`). About 120 CSS px stays empty above the d-pad. The board is limited by the width, so this is acceptable. |
| S5 | FIXED | `DEFAULT_MODE = 'easy'` (`logic.ts:81`). Speed button on the start screen (`index.html:42`, `phone-1-ready.png`). |
| S6 | OPEN | No swipe cue. P3. |
| S7 | FIXED | "D-pad", "Garden", "Full screen", "Clear data" show in full (`desktop-1-ready.png`). |
| S8 | FIXED | Garden boards (see dimension 7). Not seen in a shot. |

### New findings (g7)

| ID | Sev | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| S9 | P2 | The rim is a hard white neon frame with a wide glow. It is the brightest thing on screen and it competes with the snake. In Easy it should read sky blue; it reads white, so the colour cue for "edges wrap" is lost. | All six shots and `iphone-win32/snake.png`. Rim colour = emissive colour = pastel `palette.sky` or `palette.bubblegum` (`board.ts:101-105,150-156`). Rest emissive 0.6 (`glow.ts:23-25`: `0.25 + 0.35 * glow`). Candy defaults clearcoat 1 and env 0.9. | In `game-snake/src/game/glow.ts:24` use `0.1 + 0.15 * glow + 0.45 * flash`. In `board.ts:152` use `mixHex(palette.sky, palette.night, 0.25)` and `mixHex(palette.bubblegum, palette.night, 0.2)`. In `board.ts:101-105` add `clearcoat: 0.4` and set `envMapIntensity` to 0.35. Update `glow.test.ts`. Add an e2e check: sample a rim pixel at `?tier=high` and assert its hue is within 25 degrees of the swatch hue. |
| S2-g7 | P2 | The body reads pale mint, not `#2fc45a`. | All six shots, `iphone-win32/snake.png`. Body: clearcoat 0.85, env 0.55 (`scene.ts:180-187`). Head the same (`scene.ts:206-209`). The top-down camera sees the lit top of the tube: hemisphere 1.15 with a near-white sky (`games-kit/src/theme.ts:38-40`) plus key 2.4. Neutral tone mapping turns very bright colours toward white. This cause is from code reading (M). | In `game-snake/src/scene.ts:143` also set `lights.hemi.intensity = 0.7`. In `scene.ts:185-187` and `207-209` use clearcoat 0.5 and env 0.3. Move `game-coloring/src/game/color-diff.ts` to `games-kit/src/color-diff.ts`. Add a Snake e2e test like Coloring C1: at `?tier=high`, sample the head and assert deltaE to `#2fc45a` below 15. |
| S10 | P2 | The berry food reads as a white blob. A child sees "a white thing", not a purple berry. | `phone-2-early.png`, `desktop-2-early.png` (centre). Pastel `palette.lavender` with emissive lavender 0.4 and candy defaults (`food.ts:16,89`). | In `game-snake/src/game/food.ts:16,89` use `#8f5bf0` (a deeper violet), `emissiveIntensity: 0.15`, `envMapIntensity: 0.5`. Use the same colour check as S2-g7. |

### UNVERIFIED (g7)

- Audio.
- Garden boards, the speed cycle, the game-over card and the pause overlay are not in a shot.
- The cause of S2-g7 is from code reading.
- Swipe on a real phone.

## Re-score after fixes (g8)

| Field | Value |
| --- | --- |
| Date | 2026-10-30 |
| Pinned code | games-kit 94bac65, game-snake 00bfd8c (pinned in `games/games.lock.json:6`) |
| Checked | New real-GPU shots (04:17) `shots/snake/phone-1-ready.png`, `phone-2-early.png`, `phone-3-midgame.png`, `desktop-1-ready.png`, `desktop-2-early.png`, `desktop-3-midgame.png`. `shots/timing-*.json`. CI baselines `game-snake/e2e/screenshots/iphone-win32/snake.png` and `games/e2e/screenshots/iphone-win32/site-snake.png`. Source: `game-snake/src/main.ts:211-216`, `scene.ts:136-212`, `game/board.ts:100-175`, `game/glow.ts`, `game/food.ts`, `game/glow.test.ts`. Operator G8-RESULTS. |
| Not checked | Git history (I cannot run git). Audio. Game-over card, pause overlay, Garden boards. |

### Verdict (g8)

**SHIP. Overall 4.22 / 5 (g7: 4.04, g5: 3.64).**

The three g7 look problems are fixed on the real GPU. The body reads green, the rim reads sky blue with no white halo, and the berry reads violet. No dimension is below 4. Two P3 polish items are new (S11, S12).

### What I see in the new shots

- All six shots: the body and the head are a strong green, close to `#2fc45a`. The darker bands show along the tube (`desktop-3-midgame.png`).
- All six shots: the rim is a clear sky blue. The white neon frame and its wide glow are gone. The low rim height and the blue colour both show "edges wrap" again.
- `phone-2-early.png`, `desktop-2-early.png`: the berry is a violet cluster with a mint leaf, not a white blob. On the phone it is about 17 CSS px wide, and its hue is close to the blue-violet tiles (S11).
- `phone-1-ready.png`, `desktop-1-ready.png`: the apple is red with a soft glow. The Play button and the 56 px "Easy" button sit on the board.
- `phone-3-midgame.png`, `desktop-3-midgame.png`: the gem is a clear blue diamond. The eye whites bloom to two white spots, so the pupils do not show (S12).
- The CI baseline `iphone-win32/snake.png` (WebKit, software GL) shows the same green body and blue rim. The host GPU and the CI engine now agree.

Note on tone mapping: G8 says 00bfd8c moved Snake from ACES to Neutral. My g7 text already lists Neutral and exposure 0.85 in `main.ts:211-217`. I cannot check the history without git. The code now has Neutral and 0.85 (`main.ts:213-214`). This does not change a score.

### Scores (g8)

Confidence: H = seen in shots and code, M = code or one run, L = inference.

| # | Dimension | Weight | g7 | g8 | Evidence | Conf |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Core loop and clarity of goal | 15% | 4 | 4 | All three foods now read as coloured objects. The berry is small and close in hue to the board on phones (S11). | H |
| 2 | Onboarding / first time | 12% | 5 | 5 | Ready in 1.42 s (desktop) and 1.60 s (phone) (`timing-*.json`). Easy default, 56 px speed button (`phone-1-ready.png`). | H |
| 3 | Feedback and readability | 12% | 3 | 4 | Fixed: rim (S9), body (S2-g7), berry (S10). Open: berry hue contrast on phones (S11), eye-white bloom hides the gaze cue (S12). | H |
| 4 | Pacing and session length | 8% | 4 | 4 | No change. | M |
| 5 | Difficulty and fairness | 10% | 5 | 5 | No change. | M |
| 6 | Game feel, juice, controls | 15% | 4 | 4 | No change. The meal flash still lights the rim: `rimLevel(1, 1)` = 0.72 (`glow.ts:23-25`). | M |
| 7 | Replayability, non-manipulative retention | 8% | 4 | 4 | No change. | M |
| 8 | Accessibility and inclusivity | 10% | 4 | 4 | The rim colour shows the mode again (sky blue, low rim for wrap). The berry is the weakest object for low vision (S11). | H |
| 9 | Presentation, art, audio | 6% | 3 | 4 | Green snake, blue rim, deep blue-violet board, coloured food: one calm, toy-like look. Not 5: the scene is a little flat and dim, the eyes bloom (S12), audio not heard. | H |
| 10 | Technical polish | 4% | 4 | 4 | 165 unit, 43 e2e, 0 failed, 0 flaky, 4 skipped, 189.3 s, with the host-GPU look gate and frame time. Not 5: no colour probe yet, so a return of the pale body would still pass CI (K9). | H |
| | **Weighted overall** | | **4.04** | **4.22** | 0.15x4 + 0.12x5 + 0.12x4 + 0.08x4 + 0.10x5 + 0.15x4 + 0.08x4 + 0.10x4 + 0.06x4 + 0.04x4 | |

### g7 open items

| ID | Status | Evidence |
| --- | --- | --- |
| S9 | FIXED | `rimLevel` = `0.08 + 0.14 * glow + 0.5 * flash` (`game-snake/src/game/glow.ts:23-25`). Colour `mixHex(palette.sky, palette.night, 0.25)` or `mixHex(palette.bubblegum, palette.night, 0.2)` (`board.ts:156`). Clearcoat 0.4, env 0.35 (`board.ts:101-108`). Sky-blue rim, no halo in all six shots. The rim-hue probe (K9) is not added. |
| S2-g7 | FIXED | Hemi 0.7, fill 10 (`scene.ts:143-145`). Body clearcoat 0.5, env 0.3 (`scene.ts:182-189`). Head the same (`scene.ts:208-211`). Green in all six shots and in `iphone-win32/snake.png`. The head probe (K9) is not added. |
| S10 | FIXED | `BERRY_COLOR = '#8f5bf0'` (`food.ts:14`), emissive 0.15, env 0.5 (`food.ts:91-92`). Violet in `phone-2-early.png` and `desktop-2-early.png`. See S11 for the remaining contrast. |
| S6 | OPEN | No swipe cue. P3. |

### New findings (g8)

| ID | Sev | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| S11 | P3 | On phones the berry is a small violet cluster on blue-violet tiles. It reads by its mint leaf more than by its colour. The apple and the gem stand out more. | `phone-2-early.png` (about 17 CSS px wide, centre). `#8f5bf0` has a hue near 263 degrees; the tiles are near 250 degrees (`board.ts:54-55`). | In `game-snake/src/game/food.ts:14` try a magenta violet, for example `#b84ee0`, to move the hue away from the tiles. In `food.ts:89-110` scale the berry group by 1.15. Keep emissive 0.15. Check deltaE to the tile colour is above 30 with the K9 probe. |
| S12 | P3 | The eye whites bloom to two white spots on the real GPU. The pupils do not show, so the "eyes look at the food" cue is weak in some frames. | `desktop-3-midgame.png`, `phone-3-midgame.png`, `desktop-1-ready.png`. Eye whites use `candyMaterial(palette.white, { clearcoat: 1 })` with the default env 0.9 (`game-snake/src/game/head.ts:50`, `src/kit/scene-helpers.ts:78-83`). | In `game-snake/src/game/head.ts:50` use `mixHex(palette.white, palette.cream, 0.25)`, `clearcoat: 0.4`, and set `envMapIntensity = 0.3`. Check that the pupils show in `desktop-3-midgame.png`. |

### UNVERIFIED (g8)

- Audio.
- Garden boards, Fast mode, the game-over card and the pause overlay are not in a shot.
- The earlier tone-mapping state (see the note above).
- The desktop bot ate 4 and scored 50 (g7: 4 and 100). The combo timing is different between runs. I did not check why. It does not affect a score.
- The site-snake visual baselines are being regenerated. `iphone-win32/site-snake.png` already shows the new look. The `ci:site` rerun result is not in.
