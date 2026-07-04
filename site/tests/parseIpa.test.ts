import { describe, expect, it } from 'vitest';
import { parseIpaMarkdown } from '../src/content/parseIpa';

// Verbatim excerpt from IPA-Approach/01-general-exercises.md
const GENERAL_FIXTURE = `# General Exercises — Short Phrases (IPA Approach)

## Overview

100 foundational exercises using single short phrases.

---

## Exercises 1-20: Basic Commands & Requests

1. **Firm command** — [Stop˥˩]. [˥ ˩ => ˥˩]
2. **Gentle request** — [Please˩˧]. [˩ ˧ => ˩˧]
6. **Soft encouragement** — [Try˩˧˥]. [˩ ˧ ˥ => ˩˧˥]

## Exercises 21-40: Emotional States

21. **Joyful exclamation** — [Great˩˧˥]. [˩ ˧ ˥ => ˩˧˥]
`;

// Two-clause style: multiple tone-marked words and multiple legends per line.
const TWO_CLAUSE_FIXTURE = `# Two-Clause Exercises (IPA Approach)

## Exercises 1-20

1. **Soft request, Firm finality** — Ask [now˩˧˥], but finish [then˥˩]. [˩ ˧ ˥ => ˩˧˥] [˥ ˩ => ˥˩]
2. **Hopeful-hurt** — I wanted to [stay˩˧], but she insisted I [leave˥˦]. [˩ ˧ => ˩˧] [˥ ˦ => ˥˦]
`;

