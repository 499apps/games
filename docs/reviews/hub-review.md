# Hub review: 499apps Games (`/games/` and `/games/privacy/`)

| Field | Value |
| --- | --- |
| Scope | BUILD WALKTHROUGH (solo, automated) |
| Date | 2026-10-30 |
| Reviewed | Assembled `site/games/` (hub, privacy page). Live loop on a real GPU (Intel UHD, ANGLE D3D11), Chromium. Phone 390x844 at DPR 3 with touch. Desktop 1440x900. Source in `games/` and the vendored kit in `games/src/kit/` (same as `games-kit/src/`). |
| Evidence | `shots/hub/phone-1-landing.png`, `phone-2-privacy.png`, `desktop-1-landing.png`, `desktop-2-privacy.png`, `shots/timing-*.json`, CI result from the operator |
| Method | I looked at each screenshot and read the code. I did not run the build. I did not watch a child play. |

## Verdict

**FIX-THEN-SHIP. Overall 3.68 / 5.**

The hub is clear and fast. A child gets to a game with one tap. The privacy page is excellent. Two problems stop a ship today:

1. On a real GPU, bloom and strong lights make the two playable tiles almost white. The best art on the page is the art you cannot see.
2. The frame time on an integrated GPU is 33 ms (budget 20 ms).

## Top findings

| ID | Sev | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| H1 | P1 | The Coloring tile is almost white and the Snake tile is pale mint. You cannot see the palette or the snake art. The marquee bar also clips to white. | `desktop-1-landing.png`, `phone-1-landing.png`. Shells use pastel `sky` and `lime` (`games/src/hub/catalog.ts:32,42`) with clearcoat 1 and env 0.9 (`games/src/kit/scene-helpers.ts:74-83`). The hub uses the kit default bloom threshold 0.82 (`games/src/kit/theme.ts:51`; `games/src/hub/main.ts:31-38` sets only `fov`). The selected strip goes to emissive 2.75 (`games/src/hub/scene.ts:650`). The locked tile is 45% darker (`scene.ts:239`) and it looks correct. This shows that brightness above the threshold is the cause. | In `games/src/hub/main.ts` pass `renderer: { fov: 38, exposure: 0.95, bloom: { strength: 0.4, radius: 0.45, threshold: 1.15 } }`. In `games/src/hub/scene.ts:241` set the shell `envMapIntensity` to 0.45 and `clearcoat` to 0.6. Mix the shell colour 12% toward `palette.night`. At `scene.ts:650` change `2.4 * rig.sel` to `1.0 * rig.sel`. Then add the kit "clipping budget" test (K2 in FIXLIST). |
| H2 | P1 | Median frame time is 33.3 ms on Intel UHD (budget 20 ms). It was the one failure in `ci:site` (128 passed, 1 failed). | Operator CI run. The hub animates every object every frame (`games/src/hub/scene.ts:618-677`: bob, spin, bulbs, sparkles). Every candy material has clearcoat and sheen (`games/src/kit/scene-helpers.ts:78-81`). The frame monitor needs 60 frames before it drops a tier (`games/src/kit/quality.ts:163`), which is 2 s at 30 fps. Then it waits 2 more windows. | (a) In `games-kit/src/scene-helpers.ts:80` set the default `sheen` to 0. (b) In `games-kit/src/quality.ts` change the monitor window to 30 frames, or to a time window of 0.75 s. (c) In `games/src/hub/scene.ts` set `renderer.shadowMap.autoUpdate = false` and set `needsUpdate = true` only on layout, selection or every 4th frame. (d) In `games-kit/src/smoke/suite.ts:188` run the frame-time test alone, after the parallel shards. The other Playwright workers share the GPU. Keep (a) to (c) even if (d) makes the test pass. |
| H3 | P2 | The coming-soon tile used the product name of a real space company (resolved: renamed "Catch the Booster" by H G). The rules forbid company marks (`games/docs/PLAN.md:141`). | `games/src/hub/catalog.ts:49`, `games/index.html:43-45`, all landing shots. | Use a generic visible name, for example "Rocket Catch". The slug `catch-the-booster` is already generic. The owner must make this decision. |
| H4 | P2 | Rail labels are cut off: "Sound ...", "Fullscre...", "Clear m...". "Clear m..." is a destructive control with an unclear label. | `desktop-1-landing.png`, `desktop-2-privacy.png`. 11 px, `nowrap`, `ellipsis` in a 72 px rail (`games-kit/src/styles.css:207,221-227`; `theme.ts:57`). | In `games-kit/src/styles.css:221` let the label wrap to 2 lines (`white-space: normal; line-height: 1.05`). Set the rail width to 80 px in `games-kit/src/theme.ts:57`. Use short labels in `games-kit/src/shell.ts`: "Sound", "Full screen", "Clear data". |
| H5 | P2 | The drawer close button is 44x44 px. The phone rule is 56 px or more. | `games-kit/src/styles.css:369-370`. | Use `var(--g499-touch)` for width and height. |
| H6 | P3 | On phones the drawer button sits in the middle of the left edge. It covers the shelf edge next to the Coloring tile. The privacy page puts the same button top-left. The position is not consistent. | `phone-1-landing.png` (button at y about 50%), `phone-2-privacy.png` (top-left). `games-kit/src/styles.css:304`. | Put the toggle top-left on every page: `top: calc(10px + var(--g499-safe-top))` in `games-kit/src/styles.css:304`. It stays on the left. |
| H7 | P3 | In portrait the locked tile has a full shelf row to itself. It takes about 30% of the screen for something a child cannot play. | `phone-1-landing.png`. | In `games/src/hub/layout.ts` scale "soon" tiles to 0.75 in portrait, or put them at the end of the last full row. |
| H8 | P3 | The CSP has no `frame-ancestors 'none'`. The brief asks to keep it. This is probably on purpose (Chromium logs an error for it in a meta tag, which fails the console check). The reason is not written down. | `games/src/kit/csp.ts:7`, `games/index.html:5`. No match for `frame-ancestors` in the workspace. | Write the reason in `games/docs/PLAN.md` section 4. Keep a test that checks the directive is absent on purpose. |

