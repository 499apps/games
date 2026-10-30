#!/usr/bin/env node
// Assemble the full /games/ site into ./site (a drop-in folder for the 499apps.com Pages repo).
//  1. Build the hub into site/games/.
//  2. For each game in games.lock.json: clone the pinned ref (from the sibling ../game-<slug>
//     checkout when present, so uncommitted changes never ship; else from GitHub), install,
//     build with VITE_ASSEMBLED=1 and copy dist/ into site/games/<slug>/.
//  3. Write ONE service worker, site/games/sw.js (scope /games/), that precaches everything.
//  4. Verify: no "_"/"."-prefixed names, no CNAME, no Liquid or front matter, CSP on every page.
// Usage: node scripts/assemble.mjs [--keep-temp]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  copyDir,
  ensureDir,
  fileExists,
  formatMs,
  parseArgs,
  readJson,
  rmrf,
  toPosix,
  walk,
  writeJson,
} from '../src/kit/scripts/lib/fsutil.mjs';
import { capture, runSync } from '../src/kit/scripts/lib/run.mjs';
import {
  checkHtmlForLiquid,
  checkHtmlMeta,
  checkOutputNames,
} from '../src/kit/scripts/lib/precache.mjs';
import { isPinnedRef, siblingDirName, validateLock } from './lib/lock.mjs';

const args = parseArgs(process.argv.slice(2));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteDir = path.join(root, 'site');
const outDir = path.join(siteDir, 'games');
const keepTemp = args['keep-temp'] === true;
const t0 = Date.now();

const log = (msg) => console.log(`[assemble] ${msg}`);

function resolveRef(work, ref) {
  for (const candidate of [ref, `origin/${ref}`]) {
    const sha = capture('git', ['rev-parse', '--verify', '--quiet', `${candidate}^{commit}`], { cwd: work });
    if (sha) return sha;
  }
  throw new Error(`ref "${ref}" not found in ${work}`);
}

function exportGame(game, work) {
  const sibling = path.resolve(root, '..', siblingDirName(game.slug));
  if (fs.existsSync(path.join(sibling, '.git'))) {
    log(`${game.slug}: exporting ${game.ref} from ../${siblingDirName(game.slug)} (committed files only)`);
    runSync('git', ['clone', '--quiet', '--no-checkout', sibling, work]);
  } else {
    log(`${game.slug}: cloning ${game.repo} at ${game.ref}`);
    runSync('git', ['clone', '--quiet', '--no-checkout', game.repo, work]);
  }
  const sha = resolveRef(work, game.ref);
  runSync('git', ['-c', 'advice.detachedHead=false', 'checkout', '--quiet', sha], { cwd: work });
  return sha;
}

function buildGame(game, work) {
  const hasLock = fileExists(path.join(work, 'pnpm-lock.yaml'));
  log(`${game.slug}: installing (${hasLock ? 'frozen lockfile' : 'no lockfile committed'})`);
  runSync('pnpm', ['install', hasLock ? '--frozen-lockfile' : '--no-frozen-lockfile', '--prefer-offline'], {
    cwd: work,
  });
  log(`${game.slug}: building with VITE_ASSEMBLED=1`);
  runSync('pnpm', ['run', 'build'], { cwd: work, env: { VITE_ASSEMBLED: '1' } });
  const dist = path.join(work, 'dist');
  if (!fileExists(path.join(dist, 'index.html'))) throw new Error(`${game.slug}: build produced no dist/index.html`);
  if (fileExists(path.join(dist, 'sw.js'))) {
    throw new Error(`${game.slug}: assembled build still contains sw.js (the hub worker must cover it)`);
  }
  return dist;
}

function verifySite(slugs) {
  const files = walk(siteDir).map((f) => toPosix(path.relative(siteDir, f)));
  const problems = [...checkOutputNames(files)];
  for (const f of files) {
    if (!f.startsWith('games/')) problems.push(`${f}: everything must live under games/`);
    if (path.posix.basename(f) === 'CNAME') problems.push(`${f}: CNAME must not exist`);
    if (f.endsWith('.html')) {
      const html = fs.readFileSync(path.join(siteDir, f), 'utf8');
      problems.push(...checkHtmlForLiquid(html, f), ...checkHtmlMeta(html, f));
    }
  }
  const workers = files.filter((f) => path.posix.basename(f) === 'sw.js');
  if (workers.length !== 1 || workers[0] !== 'games/sw.js') {
    problems.push(`expected exactly one service worker at games/sw.js, found: ${workers.join(', ') || 'none'}`);
  }
  for (const required of ['games/index.html', 'games/privacy/index.html', 'games/manifest.webmanifest']) {
    if (!files.includes(required)) problems.push(`missing ${required}`);
  }
  for (const slug of slugs) {
    if (!files.includes(`games/${slug}/index.html`)) problems.push(`missing games/${slug}/index.html`);
  }
  return { files, problems };
}

async function main() {
  const lock = readJson(path.join(root, 'games.lock.json'));
  const lockProblems = validateLock(lock);
  if (lockProblems.length > 0) throw new Error(`games.lock.json is invalid:\n  - ${lockProblems.join('\n  - ')}`);

  rmrf(siteDir);
  ensureDir(outDir);

  log('building the hub');
  runSync('pnpm', ['run', 'build'], { cwd: root });
  copyDir(path.join(root, 'dist'), outDir);

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'g499-assemble-'));
  const built = [];
  try {
    for (const game of lock.games) {
      if (!isPinnedRef(game.ref)) {
        log(`warning: ${game.slug} ref "${game.ref}" is not a commit sha or tag; run "pnpm assemble:lock" to pin it`);
      }
      const work = path.join(tmpRoot, game.slug);
      const sha = exportGame(game, work);
      const dist = buildGame(game, work);
      const target = path.join(outDir, game.slug);
      if (fs.existsSync(target)) throw new Error(`${game.slug}: games/${game.slug} already exists in the hub output`);
      copyDir(dist, target);
      built.push({ slug: game.slug, ref: game.ref, sha });
      log(`${game.slug}: ok (${sha.slice(0, 12)})`);
    }
  } finally {
    if (keepTemp) log(`kept temp folder ${tmpRoot}`);
    else {
      try {
        rmrf(tmpRoot);
      } catch {
        log(`note: could not remove temp folder ${tmpRoot}`);
      }
    }
  }

  const hubSha = capture('git', ['rev-parse', 'HEAD'], { cwd: root }) ?? 'unknown';
  const hubDirty = (capture('git', ['status', '--porcelain'], { cwd: root }) ?? '') !== '';
  writeJson(path.join(outDir, 'versions.json'), {
    hub: hubDirty ? `${hubSha}-dirty` : hubSha,
    games: built,
  });

  log('writing the single /games/ service worker');
  rmrf(path.join(outDir, 'sw.js'));
  runSync(
    'node',
    [path.join(root, 'src', 'kit', 'scripts', 'gen-precache.mjs'), '--dist', outDir, '--base', '/games/', '--scope', '/games/', '--force'],
    { cwd: root },
  );

  const { files, problems } = verifySite(built.map((b) => b.slug));
  if (problems.length > 0) throw new Error(`site verification failed:\n  - ${problems.join('\n  - ')}`);
  log(`site/ ready: ${files.length} files, hub + ${built.length} game(s), in ${formatMs(Date.now() - t0)}`);
  log('publish: copy site/games/ into the 499apps.com repo as games/ and open a pull request');
}

main().catch((err) => {
  console.error(`[assemble] failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
