# Coloring review (`/games/coloring/`)

| Field | Value |
| --- | --- |
| Scope | BUILD WALKTHROUGH (solo, automated) |
| Date | 2026-10-30 |
| Reviewed | Assembled `site/games/coloring/`. Live loop on a real GPU (Intel UHD, ANGLE D3D11), Chromium. Phone 390x844 at DPR 3 with touch. Desktop 1440x900. The script painted the rocket picture with 12 taps. Source in `game-coloring/`. |
| Evidence | `shots/coloring/phone-1-blank.png`, `phone-2-painted.png`, `phone-3-palette.png`, `desktop-1-blank.png`, `desktop-2-painted.png`, `desktop-3-palette.png`, `shots/timing-*.json`, CI result from the operator |
| Method | I looked at each screenshot and read the code. I did not run the build. I did not watch a child play. |

## Verdict

**FIX-THEN-SHIP. Overall 3.84 / 5.**

This is the strongest of the three. It is ready in 1 s, the fill tool is the default, and one tap paints. Undo, pinch zoom, a recentre button, nine pictures, a gallery and an "All done!" moment are all there. Fix two things before ship:

1. The paint on the easel is much paler than the paint in the palette. A child picks bright blue and gets pale blue.
2. On phones the picture is small. Small parts (stars, the rocket window) are hard to hit with a small finger.

## Top findings

| ID | Sev | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| C1 | P1 | Painted colours are paler and greyer than their swatches. Lemon `#fff27a` shows as pale cream. Sky `#4aa8ff` shows as pale periwinkle. For a colouring game, colour fidelity is the core promise. | Compare the swatches in `phone-3-palette.png` with the paint in `phone-2-painted.png` and `desktop-2-painted.png`. The art is lit at diffuse 0.34 plus self-glow 0.26 (`game-coloring/src/easel.ts:42-43,199-210`). Then ACES Filmic tone mapping (`game-coloring/src/kit/renderer.ts:156`) compresses and desaturates it. In the composer, tone mapping runs in `OutputPass` for every pixel, so `toneMapped: false` on the material does not help. | Add a `toneMapping` option to `games-kit/src/renderer.ts` (`KitRendererOptions`). In `game-coloring/src/main.ts:103` pass `toneMapping: THREE.NeutralToneMapping` (three r162+, the repo pins ^0.170.0). Raise the art light so white paper maps to about 0.95. Add an e2e test at `?tier=high`: fill a region with Red, read the pixel, and check the colour difference to `#ff4f5e` is small (for example deltaE below 8). |
| C2 | P2 | A white halo sits around the easel frame, and the night window glows next to the tools. It washes over the paper edge and pulls the eye away from the picture. | `desktop-1-blank.png`, `desktop-2-painted.png`, `phone-1-blank.png` (top-left window). The outer frame keeps the default white sheen 0.25 and clearcoat 0.7 (`easel.ts:300-305`; default sheen in `game-coloring/src/kit/scene-helpers.ts:80`). The window frame is glossy cream candy (`easel.ts:357,361`). | In `easel.ts:300-305` set `sheen: 0`, `clearcoat: 0.3`, `envMapIntensity: 0.25`. Use `matteMaterial` for the window frame and bars (`easel.ts:357-365`). Kit default sheen 0 (K1) also helps. |
| C3 | P2 | On phones the picture is about 223 CSS px wide on a 390 px screen (57%). About 22% of the screen height below the easel is empty floor. The small stars are about 13 to 17 CSS px. The tap tolerance is 12 picture px (`regions.ts:124`), about 2.6 CSS px at this size, and it only helps on outlines. | `phone-1-blank.png`, `phone-2-painted.png`. `game-coloring/src/game/regions.ts:124`. | In `game-coloring/src/game/fit.ts` frame the paper (not the whole easel and ledge) on portrait phones, and fill at least 85% of the free width. In `regions.ts` take the tolerance in CSS px (16 px) and convert it to picture px. When a tap lands in a large region within 16 CSS px of a small one, prefer the small one if it is still unpainted. |
| C4 | P2 | On phones, "Pictures" and "My gallery" are only in the drawer. After "All done!" there is no visible way to the next picture. A child who cannot read will not find it. | `game-coloring/src/main.ts:67-68,245-251`. No picture button in the tray (`phone-1-blank.png`). | After `celebrate()` in `main.ts:245-251`, show a big "next picture" thumbnail button on the left side. Also add a "Pictures" button to the left tray (`game-coloring/src/game.css:151-171`, `game-coloring/src/ui.ts`). |
| C5 | P3 | Rail title and labels are cut off: "COLORI...", "My gall...", "Downlo...", "New pa...". | `desktop-1-blank.png`. | Kit fix K3 in FIXLIST. |
| C6 | P3 | On phones the drawer button sits between the two tool groups. It works, but it adds a third control column feel and takes picture width. | `phone-1-blank.png`; `game.css:151-171`. | With the kit toggle at top-left (K5), join the two tray groups into one column. |

