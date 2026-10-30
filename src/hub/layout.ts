/**
 * Hub tile layout (pure). Landscape: one row on one shelf. Portrait: two columns, rows of
 * shelves. Also camera fitting and arrow-key / gamepad selection moves.
 */
import type { Direction } from '../kit/input';

export const TILE_W = 2.4;
export const TILE_H = 3.0;
export const GAP_X = 0.8;
export const ROW_H = 4.4;

export interface TileSlot {
  index: number;
  row: number;
  col: number;
  x: number;
  y: number;
}

export interface HubLayout {
  slots: TileSlot[];
  columns: number;
  rows: number;
  /** Width and height of the area covered by all tiles (world units). */
  width: number;
  height: number;
  /** Vertical centre of the tile area. */
  centerY: number;
}

/** Aspect ratios at or above this use one row. */
export const LANDSCAPE_ASPECT = 1.05;

export function computeLayout(count: number, aspect: number): HubLayout {
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return { slots: [], columns: 0, rows: 0, width: 0, height: 0, centerY: 0 };
  const columns = aspect >= LANDSCAPE_ASPECT ? n : Math.min(2, n);
  const rows = Math.ceil(n / columns);
  const slots: TileSlot[] = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / columns);
    const col = i % columns;
    const inRow = Math.min(columns, n - row * columns);
    slots.push({
      index: i,
      row,
      col,
      x: (col - (inRow - 1) / 2) * (TILE_W + GAP_X),
      y: 0 - row * ROW_H, // 0 - x avoids -0 on the first row
    });
  }
  const width = columns * TILE_W + (columns - 1) * GAP_X;
  const height = rows * TILE_H + (rows - 1) * (ROW_H - TILE_H);
  return { slots, columns, rows, width, height, centerY: (0 - (rows - 1) * ROW_H) / 2 };
}

/**
 * Camera distance so that a width x height area fits the view with a margin.
 * fovDeg is the vertical field of view.
 */
export function fitCameraDistance(
  width: number,
  height: number,
  fovDeg: number,
  aspect: number,
  margin = 1.15,
): number {
  const vFov = (Math.max(1, Math.min(170, fovDeg)) * Math.PI) / 180;
  const safeAspect = Math.max(0.05, aspect);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * safeAspect);
  const dH = (Math.max(0, height) * margin) / 2 / Math.tan(vFov / 2);
  const dW = (Math.max(0, width) * margin) / 2 / Math.tan(hFov / 2);
  return Math.max(dH, dW, 1);
}

/**
 * Move the selection one step. Picks the nearest slot in that direction; when there is none,
 * wraps through the list in reading order (right/down = next, left/up = previous).
 */
export function moveSelection(index: number, dir: Direction, slots: readonly TileSlot[]): number {
  const n = slots.length;
  if (n === 0) return 0;
  const cur = slots[((index % n) + n) % n] as TileSlot;
  const eps = 1e-6;
  let best: TileSlot | null = null;
  let bestScore = Infinity;
  for (const s of slots) {
    if (s.index === cur.index) continue;
    const dx = s.x - cur.x;
    const dy = s.y - cur.y;
    let primary = 0;
    let secondary = 0;
    switch (dir) {
      case 'right':
        primary = dx;
        secondary = dy;
        break;
      case 'left':
        primary = -dx;
        secondary = dy;
        break;
      case 'up':
        primary = dy;
        secondary = dx;
        break;
      case 'down':
        primary = -dy;
        secondary = dx;
        break;
    }
    if (primary <= eps) continue;
    const score = primary + 2 * Math.abs(secondary);
    if (score < bestScore - eps || (Math.abs(score - bestScore) <= eps && best && s.index < best.index)) {
      best = s;
      bestScore = score;
    }
  }
  if (best) return best.index;
  const step = dir === 'right' || dir === 'down' ? 1 : -1;
  return (((cur.index + step) % n) + n) % n;
}