## Scores

Weights follow the rubric. Confidence: H = seen in screenshots and code, M = code reading or one run, L = inference.

| # | Dimension | Weight | Score | Evidence | Conf |
| --- | --- | --- | --- | --- | --- |
| 1 | Core loop and clarity of goal | 15% | 4 | One job: pick a game. Big 3D tiles plus labelled pill buttons with icons (`games/index.html:28-50`). Blown-out tile art weakens it (H1). | H |
| 2 | Onboarding / first time | 12% | 4 | Ready in 2.05 s (phone), 1.36 s (desktop). One tap to a game. Icons on every pill. No reading needed. | H |
| 3 | Feedback and readability | 12% | 3 | Good: lift, glow and particles on select (`scene.ts:562-567,636-650`), wobble and a soft sound on the locked tile (`main.ts:77-83`). Bad: tile art unreadable (H1), labels cut off (H4). | H |
| 4 | Pacing and session length | 8% | 4 | 300 ms press animation, then the game opens (`main.ts:91`). 80 ms with reduced motion. No waits. | M |
| 5 | Difficulty and fairness | 10% | 4 | Nothing to fail. The locked tile wobbles, it does not scold. | M |
| 6 | Game feel, juice, controls | 15% | 4 | Squash on press, easeOutBack lift, idle bob, pointer parallax, hover tick. Touch, mouse, keyboard and gamepad move one selection (`main.ts:104-135`). | M |
| 7 | Replayability and non-manipulative retention | 8% | 4 | No streaks, no rewards, no nags. The hub is a door, not a hook. | H |
| 8 | Accessibility and inclusivity | 10% | 3 | Good: real links with `aria-label`, focus ring, zoom kept, reduced motion. Bad: 11 px cut-off labels (H4), 44 px close button (H5), low art contrast under bloom (H1). | H |
| 9 | Presentation, art, audio | 6% | 3 | Strong concept: shelf, marquee bulbs, polka-dot wall. On a real GPU the glow hides it. Audio not heard. | M |
| 10 | Technical polish | 4% | 3 | Fast load, offline and privacy pass in CI. Frame time fails on integrated GPU (H2). | M |
| | **Weighted overall** | | **3.68** | 0.15x4 + 0.12x4 + 0.12x3 + 0.08x4 + 0.10x4 + 0.15x4 + 0.08x4 + 0.10x3 + 0.06x3 + 0.04x3 | |