## Scores

| # | Dimension | Weight | Score | Evidence | Conf |
| --- | --- | --- | --- | --- | --- |
| 1 | Core loop and clarity of goal | 15% | 4 | Tap a space, it fills, with a ripple, splat particles and a pop sound (`main.ts:253-264`). Full picture gives a toast and a wobble (`main.ts:245-251`). Pale paint weakens the reward (C1). | H |
| 2 | Onboarding / first time | 12% | 5 | Ready in 1.0 s. Fill is the default tool. One tap paints. No text needed. | H |
| 3 | Feedback and readability | 12% | 3 | Good: ripple, splat, pentatonic notes on colour pick, undo lights up after a change (`phone-2-painted.png`). Bad: paint colour does not match the swatch (C1), glare (C2). | H |
| 4 | Pacing and session length | 8% | 4 | Free play, no timer. 12 taps finished the rocket. Autosave on change and on page hide (`main.ts:616`). | M |
| 5 | Difficulty and fairness | 10% | 4 | No failure. Undo and redo. Taps on lines snap to a region. Tiny regions on phones are hard (C3). | H |
| 6 | Game feel, juice, controls | 15% | 4 | Fill, brush, sparkle, rainbow, eraser. Pinch zoom and two-finger pan, wheel zoom, recentre. Pen pressure. Keyboard shortcuts (`game-coloring/src/game/tools.ts:85-116`). | M |
| 7 | Replayability and non-manipulative retention | 8% | 4 | Nine pictures, a gallery, PNG download. No streaks, no lock-outs. | H |
| 8 | Accessibility and inclusivity | 10% | 3 | Good: big swatches with a ring for the selection (shape, not only colour), keyboard play, reduced motion stops the wobble (`easel.ts:596`). Bad: small hit areas on phones (C3), cut-off labels, 44 px drawer close. | H |
| 9 | Presentation, art, audio | 6% | 3 | Cosy room, fairy lights, clean line art. Glare and pale paint lower it (C1, C2). Audio not heard. | M |
| 10 | Technical polish | 4% | 4 | CI green: 151 unit, 51 e2e (281.0 s). Ready in 1 s. Flat 2D fallback without WebGL (`main.ts:112-114`). | H |
| | **Weighted overall** | | **3.84** | 0.15x4 + 0.12x5 + 0.12x3 + 0.08x4 + 0.10x4 + 0.15x4 + 0.08x4 + 0.10x3 + 0.06x3 + 0.04x4 | |

## Rule checks

| Check | Result | Evidence |
| --- | --- | --- |
| Privacy (zero external requests, no cookies) | PASS | Coloring `ci:local` and hub `ci:site` request guards passed. Pictures save to `g499:coloring:*`. Download uses a local file link, no network. |
| Menus on the left | PASS | Left rail, left tool tray, palette opens to the right of the tray but on the left half (`desktop-3-palette.png`). |
| Phones first | PARTIAL | Zoom lock (`game-coloring/index.html:7`), pinch handled in the game, 56 px tools. Fails: small picture (C3), 44 px drawer close (kit). |
| Trademarks and likeness | PASS | Generic pictures (dino, rocket, fish, castle, cat, garden, race car, robot, butterfly). The rocket is a generic cartoon rocket. |
| Content safety for kids | PASS | Gentle pictures only. No sharing, no links out. |

## First-run timing

| Step | Phone | Desktop |
| --- | --- | --- |
| Page ready | 999 ms | 967 ms |
| Taps to first paint | 1 | 1 |
| Taps to change colour | 2 (swatch, then colour) | 2, or 1 key (1 to 0) |
| Taps to paint the rocket | 12 | 12 |
| First meaningful action | about 1.1 s plus human reaction | about 1.0 s plus human reaction |

## What works

- First action in about one second, with zero reading. This is the best onboarding of the three.
- The tools are big and clear. The current paint shows in the tray.
- Undo and redo are always there. Nothing a child does is final.
- A flat 2D mode keeps the game usable without WebGL.
- The "All done!" moment is short and kind.

## Comparables (generic)

- Tap-to-fill colouring-book apps for pre-school children.
- Tablet paint apps for kids with sparkle and rainbow brushes.
- Desktop kids' paint programs with big colour buttons.

This build matches them for speed and tools. Those apps show the paint at full strength. Fix C1 to match them.

## UNVERIFIED

- Audio: I heard no sound. The pentatonic colour notes are code only.
- The picture picker, the gallery, the download and the "All done!" moment are not in the screenshots.
- The first-visit default picture. The capture shows the rocket. The code default is the dino (`game-coloring/src/game/scenes.ts:403`). The capture script may have chosen the rocket.
- Pinch zoom on a real phone. CI covers emulation only.
- The cause of C1 is from code reading. Confirm it with the colour test before and after the change.
- The fixes for C1 to C4 are not tested.
