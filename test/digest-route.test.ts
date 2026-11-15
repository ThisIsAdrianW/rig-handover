import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app.js';
import type { NightDigest } from '../src/digest/types.js';

// Route tests for §2a (GET /digest/:night) and §2b (GET /api/digest/:night).
// All fixtures live in a temp runs dir (mkdtemp); the real `runs/` is never touched.

const LANE = 'lane-07';

const GOOD_NIGHT = '2026-11-14';
const GOOD_JSONL = [
  '{"at":"2026-11-14T23:00:01+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
  '{"at":"2026-11-14T23:05:00+01:00","job":"digest/render","status":"retry","owner":null}',
  '{"at":"2026-11-15T00:00:02+01:00","job":"digest/render","status":"ok","owner":null}',
  '{"at":"2026-11-15T00:00:03+01:00","job":"notes/backup","status":"fail","owner":"rook","error":"quota exceeded"}',
].join('\n');

// Sorted by job, matching the reader and the page order.
const GOOD_JOBS = ['digest/render', 'lane/sync', 'notes/backup'];

const EMPTY_NIGHT = '2026-11-15';

const BAD_NIGHT = '2026-11-13';
const BAD_JSONL = [
  '{"at":"2026-11-13T23:00:00+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
  '',
  'this line is not json and must be counted, not thrown',
  '{"at":"2026-11-13T23:30:00+01:00","job":"notes/backup","status":"fail","owner":null,"error":"disk full"}',
].join('\n');

const MISSING_NIGHT = '2099-01-01';

describe('digest routes', () => {
  let runsDir: string;

  beforeAll(() => {
    runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-route-'));
    writeFileSync(join(runsDir, `${GOOD_NIGHT}.jsonl`), GOOD_JSONL);
    writeFileSync(join(runsDir, `${EMPTY_NIGHT}.jsonl`), '');
    writeFileSync(join(runsDir, `${BAD_NIGHT}.jsonl`), BAD_JSONL);
  });

  afterAll(() => {
    rmSync(runsDir, { recursive: true, force: true });
  });

  function app() {
    return createApp({ adapter: 'shim', installed: '2026-11-15T00:00:00+01:00', beatEverySeconds: 60, runsDir });
  }

  function pageOrder(html: string, jobs: string[]) {
    const positions = jobs.map((job) => html.indexOf(job));
    expect(positions).not.toContain(-1);
    for (let i = 1; i < positions.length; i += 1) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  }

  it('renders a night with runs: 200, the lane banner and the jobs in the same order as JSON', async () => {
    const res = await app().request(`/digest/${GOOD_NIGHT}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain(LANE);
    pageOrder(html, GOOD_JOBS);
  });

  it('returns the same rows as JSON, in the same order as the page', async () => {
    const res = await app().request(`/api/digest/${GOOD_NIGHT}`);
    const json = (await res.json()) as NightDigest;
    expect(res.status).toBe(200);
    expect(json.night).toBe(GOOD_NIGHT);
    expect(json.badLines).toBe(0);
    expect(json.rows.map((r) => r.job)).toEqual(GOOD_JOBS);

    const laneSync = json.rows.find((r) => r.job === 'lane/sync');
    expect(laneSync).toMatchObject({ runs: 1, retries: 0, lastStatus: 'ok', owner: 'rook' });
    const digestRender = json.rows.find((r) => r.job === 'digest/render');
    expect(digestRender).toMatchObject({ runs: 2, retries: 1, lastStatus: 'ok', owner: null });
    const notesBackup = json.rows.find((r) => r.job === 'notes/backup');
    expect(notesBackup).toMatchObject({ runs: 1, lastStatus: 'fail', lastError: 'quota exceeded' });
  });

  it('404s when the night has no file', async () => {
    const page = await app().request(`/digest/${MISSING_NIGHT}`);
    expect(page.status).toBe(404);

    const json = await app().request(`/api/digest/${MISSING_NIGHT}`);
    expect(json.status).toBe(404);
  });

  it('renders "nothing ran" for an empty night file', async () => {
    const page = await app().request(`/digest/${EMPTY_NIGHT}`);
    const html = await page.text();
    expect(page.status).toBe(200);
    expect(html).toContain('nothing ran');
  });

  it('returns empty rows for an empty night file', async () => {
    const res = await app().request(`/api/digest/${EMPTY_NIGHT}`);
    const json = (await res.json()) as NightDigest;
    expect(res.status).toBe(200);
    expect(json.rows).toEqual([]);
    expect(json.badLines).toBe(0);
  });

  it('still renders the good jobs when a night has a bad line', async () => {
    const res = await app().request(`/digest/${BAD_NIGHT}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    pageOrder(html, ['lane/sync', 'notes/backup']);
  });

  it('excludes the bad line from JSON but counts it in badLines', async () => {
    const res = await app().request(`/api/digest/${BAD_NIGHT}`);
    const json = (await res.json()) as NightDigest;
    expect(res.status).toBe(200);
    expect(json.badLines).toBe(1);
    expect(json.rows.map((r) => r.job)).toEqual(['lane/sync', 'notes/backup']);
  });
});
