# FIXLIST: rubric pass 2026-10-30

Source: `hub-review.md`, `snake-review.md`, `coloring-review.md` in this folder.

g7 re-check (2026-10-30, games-kit 94bac65, game-snake ba4913f, game-coloring 25759fc, games 0599f35): a tick means the fix is verified in the code and, where possible, in the new real-GPU shots. An item that g6 ticked but g7 found only partly fixed is unticked again, with the reason. New work is in "g7 open items" at the end.

This list holds every P0, P1 and P2 finding and every rubric dimension below 4. P3 items are at the end. No P0 was found.

Severity: P0 blocks release. P1 fix before ship. P2 fix soon after, or before ship if cheap. P3 polish.

Paths start at the workspace root. Make kit changes in `games-kit/src/`. Then run `pnpm kit:sync` in `games/`, `game-snake/` and `game-coloring/`.

## Order of work

```text
K1 + K2 (kit look gate)  -->  H1, S1, S2, S3, C1, C2 (tune per page, check with K2)
K5 (toggle top-left)     -->  S4, C3, C6 (use the freed width)
K6 + K7 (perf)           -->  H2 (measure again)
```

## Kit (`games-kit/src/`, then `kit:sync` in every repo)

g7: K1 to K8 are verified in code: `theme.ts:42,48,51-52,58`, `scene-helpers.ts:81`, `styles.css:170-175,229-236,314,380-381`, `quality.ts:135`, `renderer.ts:57,154`. K3 to K5 are also visible in the new shots.

- [x] **K1 (P1) Lower the default light and bloom, so lit pastel surfaces do not clip to white.** Fixes part of H1, S2, C2.
  - `games-kit/src/theme.ts:47-51`: `fillIntensity` 28 to 14, `keyIntensity` 2.8 to 2.4, `exposure` 1.05 to 0.95, `bloom` to `{ strength: 0.4, radius: 0.45, threshold: 1.0 }`.
  - `games-kit/src/scene-helpers.ts:80`: default `sheen` 0.25 to 0. (Sheen adds a white rim and costs GPU time.)
  - Update `games/docs/PLAN.md:219` (the threshold value).
  - CAUTION: this changes every visual baseline. Check the new images, then update the baselines on purpose.
- [x] **K2 (P1) Add a "look" gate at the high tier.** CI baselines run at `low` on software GL (`games-kit/src/quality.ts:114`), so bloom never shows in CI. This is why the wash-out passed.
  - `games-kit/src/renderer.ts:58-62,266-290`: add `clipped` to `PixelSample`: the share of sampled pixels with min(R, G, B) >= 240.
  - `games-kit/src/smoke/suite.ts`: add a desktop-Chromium test per page. Open `?test=1&tier=high`, step 2 frames, call `sample()`, and assert `clipped` is below a per-page budget (start at 3%; Coloring may exclude the paper rectangle). Add one `toHaveScreenshot` at `tier=high`.
  - Done: pure `games-kit/src/pixels.ts` (`analysePixels`, unit tested). Two tests per 3D page: software GL in the shards, and the host GPU in the quiet frame-time pass. Coloring leaves out the paper via `window.__g499.clipExclude`. No high-tier `toHaveScreenshot` (operator decision: GPU-dependent pixels are flaky; the clipped-share assert is the gate).
  - g7: verified (`games-kit/src/smoke/suite.ts:205-248`). Gap: it counts only near-white pixels, so milky pastels pass. See K9.
- [x] **K3 (P2) Stop cutting off rail labels.** Dimension 8 in all three games.
  - `games-kit/src/styles.css:221-227`: `white-space: normal; line-height: 1.05;` and clamp to 2 lines. Same for `.g499-rail-title` at `styles.css:160-172`.
  - `games-kit/src/theme.ts:57`: `railWidth` 72 to 80.
  - `games-kit/src/shell.ts`: labels "Sound", "Full screen", "Clear data".
- [x] **K4 (P2) Make the drawer close button 56 px.** `games-kit/src/styles.css:369-370`: use `var(--g499-touch)`.
- [x] **K5 (P2) Put the phone drawer button top-left on every page.** It is mid-left on the hub and games and top-left on the privacy page.
  - `games-kit/src/styles.css:304`: `top: calc(10px + var(--g499-safe-top));`.
  - Then use the freed width: S4 (Snake) and C3, C6 (Coloring).
