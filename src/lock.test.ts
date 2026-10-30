import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  expectedRepo,
  isPinnedRef,
  siblingDirName,
  updateLockRefs,
  validateLock,
  type GamesLock,
} from '../scripts/lib/lock.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const realLock = JSON.parse(fs.readFileSync(path.join(root, 'games.lock.json'), 'utf8')) as GamesLock;

describe('games.lock.json', () => {
  it('is valid and lists every published game', () => {
    expect(validateLock(realLock)).toEqual([]);
    expect(realLock.games.map((g) => g.slug).sort()).toEqual(['catch-the-booster', 'coloring', 'moon-touchdown', 'snake']);
  });

  it('points every game at its 499apps repo and sibling folder', () => {
    for (const g of realLock.games) {
      expect(g.repo).toBe(expectedRepo(g.slug));
      expect(siblingDirName(g.slug)).toBe(`game-${g.slug}`);
    }
  });
});

describe('validateLock', () => {
  const good: GamesLock = {
    games: [{ slug: 'snake', repo: expectedRepo('snake'), ref: 'a'.repeat(40) }],
  };

  it('accepts a good lock', () => {
    expect(validateLock(good)).toEqual([]);
  });

  it('rejects bad shapes, slugs, repos and refs', () => {
    expect(validateLock(null)).toHaveLength(1);
    expect(validateLock({ games: 'x' })).toHaveLength(1);
    expect(validateLock({ games: [{ slug: 'Bad Slug', repo: '', ref: 'main' }] })).not.toEqual([]);
    expect(validateLock({ games: [{ slug: 'privacy', repo: expectedRepo('privacy'), ref: 'main' }] })).not.toEqual([]);
    expect(validateLock({ games: [{ slug: 'snake', repo: 'https://example.com/x.git', ref: 'main' }] })).not.toEqual([]);
    expect(validateLock({ games: [{ slug: 'snake', repo: expectedRepo('snake'), ref: '-x' }] })).not.toEqual([]);
    expect(validateLock({ games: [{ slug: 'snake', repo: expectedRepo('snake'), ref: 'a..b' }] })).not.toEqual([]);
    expect(validateLock({ games: [...good.games, ...good.games] })).not.toEqual([]);
  });
});

describe('isPinnedRef', () => {
  it('accepts full shas and version tags only', () => {
    expect(isPinnedRef('0123456789abcdef0123456789abcdef01234567')).toBe(true);
    expect(isPinnedRef('v1.2.0')).toBe(true);
    expect(isPinnedRef('main')).toBe(false);
    expect(isPinnedRef('0123abc')).toBe(false);
  });
});

describe('updateLockRefs', () => {
  it('changes only the given slugs and never mutates the input (property)', () => {
    fc.assert(
      fc.property(fc.hexaString({ minLength: 40, maxLength: 40 }), (sha) => {
        const lock: GamesLock = {
          games: [
            { slug: 'snake', repo: expectedRepo('snake'), ref: 'main' },
            { slug: 'coloring', repo: expectedRepo('coloring'), ref: 'main' },
          ],
        };
        const before = JSON.stringify(lock);
        const next = updateLockRefs(lock, { snake: sha });
        expect(JSON.stringify(lock)).toBe(before);
        expect(next.games[0]?.ref).toBe(sha);
        expect(next.games[1]?.ref).toBe('main');
        expect(validateLock(next)).toEqual([]);
      }),
    );
  });
});
