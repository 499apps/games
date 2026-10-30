import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GAMES, gameAriaLabel, indexOfSlug, isPlayable } from './catalog';
import { CSP_CONTENT } from '../kit/csp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const hubHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const privacyHtml = fs.readFileSync(path.join(root, 'privacy', 'index.html'), 'utf8');

describe('catalogue', () => {
  it('has unique slugs that are safe folder names', () => {
    const slugs = GAMES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9][a-z0-9-]*$/);
  });

  it('links playable games under /games/<slug>/ and keeps coming-soon games unlinked', () => {
    for (const g of GAMES) {
      if (g.status === 'ready') expect(g.href).toBe(`/games/${g.slug}/`);
      else expect(g.href).toBeNull();
    }
    expect(GAMES.filter(isPlayable).map((g) => g.slug)).toEqual(['coloring', 'snake']);
  });

  it('finds games by slug', () => {
    expect(indexOfSlug('snake')).toBe(1);
    expect(indexOfSlug('nope')).toBe(-1);
  });

  it('matches the accessible links in index.html, in order', () => {
    const found = [...hubHtml.matchAll(/data-slug="([^"]+)"/g)].map((m) => m[1]);
    expect(found).toEqual(GAMES.map((g) => g.slug));
    for (const g of GAMES) {
      expect(hubHtml).toContain(`aria-label="${gameAriaLabel(g)}"`);
      if (g.href) expect(hubHtml).toContain(`href="${g.href}"`);
    }
  });
});

describe('pages', () => {
  for (const [name, html] of [
    ['index.html', hubHtml],
    ['privacy/index.html', privacyHtml],
  ] as const) {
    it(`${name} carries the CSP, referrer and PWA tags and no Liquid`, () => {
      expect(html).toContain(`content="${CSP_CONTENT}"`);
      expect(html).toContain('<meta name="referrer" content="no-referrer">');
      expect(html).toContain('rel="manifest"');
      expect(html).toContain('rel="apple-touch-icon"');
      expect(html).toContain('name="apple-mobile-web-app-capable"');
      expect(html).toContain('viewport-fit=cover');
      expect(html).not.toContain('user-scalable=no');
      expect(html).not.toContain('{{');
      expect(html).not.toContain('{%');
      expect(html).not.toMatch(/^\s*---/);
      expect(html).not.toMatch(/(src|href)="https?:\/\//);
    });
  }
});

describe('names', () => {
  // The owner renamed the rocket game to "Catch the Booster": no real space-company or vehicle names.
  const banned = /starship|spacex|falcon|mechazilla|super heavy|tesla/i;

  it('uses no real space-company or vehicle names in the catalogue or the hub page', () => {
    for (const g of GAMES) expect(g.title).not.toMatch(banned);
    expect(hubHtml).not.toMatch(banned);
    expect(privacyHtml).not.toMatch(banned);
  });
});