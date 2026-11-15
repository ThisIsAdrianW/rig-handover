import { readNight } from '../digest/reader.js';
import type { Status } from '../status.js';

// Count the ok / retry / fail statuses for one night from the same reader the digest page
// uses, so the board and the digest never disagree (ADR 0001). The digest has its own reader
// call (there is no digest to reuse here; no client JS, ADR 0001).
export function nightCounts(runsDir: string, night: string): { ok: number; retry: number; fail: number } | null {
  const digest = readNight(runsDir, night);
  if (digest === null) return null;
  const counts = { ok: 0, retry: 0, fail: 0 };
  for (const row of digest.rows) counts[row.lastStatus] += 1;
  return counts;
}

export function StatusBoard({ status }: { status: Status }) {
  return (
    <>
      <h1>status</h1>
      <table>
        <tbody>
          <tr><th>adapter</th><td>{status.adapter}</td></tr>
          <tr><th>installed</th><td>{status.installed}</td></tr>
          <tr>
            <th>last beat</th>
            <td>{status.lastBeat ? `${status.lastBeat.at} · pid ${status.lastBeat.pid}` : <span class="warn">none</span>}</td>
          </tr>
        </tbody>
      </table>
      <h2>nights on disk</h2>
      {status.nights.length === 0 ? (
        <p class="mute">nothing in runs/</p>
      ) : (
        <ul>
          {status.nights.map((n) => {
            const counts = nightCounts(status.runsDir, n);
            return (
              <li><a href={`/digest/${n}`}>{n}</a> · {counts === null ? '—' : `ok ${counts.ok} · retry ${counts.retry} · fail ${counts.fail}`}</li>
            );
          })}
        </ul>
      )}
    </>
  );
}
