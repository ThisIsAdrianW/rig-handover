import type { DigestRow, NightDigest } from '../digest/types.js';

// The digest page: one table, one row per job, sorted by the reader. Rows with retries of 3+
// or a last run that failed are marked — the last-status cell turns .warn.
function markRow(row: DigestRow): boolean {
  return row.retries >= 3 || row.lastStatus === 'fail';
}

function OrDash({ value }: { value: string | null }) {
  return <>{value ?? '—'}</>;
}

export function Digest({ digest }: { digest: NightDigest }) {
  return (
    <>
      <h1>digest · {digest.night}</h1>
      {digest.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first at</th>
              <th>last at</th>
            </tr>
          </thead>
          <tbody>
            {digest.rows.map((row) => (
              <tr>
                <td>{row.job}</td>
                <td>
                  <OrDash value={row.owner} />
                </td>
                <td>{row.runs}</td>
                <td>{row.retries}</td>
                <td>
                  {markRow(row) ? <span class="warn">{row.lastStatus}</span> : row.lastStatus}
                </td>
                <td>
                  <OrDash value={row.lastError} />
                </td>
                <td>{row.firstAt}</td>
                <td>{row.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