- [x] **K6 (P1, part of H2) Drop the tier faster on slow frames.** `games-kit/src/quality.ts:163`: window 60 to 30 frames (or a 0.75 s time window). Update `games-kit/src/quality.test.ts`.
- [x] **K7 (P1, part of H2) Measure frame time on a quiet GPU.** `games-kit/src/smoke/suite.ts:188-220`: run the frame-time test in its own step after the parallel shards (one worker). Write this in `games/docs/PLAN.md` section 10.
  - Already in place: `games-kit/src/scripts/run-e2e.mjs` runs the frame-time tests alone after the shards. The failure came from another project's Playwright run and a screen saver on the same GPU. Note added to PLAN.md section 10. Budget stays 20 ms.
  - g7: verified. The pass is alone inside one project, but other processes can still share the GPU. The median is also quantised to vsync (16.7 or 33.3 ms). See K10.
- [x] **K8 (P1, needed by C1) Add a tone-mapping option.** `games-kit/src/renderer.ts:43-56,156`: add `toneMapping?: THREE.ToneMapping` to `KitRendererOptions`, default `ACESFilmicToneMapping`.

## Hub (`games/`)

- [ ] **H1 (P1) Tiles are blown out (Coloring tile almost white, Snake tile pale).** Dimensions 3 and 9.
  - `games/src/hub/main.ts:31-38`: `renderer: { fov: 38, exposure: 0.95, bloom: { strength: 0.4, radius: 0.45, threshold: 1.15 } }`.
  - `games/src/hub/scene.ts:241`: shell `clearcoat` 0.6, `envMapIntensity` 0.45; mix the shell colour 12% toward `palette.night`.
  - `games/src/hub/scene.ts:650`: `2.4 * rig.sel` to `1.0 * rig.sel`.
  - Check with K2. Budget: `clipped` below 3% on the landing page.
  - Done, plus the marquee bar emissive 1.1 to 0.6 and the bulbs a little lower.
  - g7: PARTLY. The shells are fixed (`scene.ts:47,244-247,664`). The previews inside the tiles are still milky on the real GPU (`shots/hub/desktop-1-landing.png`). Now P2. See H1b in "g7 open items".
- [ ] **H2 (P1) Frame time 33.3 ms on Intel UHD (budget 20 ms).** Dimension 10.
  - [x] K1 (sheen 0), K6, K7.
  - [x] `games/src/hub/scene.ts`: set `kit.renderer.shadowMap.autoUpdate = false`. Set `kit.renderer.shadowMap.needsUpdate = true` on layout, on selection change and every 4th frame. (Also at once when a tier change drops the shadow map.)
  - [x] Measure again on the same host with a quiet GPU. Write the result in `hub-review.md`. (Done in g7: 16.7 ms on a quiet GPU; 33.3 ms with the GPU shared, in `ci:local` and `ci:site`.)
  - g7: PARTLY. Still fails when the GPU is shared; Snake and Coloring pass in the same pass. Now P2. See H2-g7 in "g7 open items".
- [x] **H3 (P2) The coming-soon tile used a real space company's vehicle name.** Decided by the owner: the game is called "Catch the Booster", with no space-company names or trade dress.
  - g7: verified (`games/src/hub/catalog.ts:49`, `catalog.test.ts:63-67`, pill "Booster" in the landing shots).
  - [x] `games/src/hub/catalog.ts` title is "Catch the Booster". The `games/index.html` tile says "Booster". Slug `catch-the-booster` is unchanged.
  - [x] `games/docs/PLAN.md`: section, design-doc name and plan entry renamed. Arms are now "padded catcher arms".
  - [x] `src/hub/catalog.test.ts` "names" test: the catalogue, the hub page and the privacy page contain no real space-company or vehicle names.
- [x] **H4 (P2) Rail labels cut off.** See K3. g7: verified in `desktop-1-landing.png`.
- [x] **H5 (P2) Drawer close 44 px.** See K4. g7: verified in code (`games-kit/src/styles.css:380-381`).
- [x] **Dimension 8 (3/5) Accessibility.** Covered by H1, K3, K4, K5. (Phone title now clears the top-left button on both sides.) g7: now 4/5.
- [ ] **Dimension 9 (3/5) Presentation.** Covered by H1. g7: still 3/5. The tile art does not read well on the real GPU (milky previews, hard marquee bar). See H1b, H9.
- [ ] **Dimension 10 (3/5) Technical polish.** Covered by H2. g7: still 3/5. The frame time fails when the GPU is shared. See H2-g7, K10.
- [ ] **Dimension 3 (3/5) Feedback.** g7: still 3/5. The selected Coloring tile shows a near-white palette on a pale yellow screen. See H1b.