## Rule checks

| Check | Result | Evidence |
| --- | --- | --- |
| Privacy (zero external requests, no cookies) | PASS | `ci:site` request guard and cookie checks passed. The privacy page lists every key and shows "Keys on this device now: none" (`desktop-2-privacy.png`). |
| Menus on the left | PASS | Left rail on desktop, left drawer button on phone. The game pills are bottom-centre. They are the game catalogue (content), not a menu, so I accept them. |
| Phones first | PARTIAL | PWA tags present (`games/index.html:7-18`). Zoom kept on hub and privacy page. Fails: 44 px close button (H5). |
| Trademarks and likeness | RISK, resolved after review | A real vehicle name on the coming-soon tile (H3, since renamed "Catch the Booster"). No logos or likeness seen. |
| Content safety for kids | PASS | No violence, no chat, no links out. Calm copy: "Play. No ads. No tracking." |

## First-run timing

| Step | Phone (390x844) | Desktop (1440x900) |
| --- | --- | --- |
| Landing to hub ready | 2050 ms | 1364 ms |
| Taps to open a game | 1 | 1 (or Enter) |
| Hub to first paint in Coloring (lower bound) | about 3.4 s plus human reaction | about 2.6 s plus human reaction |
| Hub to first move in Snake (lower bound) | about 4.5 s plus human reaction | about 3.4 s plus human reaction |

The lower bounds add the 300 ms open animation and the game ready time. All are far below 30 s.

## What works

- One tap from landing to a game. Icons carry the meaning; labels are extras.
- The privacy page is short, plain and honest. It shows the live storage keys. It is the best parent page I have seen on a kids' site.
- Real `<a>` links mirror the 3D tiles, so keyboard and screen readers work.
- The locked tile gives gentle feedback, not an error.

## Comparables (generic)

- Game-console home screens with large box-art tiles on a shelf.
- Pre-school tablet launchers with one big picture button per activity.
- Arcade cabinets in attract mode with marquee bulbs.

The hub matches these for clarity. It loses to them on art readability today, because of H1.

## UNVERIFIED

- Audio: I heard no sound. The pick, tick and fail sounds are not checked.
- Repeat visit: no repeat-visit screenshot exists. Offline reload is checked by CI only.
- Drawer open state on phone: not in the screenshots.
- Gamepad input: code only.
- Firefox and WebKit: CI only.
- The reason for the missing `frame-ancestors` (H8) is my inference.
- The legal status of the earlier coming-soon name (H3, since renamed). I am not a lawyer.
- The fixes for H1 and H2 are not tested. Check them with the clipping-budget test and the frame-time test.

## Re-score after fixes (g6)

| Field | Value |
| --- | --- |
| Date | 2026-10-30 |
| Pinned code | games-kit 94bac65, games 0599f35 |
| Checked | New real-GPU shots `shots/hub/desktop-1-landing.png`, `desktop-2-privacy.png`, `phone-1-landing.png`, `phone-2-privacy.png`. `shots/timing-*.json`. CI baselines `games/e2e/screenshots/chromium-win32/hub.png` and `iphone-win32/hub.png`. Source: `games/src/hub/{main,scene,catalog,catalog.test}.ts`, `games-kit/src/{theme,scene-helpers,quality,pixels,renderer,styles.css}`, `games-kit/src/smoke/suite.ts`. Operator G7-RESULTS. |
| Not checked | The g5 shots (in git at 846a0c4). I cannot run git, so I compare with the g5 text. I did not run the build. |

### Verdict (g7)

**SHIP WITH FIXES. Overall 3.78 / 5 (g5: 3.68).**

The rail, the drawer and the labels are now correct. No P0 or P1 stays open. The hub is still the weakest page to look at:

1. The tile art still reads milky on a real GPU. The shells are fixed, but the previews inside them are not.
2. The frame time passes on a quiet GPU and fails when the GPU is shared.

### What I see in the new shots

