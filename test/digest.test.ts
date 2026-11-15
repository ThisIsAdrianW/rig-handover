import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/reader.js';

const runsDir = 'runs';

describe('readNight', () => {
  it('reads the 2026-10-28 night into one row per job (5 jobs, 1 bad line)', () => {
    const digest = readNight(runsDir, '2026-10-28');
    expect(digest).not.toBeNull();
    expect(digest!.badLines).toBe(1);
    expect(digest!.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('counts the runs, retries, last status and times per job', () => {
    const digest = readNight(runsDir, '2026-10-28');
    const laneSync = digest!.rows.find((r) => r.job === 'lane/sync');
    expect(laneSync).toMatchObject({
      owner: 'rook',
      runs: 8,
      retries: 1,
      lastStatus: 'ok',
      lastError: null,
      firstAt: '2026-10-28T23:00:06+01:00',
      lastAt: '2026-10-29T05:00:04+01:00',
    });

    const notesBackup = digest!.rows.find((r) => r.job === 'notes/backup');
    expect(notesBackup).toMatchObject({
      runs: 1,
      lastStatus: 'fail',
      lastError: 'quota exceeded',
    });
  });

  it('keeps a null owner and shows it as —', () => {
    const digest = readNight(runsDir, '2026-10-28');
    const digestRender = digest!.rows.find((r) => r.job === 'digest/render');
    expect(digestRender!.owner).toBeNull();
    // The page renders a null owner as —, per the styleguide.
    expect(digestRender!.owner ?? '—').toBe('—');
  });

  it('returns null for a night with no file', () => {
    expect(readNight(runsDir, '2099-01-01')).toBeNull();
  });
});
