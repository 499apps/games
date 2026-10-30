export interface LockGame {
  slug: string;
  repo: string;
  ref: string;
}

export interface GamesLock {
  games: LockGame[];
  [key: string]: unknown;
}

export const SLUG_RE: RegExp;
export const REF_RE: RegExp;
export const RESERVED_SLUGS: Set<string>;
export function siblingDirName(slug: string): string;
export function expectedRepo(slug: string): string;
export function isPinnedRef(ref: string): boolean;
export function validateLock(lock: unknown): string[];
export function updateLockRefs(lock: GamesLock, refs: Record<string, string>): GamesLock;