## Snake (`game-snake/`)

- [x] **S1 (P1) The meal flash turns the whole board mint and hides the snake and food.** Dimension 3.
  - `game-snake/src/game/board.ts:142-144`: grid colour `0.35 + 0.55 * glow`, so the rest value stays below the bloom threshold.
  - Flash the rim and a small ring at the eaten cell, not the full grid.
  - `game-snake/src/scene.ts:496`: cap the bloom pulse at x1.15.
  - g7: verified (`game-snake/src/game/glow.ts:10-31`; no wash in `shots/snake/phone-2-early.png`).
- [ ] **S2 (P2) Pale snake on a pink-lavender board on phones.** Dimensions 3, 8, 9.
  - K1.
  - `game-snake/src/scene.ts:131-136`: after `addStudioLights`, set `lights.fill.intensity = 10`.
  - `game-snake/src/game/board.ts:46-51`: tile `envMapIntensity` 0.2, `roughness` 0.6.
  - Check with K2. The board should read deep indigo, as `board.ts:4` says.
  - g7: PARTLY. The board now reads blue-violet. The body still reads pale mint in every shot and in the CI baseline. See S2-g7.
- [x] **S3 (P2) Gem food renders as a white blob.** Dimension 3.
  - `game-snake/src/game/food.ts:67-77`: emissive 0.2, `envMapIntensity` 0.6, colour `#3d8bfd`.
  - g7: verified for the gem (`phone-3-midgame.png`). The berry is now a white blob: see S10.
- [x] **S4 (P2) Board only about 72% of the phone width; about 160 CSS px empty above the d-pad.** Dimension 8. g7: verified, about 90% (`phone-1-ready.png`).
  - K5.
  - `game-snake/src/main.ts:274-278`: skip the toggle inset in portrait.
  - `game-snake/src/game/framing.ts`: use the free height; target 90% or more of the width. Update `framing.test.ts`.
- [x] **S5 (P2) First-run default is Normal (walls end the round); Easy is hidden in the drawer on phones.** Dimensions 5 and 8.
  - `game-snake/src/main.ts:63-66`: with no stored mode, start in `'easy'`.
  - `game-snake/src/game.css:106-119` and `game-snake/index.html`: make the start-screen mode badge a 56 px button that cycles the mode.
  - g7: verified (`game-snake/src/logic.ts:81`, `index.html:42`, `phone-1-ready.png`).
- [x] **Dimension 7 (3/5) Replayability.** Low variety (S8, P3). Optional seeded "garden" boards with soft bushes. Keep calm, no timers.
  - Done: "Garden" in the left menu (off by default, `g499:snake:garden`). 6 seeded bushes, clear of the edges, the start rows and each other. A bush bump is a gentle stop. Own best score per mode. Property tests in `logic.test.ts`.
  - g7: verified in code; now 4/5. Garden is not in a shot.
- [x] **Dimension 8 (3/5) Accessibility.** Covered by S1, S2, S4, S5, K3, K4. g7: now 4/5.
- [ ] **Dimension 9 (3/5) Presentation.** Covered by S1, S2, S3. g7: still 3/5 on the real-GPU shots (white rim, pale body, white berry). See S9, S2-g7, S10.
- [ ] **Dimension 3 (3/5) Feedback.** g7: still 3/5 for the same three reasons.

## Coloring (`game-coloring/`)

- [x] **C1 (P1) Painted colours are paler than the swatches.** Dimensions 3 and 9.
  - K8.
  - `game-coloring/src/main.ts:103`: `renderer: { bloom: COLORING_BLOOM, toneMapping: THREE.NeutralToneMapping }`.
  - `game-coloring/src/easel.ts:42-43`: raise `CANVAS_DIFFUSE` and `CANVAS_GLOW` until white paper samples at about 242 (sRGB), not 255.
  - New e2e test in `game-coloring/e2e/`: at `?tier=high`, fill a region with Red, sample it, and check the colour difference to `#ff4f5e` (deltaE below 8).
  - Done: diffuse 0.3, glow 0.9 (estimated from the light recipe, not measured: tune `CANVAS_GLOW` if the e2e deltaE fails). Bloom threshold 1.25 to 1.5 so the brighter paper never blooms. Pure `game/color-diff.ts` (CIE76) with unit tests.
  - g7: verified. Lambert paper (`game-coloring/src/easel.ts:206-213`), deltaE 6.32 (was 30.8), true colours in `phone-2-painted.png` and `desktop-2-painted.png`.
