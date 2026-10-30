/**
 * The game catalogue shown on the hub. Pure data: the 3D scene, the DOM links and the tests
 * all read from here. Keep it in the same order as the links in index.html.
 */
import { HUB_BASE } from '../kit/csp';
import type { IconName } from '../kit/icons';
import { palette } from '../kit/theme';

export type GameStatus = 'ready' | 'soon';
export type PreviewKind = 'coloring' | 'snake' | 'rocket';

export interface GameEntry {
  slug: string;
  title: string;
  /** Null for games that are not playable yet. */
  href: string | null;
  status: GameStatus;
  /** Cartridge body colour. */
  color: string;
  /** Glow colour (screen, light strip, particles). */
  accent: string;
  icon: IconName;
  preview: PreviewKind;
}

export const GAMES: readonly GameEntry[] = [
  {
    slug: 'coloring',
    title: 'Coloring',
    href: `${HUB_BASE}coloring/`,
    status: 'ready',
    color: palette.sky,
    accent: palette.lemon,
    icon: 'palette',
    preview: 'coloring',
  },
  {
    slug: 'snake',
    title: 'Snake',
    href: `${HUB_BASE}snake/`,
    status: 'ready',
    color: palette.lime,
    accent: palette.mint,
    icon: 'snake',
    preview: 'snake',
  },
  {
    slug: 'catch-the-booster',
    title: 'Catch the Booster',
    href: null,
    status: 'soon',
    color: palette.lavender,
    accent: palette.bubblegum,
    icon: 'rocket',
    preview: 'rocket',
  },
];

export function isPlayable(g: GameEntry): boolean {
  return g.status === 'ready' && g.href !== null;
}

/** Accessible name of a tile link. */
export function gameAriaLabel(g: GameEntry): string {
  return isPlayable(g) ? `Play ${g.title}` : `${g.title}: coming soon`;
}

export function indexOfSlug(slug: string, games: readonly GameEntry[] = GAMES): number {
  return games.findIndex((g) => g.slug === slug);
}
