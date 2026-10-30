import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  GAP_X,
  TILE_W,
  computeLayout,
  fitCameraDistance,
  moveSelection,
  type TileSlot,
} from './layout';
import { DIRECTIONS } from '../kit/input';

describe('computeLayout', () => {
  it('puts all tiles in one centred row in landscape', () => {
    const l = computeLayout(3, 16 / 9);
    expect(l.rows).toBe(1);
    expect(l.slots.map((s) => s.y)).toEqual([0, 0, 0]);
    expect(l.slots[1]?.x).toBeCloseTo(0);
    expect(l.slots[0]?.x).toBeCloseTo(-(TILE_W + GAP_X));
    expect(l.centerY).toBe(0);
  });

  it('uses two columns in portrait and centres a lone last tile', () => {
    const l = computeLayout(3, 9 / 19);
    expect(l.columns).toBe(2);
    expect(l.rows).toBe(2);
    expect(l.slots[2]?.x).toBeCloseTo(0);
    expect(l.slots[2]?.row).toBe(1);
    expect(l.centerY).toBeLessThan(0);
  });

  it('keeps every tile inside the reported area (property)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 12 }), fc.double({ min: 0.3, max: 3, noNaN: true }), (n, aspect) => {
        const l = computeLayout(n, aspect);
        expect(l.slots).toHaveLength(n);
        for (const s of l.slots) {
          expect(Math.abs(s.x) + TILE_W / 2).toBeLessThanOrEqual(l.width / 2 + 1e-9);
        }
        const ids = new Set(l.slots.map((s) => `${s.row}:${s.col}`));
        expect(ids.size).toBe(n);
      }),
    );
  });

  it('returns an empty layout for zero tiles', () => {
    expect(computeLayout(0, 1).slots).toEqual([]);
  });
});

describe('fitCameraDistance', () => {
  it('grows when the view gets narrower', () => {
    const wide = fitCameraDistance(10, 3, 40, 16 / 9);
    const narrow = fitCameraDistance(10, 3, 40, 9 / 16);
    expect(narrow).toBeGreaterThan(wide);
  });

  it('fits both width and height (property)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.5, max: 20, noNaN: true }),
        fc.double({ min: 0.5, max: 20, noNaN: true }),
        fc.double({ min: 20, max: 80, noNaN: true }),
        fc.double({ min: 0.3, max: 3, noNaN: true }),
        (w, h, fov, aspect) => {
          const d = fitCameraDistance(w, h, fov, aspect, 1);
          const vHalf = Math.tan((fov * Math.PI) / 360) * d;
          expect(vHalf * 2).toBeGreaterThanOrEqual(h - 1e-6);
          expect(vHalf * 2 * aspect).toBeGreaterThanOrEqual(w - 1e-6);
        },
      ),
    );
  });
});

describe('moveSelection', () => {
  const row = computeLayout(3, 2).slots;
  const grid = computeLayout(3, 0.5).slots;

  it('moves along a row and wraps', () => {
    expect(moveSelection(0, 'right', row)).toBe(1);
    expect(moveSelection(2, 'right', row)).toBe(0);
    expect(moveSelection(0, 'left', row)).toBe(2);
  });

  it('moves between rows in a grid', () => {
    expect(moveSelection(0, 'down', grid)).toBe(2);
    expect(moveSelection(1, 'down', grid)).toBe(2);
    expect(moveSelection(2, 'up', grid)).toBe(0);
    expect(moveSelection(0, 'right', grid)).toBe(1);
  });

  it('always returns a valid index (property)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9 }),
        fc.double({ min: 0.3, max: 3, noNaN: true }),
        fc.array(fc.constantFrom(...DIRECTIONS), { maxLength: 30 }),
        (n, aspect, moves) => {
          const slots: TileSlot[] = computeLayout(n, aspect).slots;
          let i = 0;
          for (const m of moves) {
            i = moveSelection(i, m, slots);
            expect(Number.isInteger(i)).toBe(true);
            expect(i).toBeGreaterThanOrEqual(0);
            expect(i).toBeLessThan(n);
          }
        },
      ),
    );
  });

  it('reaches every tile with right moves alone', () => {
    const seen = new Set<number>();
    let i = 0;
    for (let k = 0; k < 3; k++) {
      seen.add(i);
      i = moveSelection(i, 'right', row);
    }
    expect(seen.size).toBe(3);
  });
});
