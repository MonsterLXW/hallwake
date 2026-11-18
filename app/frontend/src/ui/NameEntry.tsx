// HALLWAKE — name entry for the run card. Input is validated client-side by
// core/scoring.ts validateScore (the exact §10 rules the server enforces),
// so a bad name never leaves the device. maxLength mirrors the 12-char cap.

import { useState, type FormEvent } from 'react';
import { validateScore, type RunCard } from '../core/scoring';

export default function NameEntry({
  card,
  onSubmit,
}: {
  card: RunCard;
  onSubmit(name: string): Promise<{ ok: boolean; error?: string }>;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    const v = validateScore({ name, ...card });
    if (!v.ok) {
      setError(v.error ?? 'invalid name');
      return;
    }
    setBusy(true);
    const r = await onSubmit(name.trim());
    setBusy(false);
    if (!r.ok && r.error) setError(r.error);
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <label
        htmlFor="hw-name"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-2xs)',
          letterSpacing: 'var(--tracking-label)',
          textTransform: 'uppercase',
          color: 'var(--color-ink-muted)',
        }}
      >
        Sign the log — 1-12 chars, letters digits space . &apos; -
      </label>
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <input
          id="hw-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          maxLength={12}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'hw-name-error' : undefined}
          style={{
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-ink)',
            background: 'var(--color-plate-sunken)',
            border: 'var(--border-plate)',
            borderRadius: 'var(--radius-0)',
            padding: 'var(--space-2) var(--space-3)',
            width: '16ch',
          }}
        />
        <button
          type="submit"
          disabled={busy}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--color-accent-ink)',
            background: 'var(--color-accent)',
            border: 'var(--border-plate)',
            borderRadius: 'var(--radius-0)',
            padding: 'var(--space-2) var(--space-5)',
            cursor: 'pointer',
          }}
        >
          {busy ? 'Signing…' : 'Sign'}
        </button>
      </div>
      {error && (
        <p
          id="hw-name-error"
          role="alert"
          style={{
            margin: 0,
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-2xs)',
            color: 'var(--color-alarm)',
          }}
        >
          {error}
        </p>
      )}
    </form>
  );
}