- `desktop-1-landing.png`: the shells are now light blue and light green, not white. The Coloring preview is still a near-white disc on a pale yellow screen. Its paint dabs are faint. The Snake preview is a pale mint coil. The marquee bar is a hard cream tube with a white rim. The locked tile has the best colour on the shelf.
- `phone-1-landing.png`: the same look. The drawer button is now top-left. The locked tile still has its own row (H7).
- `chromium-win32/hub.png` (software GL, tier low, no bloom): the palette, the dabs and the snake read well. The marquee is dark plum.
- `iphone-win32/hub.png` (tier medium, bloom on): the palette glows white again. This shows that the previews are above the bloom threshold, not that the art is bad.

### Scores (g7)

Confidence: H = seen in shots and code, M = code or one run, L = inference.

| # | Dimension | Weight | g5 | g7 | Evidence | Conf |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Core loop and clarity of goal | 15% | 4 | 4 | One tap to a game. Labelled pills with icons. The tile art is still weak (H1). | H |
| 2 | Onboarding / first time | 12% | 4 | 4 | Ready in 1.32 s (phone) and 1.22 s (desktop), was 2.05 s and 1.36 s (`timing-*.json`). | H |
| 3 | Feedback and readability | 12% | 3 | 3 | Fixed: labels wrap (`desktop-1-landing.png`). Open: the Coloring preview is near-white on pale yellow. The selected screen glows to 0.59 plus a pulse (`games/src/hub/scene.ts:662-663`). | H |
| 4 | Pacing and session length | 8% | 4 | 4 | No change. | M |
| 5 | Difficulty and fairness | 10% | 4 | 4 | No change. | M |
| 6 | Game feel, juice, controls | 15% | 4 | 4 | No change. | M |
| 7 | Replayability, non-manipulative retention | 8% | 4 | 4 | No change. | H |
| 8 | Accessibility and inclusivity | 10% | 3 | 4 | Labels wrap to 2 lines in an 80 px rail (`games-kit/src/styles.css:229-236`, `theme.ts:58`). Close button 56 px (`styles.css:380-381`). Toggle top-left (`styles.css:314`, `phone-1-landing.png`). | H |
| 9 | Presentation, art, audio | 6% | 3 | 3 | Shells improved. Previews milky, marquee bar harsh (`desktop-1-landing.png`). Audio not heard. | H |
| 10 | Technical polish | 4% | 3 | 3 | Frame time: 1 failure in `ci:local` and 1 in `ci:site` (33.3 ms, shared GPU). Green on a quiet GPU. | M |
| | **Weighted overall** | | **3.68** | **3.78** | 0.15x4 + 0.12x4 + 0.12x3 + 0.08x4 + 0.10x4 + 0.15x4 + 0.08x4 + 0.10x4 + 0.06x3 + 0.04x3 | |

### g5 findings

| ID | Status | Evidence |
| --- | --- | --- |
| H1 | PARTLY | Done: hub bloom threshold 1.15 (`games/src/hub/main.ts:38`). Shell 12% night, clearcoat 0.6, env 0.45 (`scene.ts:47,244-247`). Strip `0.35 + 1.0 * rig.sel` (`scene.ts:664`). Marquee emissive 0.6 (`scene.ts:413`). Not done: the previews keep the candy defaults, clearcoat 1 and env 0.9 (`games-kit/src/scene-helpers.ts:78,83`), on pastel colours: cream board (`scene.ts:71`), `palette.lime` snake (`scene.ts:133`). The hub still uses ACES (no `toneMapping` in `main.ts:38`). Snake and Coloring left ACES because it pushed colours to white. The look gate passes because it counts only pixels with min(R, G, B) >= 240 (`games-kit/src/pixels.ts:5`). Milky pastels are lighter than the background but below 240. See K9. |
| H2 | PARTLY | Done: shadows every 4th frame (`scene.ts:49,348-349`), sheen 0 (`scene-helpers.ts:81`), 30-frame window (`games-kit/src/quality.ts:135`), integrated GPUs start at medium (`quality.ts:119`). Result: 16.7 ms median on a quiet GPU. 33.3 ms when another Playwright run shared the GPU. Snake and Coloring passed in that same shared pass, so the hub is the heaviest page. My judgement is in H2-g7 below. |
| H3 | FIXED | Title "Catch the Booster" (`games/src/hub/catalog.ts:49`). Pill "Booster" in both landing shots. Guard test (`games/src/hub/catalog.test.ts:63-67`). |
| H4 | FIXED | "Sound", "Full screen", "Clear data" show in full (`desktop-1-landing.png`, `desktop-2-privacy.png`). |
| H5 | FIXED | `games-kit/src/styles.css:380-381` uses `var(--g499-touch)`. The open drawer is not in a shot. |
| H6 | FIXED | Top-left on the hub and the privacy page (`phone-1-landing.png`, `phone-2-privacy.png`). |
| H7 | OPEN | The locked tile still has its own shelf row (`phone-1-landing.png`). P3. |
| H8 | FIXED | Reason in `games/docs/PLAN.md:118`. Test in `games-kit/src/csp.test.ts:19-22`. |