- [x] **C2 (P2) White halo around the frame; glowing window next to the tools.** Dimension 9.
  - `game-coloring/src/easel.ts:300-305`: `sheen: 0`, `clearcoat: 0.3`, `envMapIntensity: 0.25`.
  - `game-coloring/src/easel.ts:357-365`: use `matteMaterial` for the window frame and bars.
  - g7: verified (`easel.ts:302-320,364`; no halo in `desktop-1-blank.png`).
- [x] **C3 (P2) Picture too small on phones; small regions hard to hit.** Dimension 8.
  - K5.
  - `game-coloring/src/game/fit.ts`: on portrait phones, frame the paper, not the whole easel; fill 85% or more of the free width. Update `fit.test.ts`.
  - `game-coloring/src/game/regions.ts:124`: take the tolerance in CSS px (16 px) and convert to picture px. Prefer a small unpainted region within the tolerance over a large one. Add a property test in `regions.test.ts`.
  - g7: verified. Paper about 87% of the free width (`phone-1-blank.png`). Tolerance in `regions.ts:151,159` and `main.ts:284`.
- [x] **C4 (P2) No visible way to the next picture on phones.** Dimension 7 support.
  - `game-coloring/src/main.ts:245-251`: after `celebrate()`, show a big "next picture" thumbnail button on the left.
  - `game-coloring/src/ui.ts` and `game-coloring/src/game.css:151-171`: add a "Pictures" button to the left tray.
  - Done: the next picture is the next one without saved paint (`nextSceneId`, unit tested). The button sits bottom-left, right of the tray.
  - g7: Pictures button verified in the shots. The next-picture button is verified in code only (`scenes.ts:418`).
- [x] **Dimension 3 (3/5) Feedback.** Covered by C1, C2. g7: now 4/5.
- [x] **Dimension 8 (3/5) Accessibility.** Covered by C3, K3, K4. g7: now 4/5.
- [x] **Dimension 9 (3/5) Presentation.** Covered by C1, C2. g7: now 4/5 on the real-GPU shots.

## P3 (polish, not required for ship)

- [x] H6: same drawer button position on every page (done by K5; the privacy page override is removed).
- [ ] H7: in portrait, scale "soon" tiles to 0.75 (`games/src/hub/layout.ts`). Not done (P3). g7: still open, the locked tile has its own row in `phone-1-landing.png`.
- [x] H8: write why the CSP has no `frame-ancestors` (`games/docs/PLAN.md` section 4). Test: `games-kit/src/csp.test.ts`.
- [ ] S6: first-round ghost-finger swipe cue (`game-snake/src/main.ts`), skipped with reduced motion. Not done (P3).
- [x] S7, C5: cut-off labels (done by K3; the Snake d-pad label is now "D-pad").
- [x] C6: one tray column on phones after K5 (`game-coloring/src/game.css:151-171`).
- [x] Docs: `games/docs/PLAN.md:204` says Snake is lime; the code uses `#2fc45a` (`game-snake/src/scene.ts:51-55`). Update the table.

## g7 open items

These items keep a score below 4/5, or they are new from g7. Details and evidence are in the "Re-score after fixes (g6)" section of each review. No P0 or P1 is open.

### Kit (`games-kit/src/`, then `kit:sync` in every repo)

- [ ] **K9 (P2) The look gate misses milky colours.** It counts only pixels with min(R, G, B) >= 240 (`games-kit/src/pixels.ts:5`). The hub previews and the Snake body are pale but below 240, so they pass.
  - Move `game-coloring/src/game/color-diff.ts` (CIE76) to `games-kit/src/color-diff.ts`. Keep its unit tests.
  - In `games-kit/src/smoke/suite.ts` add an optional per-page `colorProbes` list to `SmokeTarget`: `{ name, at: () => {x, y} via window.__g499, expect: '#rrggbb', maxDeltaE }`. Run it in the two look-gate tests (`suite.ts:205-248`).
  - Probes: Snake head `#2fc45a` (max 15), Snake rim hue, hub Coloring palette dab `palette.coral` (max 15). Coloring already has its C1 test.
- [ ] **K10 (P2) The frame-time test cannot show headroom.** The median is 16.7 or 33.3 ms (vsync steps).
  - In `games-kit/src/renderer.ts` time each `render()` call with `performance.now()` and expose the last 120 values through the test API (`games-kit/src/test-mode.ts`).
  - In `games-kit/src/smoke/suite.ts:250-282` report the CPU render median and the p90 frame time in the annotation. Assert the CPU render median is at most 8 ms.
