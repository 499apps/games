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
