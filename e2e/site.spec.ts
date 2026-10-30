import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { defineSmokeSuite } from '../src/kit/smoke/suite';
import { checkHtmlForLiquid, checkOutputNames } from '../src/kit/scripts/lib/precache.mjs';
import { assembledGameTarget, hubTargets } from './targets';

const here = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(here, '..', 'site');
const lock = JSON.parse(fs.readFileSync(path.resolve(here, '..', 'games.lock.json'), 'utf8')) as {
  games: Array<{ slug: string }>;
};
const slugs = lock.games.map((g) => g.slug);

const [hub, privacy] = hubTargets('site-');
if (!hub || !privacy) throw new Error('hub targets missing');

defineSmokeSuite([
  {
    ...hub,
    // One worker for everything: after the first hub visit, every page works offline.
    offlineAlso: ['/games/privacy/', ...slugs.map((s) => `/games/${s}/`)],
  },
  privacy,
  ...slugs.map((s) => assembledGameTarget(s)),
]);

function listFiles(dir: string): string[] {
  const out: string[] = [];
  const visit = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) visit(full);
      else out.push(path.relative(siteDir, full).split(path.sep).join('/'));
    }
  };
  visit(dir);
  return out.sort();
}

test.describe('site output', () => {
  test('is a drop-in folder that Jekyll will not mangle', ({ browserName }, testInfo) => {
    test.skip(
      browserName !== 'chromium' || testInfo.project.name !== 'chromium',
      'file checks run once, in the desktop Chromium project',
    );
    expect(fs.existsSync(siteDir), 'run pnpm assemble first').toBe(true);
    const files = listFiles(siteDir);
    expect(files.every((f) => f.startsWith('games/'))).toBe(true);
    expect(checkOutputNames(files)).toEqual([]);
    expect(files.filter((f) => /(^|\/)CNAME$/.test(f))).toEqual([]);
    expect(files.filter((f) => f.endsWith('sw.js'))).toEqual(['games/sw.js']);
    for (const f of files.filter((x) => x.endsWith('.html'))) {
      const html = fs.readFileSync(path.join(siteDir, f), 'utf8');
      expect(checkHtmlForLiquid(html, f)).toEqual([]);
    }
    for (const slug of slugs) {
      expect(files).toContain(`games/${slug}/index.html`);
    }
    expect(files).toContain('games/index.html');
    expect(files).toContain('games/privacy/index.html');
    expect(files).toContain('games/manifest.webmanifest');
  });
});