describe('parseIpaMarkdown', () => {
  it('parses numbered entries with intention, markers, and section', () => {
    const { exercises, issues } = parseIpaMarkdown(GENERAL_FIXTURE, {
      file: '01-general-exercises.md',
      collection: '01-general-exercises',
    });
    expect(issues).toEqual([]);
    expect(exercises).toHaveLength(4);

    const first = exercises[0];
    expect(first.number).toBe(1);
    expect(first.approach).toBe('ipa');
    expect(first.section).toBe('Exercises 1-20: Basic Commands & Requests');
    expect(first.variations).toHaveLength(1);
    expect(first.variations[0].intention).toBe('Firm command');
    expect(first.variations[0].markers).toEqual([
      { word: 'Stop', levels: [5, 1] },
    ]);
  });

  it('cleans the sentence: strips tone letters, brackets, and legends', () => {
    const { exercises } = parseIpaMarkdown(GENERAL_FIXTURE, {
      file: 'x.md',
      collection: 'x',
    });
    expect(exercises[0].text).toBe('Stop.');
    expect(exercises[2].text).toBe('Try.');
  });

  it('handles multiple tone-marked words in one sentence', () => {
    const { exercises, issues } = parseIpaMarkdown(TWO_CLAUSE_FIXTURE, {
      file: '02-two-clause-exercises.md',
      collection: '02-two-clause-exercises',
    });
    expect(issues).toEqual([]);
    const first = exercises[0];
    expect(first.text).toBe('Ask now, but finish then.');
    expect(first.variations[0].markers).toEqual([
      { word: 'now', levels: [1, 3, 5] },
      { word: 'then', levels: [5, 1] },
    ]);
  });

  it('handles split-word and multi-word markers when cleaning the sentence', () => {
    const md = `## Exercises 1-20

1. **Deep conviction** — I be[lieve˥˩] in you. [˥ ˩ => ˥˩]
2. **Warm greeting** — [Good morning˧˦]. [˧ ˦ => ˧˦]
`;
    const { exercises, issues } = parseIpaMarkdown(md, { file: 'x.md', collection: 'x' });
    expect(issues).toEqual([]);
    expect(exercises[0].text).toBe('I believe in you.');
    expect(exercises[0].variations[0].markers).toEqual([
      { word: 'lieve', levels: [5, 1] },
    ]);
    expect(exercises[1].text).toBe('Good morning.');
    expect(exercises[1].variations[0].markers).toEqual([
      { word: 'Good morning', levels: [3, 4] },
    ]);
  });

  it('handles domain headings: numbering restarts per domain, ids stay unique', () => {
    // Format of 16-20-additional-aspects.md: five # N. DOMAIN blocks
    const md = `# 16. Status Signals — 100 Exercises

## Exercises 1-20: High Status

1. **Entitled** — I [deserve˥˩] this. [˥ ˩ => ˥˩]

# 17. Curiosity Modes — 100 Exercises

## Exercises 1-20: Wonder

1. **Awed** — [Look˩˧˥]. [˩ ˧ ˥ => ˩˧˥]
`;
    const { exercises, issues } = parseIpaMarkdown(md, { file: 'x.md', collection: 'agg' });
    expect(issues).toEqual([]);
    expect(exercises).toHaveLength(2);
    expect(exercises[0].id).toBe('ipa/agg/16/1');
    expect(exercises[1].id).toBe('ipa/agg/17/1');
  });

  it('ignores Format explainer lines and ellipsis placeholder lines', () => {
    const md = `## Exercises 1-20

**Format:** **Intention 1, Intention 2** — Sentence with [nuclear˥˩] syllables. [tone legend]

1. **Welcoming** — [Come˩˧˥] join us. [˩ ˧ ˥ => ˩˧˥]

[... 95 more exercises following the same IPA format]

100. **Total exclusion** — [Never˥˩] you. [˥ ˩ => ˥˩]
`;
    const { exercises, issues } = parseIpaMarkdown(md, { file: 'x.md', collection: 'x' });
    expect(issues).toEqual([]);
    expect(exercises).toHaveLength(2);
    expect(exercises[0].text).toBe('Come join us.');
    expect(exercises[1].number).toBe(100);
  });

  it('repairs a bold span that closes mid-word in the intention label', () => {
    // Real anomaly: IPA 04-emotional-range.md line 118
    const md = `## Exercises 81-100

96. **Tender fierce**ness — I'll [protect˥˩] you [always˨˦]. [˥ ˩ => ˥˩] [˨ ˦ => ˨˦]
`;
    const { exercises, issues } = parseIpaMarkdown(md, { file: 'x.md', collection: 'x' });
    expect(issues).toEqual([]);
    expect(exercises).toHaveLength(1);
    expect(exercises[0].variations[0].intention).toBe('Tender fierceness');
    expect(exercises[0].variations[0].markers).toHaveLength(2);
  });

  it('accepts legends whose left side is fused rather than spaced', () => {
    // Real variant: IPA 16-20-additional-aspects.md line 228
    const md = `## Exercises 1-20

7. **Deferential** — [Might˩˧] you consider? [˩˧ => ˩˧]
`;
    const { exercises, issues } = parseIpaMarkdown(md, { file: 'x.md', collection: 'x' });
    expect(issues).toEqual([]);
    expect(exercises[0].variations[0].markers).toEqual([
      { word: 'Might', levels: [1, 3] },
    ]);
  });

  it('reports numbered lines that do not match the entry format instead of dropping them', () => {
    const md = `## Exercises 1-20

1. *single asterisks* — [Go˥˩]. [˥ ˩ => ˥˩]
`;
    const { exercises, issues } = parseIpaMarkdown(md, { file: 'x.md', collection: 'x' });
    expect(exercises).toHaveLength(0);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toMatch(/entry format/i);
  });

  it('reports a mismatch between markers and legends as an issue, not a crash', () => {
    const broken = `## Exercises 1-20

1. **Odd entry** — [Go˥˩]. [˩ ˧ => ˩˧]
`;
    const { exercises, issues } = parseIpaMarkdown(broken, {
      file: 'x.md',
      collection: 'x',
    });
    expect(exercises).toHaveLength(1);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toMatch(/legend/i);
  });

  it('reports numbered lines with no tone markers', () => {
    const broken = `## Exercises 1-20

1. **No tones here** — Just a plain sentence.
`;
    const { exercises, issues } = parseIpaMarkdown(broken, {
      file: 'x.md',
      collection: 'x',
    });
    expect(exercises).toHaveLength(0);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toMatch(/marker/i);
  });
});
