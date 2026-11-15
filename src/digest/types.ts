// The run log digest: one row per job from runs/<night>.jsonl (plan §1).
// Committed first so every part of §2 can build against it.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One run line as it appears in runs/<night>.jsonl. A line that does not parse is counted
// in NightDigest.badLines, never thrown.
export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One digest row: a job collapsed across the night. A missing owner stays null and renders
// as `—`; it is never dropped.
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

// The whole night: one row per job, sorted by job, plus how many lines did not parse.
export type NightDigest = {
  night: string;
  rows: DigestRow[];
  badLines: number;
};

// Signature of the reader, implemented in reader.ts. Pinned here alongside DigestRow and
// NightDigest so the digest page and the JSON route can both build against it.
// Returns null when runs/<night>.jsonl is not on disk; an existing but empty file is an
// empty digest, not null.
export type ReadNight = (runsDir: string, night: string) => NightDigest | null;
