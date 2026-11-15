---
plan: morning-digest
status: done
owner: rook
opened: 2026-10-29
closed: 2026-11-15
---

# Morning digest

The night's run log is a JSONL file nobody reads. By breakfast someone has to know what ran,
what retried, what failed, and whose it was, without opening `runs/`. rig already serves the
status board; the digest is one more page on it.

Out of scope: notifications, history across nights, auth (rig only listens on localhost).

## 1. Run log reader

`src/digest/reader.ts` + `src/digest/types.ts`: read `runs/<night>.jsonl` into one row per
job (job, owner, runs, retries, last status, last error, first and last time). A line that
doesn't parse is counted in `badLines`, never thrown. `owner: null` kept, rendered as `—`.

Done when: reader tests pass on `runs/2026-10-28.jsonl` (5 jobs, 1 bad line). ✓

## 2. Digest page

- `GET /digest/:night` — one table, sorted by job, retries ≥ 3 and any `fail` marked; 404 on
  missing night, "nothing ran" on empty. ✓
- `GET /api/digest/:night` — the same rows as JSON via the same `readNight` (ADR 0001). ✓
- Status board links each night on disk to its digest with ok / retry / fail counts. ✓
- Route tests for both (200, 404, empty, bad line) on a temp runs dir. ✓

## 3. Preview for review

`/digest/2026-10-28` saved as one HTML file (lane banner included, ADR 0001) and published on
GitHub Pages at https://ThisIsAdrianW.github.io/rig-handover/ (ADR 0003).

Done when: the preview link is sent to the reviewer. ✓

## 4. Clean up

The preview's lane marker was removed (banner reads "no marker set") and the page uploaded
over the same link. This plan moved to `docs/plans/done/`.

Done when: the preview link no longer shows the lane marker. ✓

## Issues

| # | Issue | Blocked by | Worker | Closed |
|---|-------|-----------|--------|--------|
| 1 | Run log reader | — | claude-code · opus-5.5 · medium | 2026-11-15 |
| 2 | Digest page: GET /digest/:night | #1 | claude-code · opus-5.5 · medium | 2026-11-15 |
| 3 | Digest JSON: GET /api/digest/:night | #1 | claude-code · opus-5.5 · medium | 2026-11-15 |
| 4 | Board link to digest with counts | #1, #2 | claude-code · opus-5.5 · medium | 2026-11-15 |
| 5 | Route tests for digest | #2, #3 | claude-code · opus-5.5 · medium | 2026-11-15 |
| 6 | Preview for review | #2 | claude-code · opus-5.5 · low | 2026-11-15 |
| 7 | Clean up: take the marker off the preview | #6 | claude-code · opus-5.5 · low | 2026-11-15 |

The digest page and JSON route were merged together; #2's commit also carried the JSON route
so #5's tests could pass, resolved on main with #3's version kept.
