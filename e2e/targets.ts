import type { PlayScript, SmokeTarget } from '../src/kit/smoke/suite';

const HUB_MANIFEST = { scope: '/games/', startUrl: '/games/' };

/** The hub never opens a game in the scripted round: only move the selection. */
export const HUB_PLAY: PlayScript = {
  keys: ['ArrowRight', 'ArrowRight', 'ArrowLeft'],
  swipes: ['left', 'right'],
  tap: false,
};

/** A short round for any game: steer, then press the main action. */
export const GAME_PLAY: PlayScript = {
  keys: ['ArrowRight', 'ArrowUp', 'Space'],
  swipes: ['left', 'up'],
  tap: true,
};

export function hubTargets(prefix = ''): SmokeTarget[] {
  return [
    {
      name: `${prefix}hub`,
      path: '/games/',
      webgl: true,
      swScope: '/games/',
      manifest: HUB_MANIFEST,
      play: HUB_PLAY,
      clearSelector: '[data-menu-id="clear"]',
    },
    {
      name: `${prefix}privacy`,
      path: '/games/privacy/',
      webgl: false,
      swScope: '/games/',
      manifest: HUB_MANIFEST,
      clearSelector: '#clear-data',
    },
  ];
}

/**
 * Games with their own engine and UI instead of the kit, mapped to their ?test=1 window hook.
 * The site suite checks only their hub integration (e2e/own-engine.ts); each game's own repo
 * runs its full suite (menu, play, privacy, offline, visuals) in all 5 projects.
 */
export const OWN_ENGINE_GAMES: ReadonlyMap<string, string> = new Map([
  ['catch-the-booster', '__catch'],
]);

/** Games inside the assembled site: one /games/ worker and the hub manifest. */
export function assembledGameTarget(slug: string): SmokeTarget {
  return {
    name: `site-${slug}`,
    path: `/games/${slug}/`,
    webgl: true,
    swScope: '/games/',
    manifest: HUB_MANIFEST,
    play: GAME_PLAY,
  };
}
