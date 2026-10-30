// Pure helpers for games.lock.json (unit tested from src/lock.test.ts).

export const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
export const REF_RE = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;

/** Folder names the hub build already uses inside /games/. */
export const RESERVED_SLUGS = new Set(['assets', 'icons', 'privacy', 'kit', 'src']);

export function siblingDirName(slug) {
  return `game-${slug}`;
}

export function expectedRepo(slug) {
  return `https://github.com/499apps/game-${slug}.git`;
}

/** True for a full commit sha or a version tag such as v1.2.0. */
export function isPinnedRef(ref) {
  return /^[0-9a-f]{40}$/.test(ref) || /^v\d+(\.\d+)*([-.][A-Za-z0-9.]+)?$/.test(ref);
}

/**
 * Validate the lock file. Returns a list of problems (empty when valid).
 * @param {unknown} lock
 */
export function validateLock(lock) {
  const problems = [];
  if (!lock || typeof lock !== 'object' || !Array.isArray(lock.games)) {
    return ['games.lock.json must be an object with a "games" array'];
  }
  const seen = new Set();
  lock.games.forEach((g, i) => {
    const where = `games[${i}]`;
    if (!g || typeof g !== 'object') {
      problems.push(`${where}: must be an object`);
      return;
    }
    if (typeof g.slug !== 'string' || !SLUG_RE.test(g.slug)) {
      problems.push(`${where}: slug must match ${SLUG_RE}`);
      return;
    }
    if (RESERVED_SLUGS.has(g.slug)) problems.push(`${where}: slug "${g.slug}" is reserved by the hub`);
    if (seen.has(g.slug)) problems.push(`${where}: duplicate slug "${g.slug}"`);
    seen.add(g.slug);
    if (g.repo !== expectedRepo(g.slug)) {
      problems.push(`${where}: repo must be ${expectedRepo(g.slug)}`);
    }
    if (typeof g.ref !== 'string' || !REF_RE.test(g.ref) || g.ref.includes('..')) {
      problems.push(`${where}: ref must be a commit sha, tag or branch name`);
    }
  });
  return problems;
}

/**
 * Return a copy of the lock with new refs for the given slugs.
 * @param {{ games: Array<{ slug: string, repo: string, ref: string }> }} lock
 * @param {Record<string, string>} refs
 */
export function updateLockRefs(lock, refs) {
  return {
    ...lock,
    games: lock.games.map((g) => (Object.prototype.hasOwnProperty.call(refs, g.slug) ? { ...g, ref: refs[g.slug] } : { ...g })),
  };
}
