import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import type { DigestRow, NightDigest, RunLine, RunStatus } from './types.js';

// One JSON object per line. A line that does not parse is counted in badLines, never
// thrown: the night still renders. Status is trusted after parse; anything else is a bad
// line.
function parseLine(line: string): RunLine | null {
  try {
    const raw = JSON.parse(line) as Partial<RunLine>;
    if (
      typeof raw.at === 'string' &&
      typeof raw.job === 'string' &&
      (raw.status === 'ok' || raw.status === 'retry' || raw.status === 'fail')
    ) {
      return {
        at: raw.at,
        job: raw.job,
        status: raw.status,
        owner: raw.owner === undefined || raw.owner === null ? null : raw.owner,
        error: typeof raw.error === 'string' ? raw.error : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// runs/<night>.jsonl -> one DigestRow per job, sorted by job. Missing file -> null;
// an existing but empty file is an empty digest.
export function readNight(runsDir: string, night: string): NightDigest | null {
  const file = `${runsDir}/${night}.jsonl`;
  if (!existsSync(file)) return null;

  const lines = readFileSync(file, 'utf8').split('\n');
  const rows = new Map<string, DigestRow>();
  let badLines = 0;

  for (const line of lines) {
    if (line.trim() === '') continue;
    const run = parseLine(line);
    if (run === null) {
      badLines += 1;
      continue;
    }

    const row = rows.get(run.job);
    if (row === undefined) {
      rows.set(run.job, {
        job: run.job,
        owner: run.owner,
        runs: 1,
        retries: run.status === 'retry' ? 1 : 0,
        lastStatus: run.status,
        lastError: run.error ?? null,
        firstAt: run.at,
        lastAt: run.at,
      });
      continue;
    }

    row.runs += 1;
    if (run.status === 'retry') row.retries += 1;
    row.lastStatus = run.status;
    row.lastError = run.error ?? null;
    row.lastAt = run.at;
  }

  return {
    night,
    rows: [...rows.values()].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0)),
    badLines,
  };
}

// Re-exported so the digest feature has one entry point (and to keep the signature named
// where the route can import it).
export type { DigestRow, NightDigest, RunStatus } from './types.js';
