// HALLWAKE — run card -> name entry -> leaderboard (T4 kiosk flow).
// Asymmetric editorial layout per brief §5: masthead flush-left, metadata
// flush-right in mono, content bands separated by hairline rules. The run
// flavor line is display-only (fetchFlavor; canned fallback renders
// instantly and is upgraded if the server answers). Submit goes through
// scoresClient (server first, localStorage mirror when it is down).

import { useEffect, useState } from 'react';
import { useUIStore } from '../state/uiStore';
import { getScores, submitScore } from '../net/scoresClient';
import { fetchFlavor } from '../net/flavorClient';
import NameEntry from './NameEntry';
import Leaderboard from './Leaderboard';

function fmtTime(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

type Stage = 'card' | 'name' | 'board';

export default function RunCard({ onNewRun }: { onNewRun(): void }) {
  const card = useUIStore((s) => s.runCard);
  const runFlavor = useUIStore((s) => s.runFlavor);
  const setRunFlavor = useUIStore((s) => s.setRunFlavor);
  const scores = useUIStore((s) => s.scores);
  const scoresSource = useUIStore((s) => s.scoresSource);
  const setScores = useUIStore((s) => s.setScores);
  const seed = useUIStore((s) => s.seed);
  const [stage, setStage] = useState<Stage>('card');

  useEffect(() => {
    if (!card || runFlavor) return;
    let live = true;
    void fetchFlavor({ kind: 'run', door: card.deepest_door, deaths: card.deaths }).then((r) => {
      if (live) setRunFlavor(r.text); // textContent-only; never game state
    });
    return () => {
      live = false;
    };
  }, [card, runFlavor, setRunFlavor]);

  if (!card) return null;

  async function sign(name: string): Promise<{ ok: boolean; error?: string }> {
    const r = await submitScore(
      { name, deepest_door: card!.deepest_door, run_time_ms: card!.run_time_ms, deaths: card!.deaths },
      seed,
    );
    const list = await getScores(10);
    setScores(list.scores, list.source);
    if (r.ok || r.local) setStage('board'); // server-rejected rows stay on the form
    return { ok: r.ok, error: r.ok || r.local ? undefined : r.error };
  }

  const stat = (label: string, value: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-2xs)',
          letterSpacing: 'var(--tracking-label)',
          textTransform: 'uppercase',
          color: 'var(--color-ink-muted)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontVariantNumeric: 'tabular-nums',
          fontSize: 'var(--text-lg)',
          color: 'var(--color-ink)',
        }}
      >
        {value}
      </span>
    </div>
  );

  return (
    <div
      role="dialog"
      aria-label="run card"
      style={{
        position: 'absolute',
        inset: 0,
        background: 'var(--color-bg)',
        padding: 'var(--hud-safe) var(--space-7)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5)',
        overflow: 'auto',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 'var(--space-4)',
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--color-rule-strong)',
          paddingBottom: 'var(--space-3)',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 'clamp(40px, 7vh, 96px)',
            letterSpacing: 'var(--tracking-stencil)',
            textTransform: 'uppercase',
            color: 'var(--color-ink)',
            lineHeight: 'var(--leading-tight)',
          }}
        >
          Door 24 open — you walk out
        </h1>
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-2xs)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--color-ink-muted)',
          }}
        >
          run {seed} · signed ledger
        </p>
      </header>

      <div style={{ display: 'flex', gap: 'var(--space-7)', flexWrap: 'wrap' }}>
        {stat('Deepest door', String(card.deepest_door).padStart(2, '0'))}
        {stat('Run time', fmtTime(card.run_time_ms))}
        {stat('Deaths', String(card.deaths))}
      </div>

      {runFlavor && (
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-prose)',
            fontSize: 'var(--text-xs)',
            lineHeight: 'var(--leading-prose)',
            color: 'var(--color-ink-secondary)',
            maxWidth: 'var(--measure-prose)',
          }}
        >
          {runFlavor}
        </p>
      )}

      {stage === 'card' && (
        <div>
          <button
            type="button"
            onClick={() => setStage('name')}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-sm)',
              letterSpacing: 'var(--tracking-label)',
              textTransform: 'uppercase',
              color: 'var(--color-accent-ink)',
              background: 'var(--color-accent)',
              border: 'var(--border-plate)',
              borderRadius: 'var(--radius-0)',
              padding: 'var(--space-3) var(--space-6)',
              cursor: 'pointer',
            }}
          >
            Submit name
          </button>
        </div>
      )}

      {stage === 'name' && <NameEntry card={card} onSubmit={sign} />}

      {stage === 'board' && (
        <div style={{ borderTop: 'var(--border-hairline)', paddingTop: 'var(--space-3)' }}>
          <h2
            style={{
              margin: '0 0 var(--space-2)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-2xs)',
              letterSpacing: 'var(--tracking-label)',
              textTransform: 'uppercase',
              color: 'var(--color-ink-muted)',
              fontWeight: 400,
            }}
          >
            Ledger {scoresSource === 'local' ? '· local mirror (backend down)' : '· house copy'}
          </h2>
          <Leaderboard scores={scores} />
        </div>
      )}

      <div style={{ marginTop: 'auto' }}>
        <button
          type="button"
          onClick={onNewRun}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-2xs)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--color-ink-secondary)',
            background: 'transparent',
            border: 'var(--border-plate)',
            borderRadius: 'var(--radius-0)',
            padding: 'var(--space-2) var(--space-4)',
            cursor: 'pointer',
          }}
        >
          New run
        </button>
      </div>
    </div>
  );
}
