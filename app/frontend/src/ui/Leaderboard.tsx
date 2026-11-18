// HALLWAKE — the leaderboard as a ruled ledger (design-brief §5): rank
// numeral in Big Shoulders, stats in tabular mono, hairline rows — never a
// card grid. Empty state is diegetic: "THE LOG IS CLEAN".

import type { ScoreRow } from '../net/scoresClient';

function fmtTime(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function Leaderboard({
  scores,
  compact = false,
}: {
  scores: ScoreRow[];
  compact?: boolean;
}) {
  if (scores.length === 0) {
    return (
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-prose)',
          fontStyle: 'italic',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-ink-muted)',
        }}
      >
        The log is clean. No runs logged — the corridor is waiting for a name.
      </p>
    );
  }
  return (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--font-mono)',
        fontVariantNumeric: 'tabular-nums',
        fontSize: compact ? 'var(--text-2xs)' : 'var(--text-xs)',
      }}
    >
      <thead>
        <tr
          style={{
            color: 'var(--color-ink-muted)',
            textTransform: 'uppercase',
            letterSpacing: 'var(--tracking-label)',
          }}
        >
          <th style={{ textAlign: 'left', padding: 'var(--space-1) var(--space-2)', borderBottom: '1px solid var(--color-rule-strong)', fontWeight: 400 }}>#</th>
          <th style={{ textAlign: 'left', padding: 'var(--space-1) var(--space-2)', borderBottom: '1px solid var(--color-rule-strong)', fontWeight: 400 }}>Porter</th>
          <th style={{ textAlign: 'right', padding: 'var(--space-1) var(--space-2)', borderBottom: '1px solid var(--color-rule-strong)', fontWeight: 400 }}>Door</th>
          <th style={{ textAlign: 'right', padding: 'var(--space-1) var(--space-2)', borderBottom: '1px solid var(--color-rule-strong)', fontWeight: 400 }}>Time</th>
          {!compact && (
            <th style={{ textAlign: 'right', padding: 'var(--space-1) var(--space-2)', borderBottom: '1px solid var(--color-rule-strong)', fontWeight: 400 }}>Deaths</th>
          )}
        </tr>
      </thead>
      <tbody>
        {scores.map((row, i) => (
          <tr key={`${row.id}-${i}`} style={{ height: compact ? undefined : 'var(--hud-row-h)' }}>
            <td
              style={{
                padding: 'var(--space-1) var(--space-2)',
                borderBottom: 'var(--border-hairline)',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: compact ? 'var(--text-sm)' : 'var(--text-md)',
                color: 'var(--color-ink)',
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </td>
            <td
              style={{
                padding: 'var(--space-1) var(--space-2)',
                borderBottom: 'var(--border-hairline)',
                color: 'var(--color-ink)',
                maxWidth: '24ch',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {row.name}
            </td>
            <td style={{ padding: 'var(--space-1) var(--space-2)', borderBottom: 'var(--border-hairline)', textAlign: 'right', color: 'var(--color-ink)' }}>
              {String(row.deepest_door).padStart(2, '0')}
            </td>
            <td style={{ padding: 'var(--space-1) var(--space-2)', borderBottom: 'var(--border-hairline)', textAlign: 'right', color: 'var(--color-ink-secondary)' }}>
              {fmtTime(row.run_time_ms)}
            </td>
            {!compact && (
              <td style={{ padding: 'var(--space-1) var(--space-2)', borderBottom: 'var(--border-hairline)', textAlign: 'right', color: 'var(--color-ink-secondary)' }}>
                {row.deaths}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