### H2-g7: is the hub too heavy for integrated GPUs under load?

Yes, a little. It is not a blocker. Reasons:

- The median is quantised to vsync: 16.7 ms or 33.3 ms. A 16.7 ms result shows only that each frame fits in one vsync. It does not show the headroom.
- Under load the median went to 33.3 ms. The monitor drops one tier per window, then waits 2 windows (`quality.ts:172`). The test waits 1.5 s, then measures for 2 s. So the hub was at a lower tier for most of the measurement and still missed vsync.
- Snake and Coloring held 60 fps under the same load. A real child's laptop often has other tabs or a video call open. The hub is the first page they see.

The hub is a menu. A drop to 30 fps under load does not break play, so I rate it P2, not P1.

### New findings (g7)

| ID | Sev | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| H1b | P2 | The previews inside the tiles are still milky. The Coloring palette is near-white on a pale yellow screen. The Snake coil is pale mint. | `desktop-1-landing.png`, `phone-1-landing.png`, `iphone-win32/hub.png`. Compare with `chromium-win32/hub.png` (no bloom), where the art reads well. Code refs in H1 above. | In `games/src/hub/main.ts:38` add `toneMapping: THREE.NeutralToneMapping` (Snake and Coloring use it). In `games/src/hub/scene.ts`: give every preview material `clearcoat: 0.3` and `envMapIntensity: 0.35`. Make the palette board `mixHex(palette.cream, palette.tangerine, 0.3)` (`scene.ts:71`). Use the game's snake green `#2fc45a` for the preview body (`scene.ts:133`). Change the screen glow to `0.14 + 0.15 * rig.sel + pulse` and the pulse to `0.05` (`scene.ts:662-663`). Check with K9. |
| H9 | P3 | The marquee bar glows as a hard cream tube with a white rim. It pulls the eye away from the tiles. | `desktop-1-landing.png` (top bar), `phone-1-landing.png`. Lemon colour with tangerine emissive 0.6 and clearcoat 1 (`games/src/hub/scene.ts:407-416`). | In `scene.ts:409-416` use colour `mixHex(palette.lemon, palette.tangerine, 0.4)`, `emissiveIntensity: 0.3`, `clearcoat: 0.3`. |
| H2-g7 | P2 | The hub misses vsync on an integrated GPU when the GPU is shared, even after the tier drop. | Operator G7-RESULTS: 33.3 ms in `ci:local` and in `ci:site`. Snake and Coloring passed in the same pass. | (a) In `games-kit/src/scene-helpers.ts:78-83` let `candyMaterial` take `clearcoat: 0` at tier low (for example a kit flag set from `games-kit/src/quality.ts`). Clearcoat is a second specular layer on every pixel. (b) In `games/src/hub/scene.ts:420-434` draw the 14 bulbs as one `InstancedMesh` with `instanceColor`, and scale the colour per bulb for the pulse. (c) In `games-kit/src/smoke/suite.ts:250-282` also record the CPU time of each render call and the p90 frame time, so the test shows the headroom (see K10). |
| H10 | P3 | A personal name (initials) is in code and in the reviews. The open-source rules forbid personal names. | `games/src/hub/catalog.test.ts:64`, this file line 26 (g5 text, kept unchanged on purpose). | In `games/src/hub/catalog.test.ts:64` write "The owner renamed ...". Edit line 26 of this file the same way, if the owner accepts a change to the g5 text. FIXLIST is already changed. |

### UNVERIFIED (g7)

- Audio.
- The open drawer at 56 px.
- The true GPU time per frame. The median hides it (K10).
- The cause of the milky previews is from code reading and the two CI baselines. Confirm it with K9 before and after the H1b change.
