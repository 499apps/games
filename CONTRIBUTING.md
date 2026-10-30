# Contributing

Thank you for your help. Read these rules before you open a pull request.

## Local CI only

- This project has no GitHub Actions. Do not add a `.github/workflows` folder.
- Run `pnpm ci:local` before you open a pull request. It must pass.
- If you change the assembly or a game pin, also run `pnpm ci:site`.
- New visual baselines: run `pnpm e2e:update`, check the images, and commit them.

## Clean-room and licensing

- Write original code for public game mechanics. Do not copy code, sprites, sounds or ROMs.
- Do not use trademarked names, logos or brand trade dress. Use generic names.
- Third-party code must be MIT, CC0, OFL or Apache-2.0. Assets must be CC0 or MIT.
- List every bundled package or asset in `LICENSES.md`.

## Privacy rules

- No network requests after load. No `fetch`, XHR, WebSocket or beacon calls.
  The service worker precache of same-origin files is the only exception.
- No analytics, cookies, ads, accounts, fingerprinting or external links.
- Store data in `localStorage` only, through the kit storage. Every key starts with `g499:`.
- Keep the Content-Security-Policy meta tag on every page. No inline scripts, no `'unsafe-eval'`.
- Do not commit secrets, personal e-mail addresses or absolute user paths. `pnpm scan:secrets` checks this.

## Jekyll safety

The site is published into a GitHub Pages repo that runs Jekyll.

- No output file or folder may start with `_` or `.`.
- No HTML may start with `---` or contain `{{` or `{%`.
- No `CNAME` file.

## Design rule: menus on the left

- All menus and settings go in the left rail (tablet and desktop).
- On phones, the rail becomes a left drawer. A left-edge button opens it.
- Never put menus top-right or on the right side.

## Shared kit

- `src/kit/` is vendored from `499apps/games-kit`. Do not edit it here.
- Change the kit in its repo, run `pnpm kit:sync` here, and commit `src/kit/` and `kit.lock`.

## Code style

- TypeScript strict mode. Prettier formats the code (`pnpm format`).
- Keep logic in pure modules with Vitest tests. Randomness goes through the kit PRNG.
