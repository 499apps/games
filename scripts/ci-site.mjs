#!/usr/bin/env node
// Site CI: assemble the full site, then run the smoke suite against site/ served at the URL root.
// Usage: node scripts/ci-site.mjs   (E2E_SHARDS, E2E_WORKERS, E2E_BROWSERS work as in ci:local)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatMs } from '../src/kit/scripts/lib/fsutil.mjs';
import { runSync } from '../src/kit/scripts/lib/run.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const t0 = Date.now();

function step(name, cmd, args) {
  console.log(`\n▶ ${name}`);
  const started = Date.now();
  const r = runSync(cmd, args, { cwd: root, allowFailure: true });
  const ok = r.status === 0;
  console.log(`  ${ok ? '✔' : '✖'} ${name} ${formatMs(Date.now() - started)}`);
  return ok;
}

let ok = step('assemble', 'node', ['scripts/assemble.mjs']);
if (ok) ok = step('e2e:site', 'pnpm', ['--silent', 'run', 'e2e:site']);

console.log(`\n${ok ? 'Site CI passed' : 'Site CI failed'}`);
console.log(`  wall clock: ${formatMs(Date.now() - t0)}`);
console.log('  (test counts: see the E2E_SUMMARY line above)');
process.exit(ok ? 0 : 1);
