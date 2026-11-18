// HALLWAKE — QA slop gate (DESIGN_MANIFESTO: "one design-token system across
// every page/component"). The DOM UI layer (ui/ + game/) must never inline
// raw hex/rgb(a) color literals: every color is a var() from
// identity/tokens.css. The render layer (Three.js materials) is exempt — it
// reads the same tokens through tokenColor() with hex fallbacks for headless.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAW_COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(/;

function tsxIn(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => join(dir, f));
}

describe('design token discipline (manifesto slop scan)', () => {
  it('no raw hex/rgb(a) color literals in ui/ or game/', () => {
    const roots = [join(__dirname, '..'), join(__dirname, '../../game')];
    const offenders: string[] = [];
    for (const root of roots) {
      for (const file of tsxIn(root)) {
        readFileSync(file, 'utf8')
          .split('\n')
          .forEach((line, i) => {
            if (RAW_COLOR.test(line)) offenders.push(`${file}:${i + 1}: ${line.trim()}`);
          });
      }
    }
    expect(offenders).toEqual([]);
  });
});