- [ ] **K11 (P2, for H2-g7) Cheaper materials at tier low.** In `games-kit/src/scene-helpers.ts:78-83` let `candyMaterial` use `clearcoat: 0` when the kit runs at tier low. Set the flag from `games-kit/src/quality.ts` on each tier change, and update existing materials when the tier changes.

### Hub (`games/`)

- [ ] **H1b (P2) Previews inside the tiles are milky.** Dimensions 3 and 9.
  - `games/src/hub/main.ts:38`: add `toneMapping: THREE.NeutralToneMapping`.
  - `games/src/hub/scene.ts`: every preview material `clearcoat: 0.3`, `envMapIntensity: 0.35`. Palette board `mixHex(palette.cream, palette.tangerine, 0.3)` (`scene.ts:71`). Snake preview body `#2fc45a` (`scene.ts:133`).
  - `games/src/hub/scene.ts:662-663`: screen glow `0.14 + 0.15 * rig.sel + pulse`, pulse amplitude 0.05.
  - Check with K9.
- [ ] **H2-g7 (P2) Frame time fails when the GPU is shared.** Dimension 10.
  - K10 and K11.
  - `games/src/hub/scene.ts:420-434`: draw the 14 bulbs as one `InstancedMesh` with `instanceColor`; scale each colour for the pulse.
  - Measure again with K10. Target: CPU render median at most 8 ms, frame-time median at most 20 ms with another Playwright run on the GPU.
- [ ] **H9 (P3) Marquee bar glows hard.** `games/src/hub/scene.ts:409-416`: colour `mixHex(palette.lemon, palette.tangerine, 0.4)`, `emissiveIntensity: 0.3`, `clearcoat: 0.3`.
- [ ] **H10 (P3) Personal initials in a test comment.** `games/src/hub/catalog.test.ts:64`: write "The owner renamed ...". The g5 text of `hub-review.md:26` has the same initials; change it only if the owner accepts an edit to the g5 text.

### Snake (`game-snake/`)

- [ ] **S9 (P2) White neon rim hides the mode colour.** Dimensions 3, 8 and 9.
  - `game-snake/src/game/glow.ts:24`: `0.1 + 0.15 * glow + 0.45 * flash`. Update `glow.test.ts`.
  - `game-snake/src/game/board.ts:152`: `mixHex(palette.sky, palette.night, 0.25)` and `mixHex(palette.bubblegum, palette.night, 0.2)`.
  - `game-snake/src/game/board.ts:101-105`: add `clearcoat: 0.4`, then set `envMapIntensity = 0.35`.
  - Check with a K9 rim-hue probe.
- [ ] **S2-g7 (P2) Body reads pale mint.** Dimensions 3 and 9.
  - `game-snake/src/scene.ts:143`: also set `lights.hemi.intensity = 0.7`.
  - `game-snake/src/scene.ts:185-187` and `207-209`: clearcoat 0.5, `envMapIntensity` 0.3.
  - Check with a K9 head probe (`#2fc45a`, deltaE below 15).
- [ ] **S10 (P2) Berry reads as a white blob.** Dimension 3.
  - `game-snake/src/game/food.ts:16,89`: colour `#8f5bf0`, `emissiveIntensity: 0.15`, `envMapIntensity: 0.5`.

### Coloring (`game-coloring/`)

All dimensions are 4/5 or more. Polish only:

- [ ] **C7 (P3) Paint lighter at the paper edges.** `game-coloring/src/easel.ts:44-45`: try `CANVAS_DIFFUSE = 0.15`, `CANVAS_GLOW = 1.0`. Keep the C1 deltaE below 8.
- [ ] **C8 (P3) The palette scrim dims the current-colour swatch.** `game-coloring/src/game.css`: put the current-colour swatch above the scrim, or keep the tray out of the scrim.

### Order of work (g7)

```text
K9 (colour probes) + K10 (render timing)  -->  H1b, S9, S2-g7, S10 (tune, check with K9)
K11 (cheap materials) + bulbs instancing  -->  H2-g7 (measure with K10)
H9, H10, C7, C8, H7, S6                   -->  any time
```

## Operator commands after the fixes

Run in each folder, in this order:

1. `games-kit/`: `pnpm ci:local`
2. `game-snake/`, `game-coloring/`, `games/`: `pnpm kit:sync`, then `pnpm ci:local`
3. `games/`: `pnpm assemble:lock`, then `pnpm ci:site`
4. Take the walkthrough screenshots again on the real GPU. Compare them with `shots/`.
