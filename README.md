# 499apps Games

The hub of **499apps Games**: free, privacy-first 3D games for kids of all ages.
It is at `https://499apps.com/games/`.

This repo holds:

- The hub page (`/games/`): a 3D toy shelf with a cartridge for each game.
- The privacy page for parents (`/games/privacy/`).
- The plan: [`docs/PLAN.md`](docs/PLAN.md).
- The assembly scripts that build the whole site with one service worker.

## The privacy promise

- We collect nothing. No accounts, ads, analytics, cookies or trackers.
- After the page loads, the games make no network calls and link to no other site.
- Settings and scores stay on your device, in `localStorage` keys that start with `g499:`.
- "Clear my data" (hold the button) removes all of them.
- After the first visit, everything works offline.

## Run it

Use Node 20.19 or later and pnpm 10.

```sh
pnpm install
pnpm exec playwright install chromium firefox webkit   # once, for the smoke tests
pnpm dev            # http://localhost:5173/games/
pnpm build          # dist/ with icons and the service worker
pnpm preview        # http://localhost:4173/games/
pnpm ci:local       # typecheck, lint, unit tests, scan:secrets, build, smoke tests
```

## Build the whole site

The games live in sibling repos (`../game-snake`, `../game-coloring`).
`games.lock.json` pins each game to a commit.

```sh
pnpm assemble:lock  # pin each game to the HEAD of its sibling folder
pnpm assemble       # build hub + games into site/games/ with one service worker
pnpm ci:site        # assemble, then run the smoke suite on site/
```

## Publish

1. Run `pnpm ci:site`. It must pass.
2. Copy `site/games/` into the 499apps.com repo as `games/`.
3. Open a pull request there, review it and merge it.

There are no GitHub Actions. All CI is local.

## Shared kit

`src/kit/` is a vendored copy of `499apps/games-kit`. Do not edit it here.
Change the kit in its own repo, then run `pnpm kit:sync` and commit the result.

## Licence

MIT. See `LICENSE`. Third-party packages are in `LICENSES.md`.
