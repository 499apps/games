#!/usr/bin/env node
// Pin every game in games.lock.json to the current HEAD of its sibling checkout (../game-<slug>).
// Usage: node scripts/assemble-lock.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, writeJson } from '../src/kit/scripts/lib/fsutil.mjs';
import { capture } from '../src/kit/scripts/lib/run.mjs';
import { siblingDirName, updateLockRefs, validateLock } from './lib/lock.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lockPath = path.join(root, 'games.lock.json');
const lock = readJson(lockPath);
const problems = validateLock(lock);
if (problems.length > 0) {
  console.error(`[assemble:lock] games.lock.json is invalid:\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}

const refs = {};
for (const game of lock.games) {
  const dir = path.resolve(root, '..', siblingDirName(game.slug));
  if (!fs.existsSync(path.join(dir, '.git'))) {
    console.warn(`[assemble:lock] ${game.slug}: no sibling checkout at ../${siblingDirName(game.slug)}; ref kept (${game.ref})`);
    continue;
  }
  const sha = capture('git', ['rev-parse', 'HEAD'], { cwd: dir });
  if (!sha) {
    console.warn(`[assemble:lock] ${game.slug}: could not read HEAD (no commits yet?); ref kept (${game.ref})`);
    continue;
  }
  const dirty = (capture('git', ['status', '--porcelain'], { cwd: dir }) ?? '') !== '';
  if (dirty) {
    console.warn(`[assemble:lock] ${game.slug}: uncommitted changes are NOT included; commit them and re-run to ship them`);
  }
  refs[game.slug] = sha;
  console.log(`[assemble:lock] ${game.slug}: ${game.ref} -> ${sha}`);
}

writeJson(lockPath, updateLockRefs(lock, refs));
console.log('[assemble:lock] games.lock.json updated');
