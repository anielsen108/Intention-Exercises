import { describe, expect, it } from 'vitest';
import { parseTobiMarkdown } from '../src/content/parseTobi';

// Verbatim excerpt from ToBI-approach/01-general-exercises.md
const GENERAL_FIXTURE = `# General Exercises — Short Phrases

100 foundation exercises using brief, everyday phrases. Practice clean intention shifts with minimal text.

---

## 1. "Let it go."

**Encouraging release**
- ToBI: L* H* L-L%
- Stress: Let it **GO**
- Pause: Let , it **go**.
- Breathy tone, slow fall.

**Irritated command**
- ToBI: H+L* L* L-L%
- Stress: **LET** it go
- Pause: **LET** it go.
- Strong "let," clipped tempo.

**Resigned self-talk**
- ToBI: L* L* L-L%
- Stress: Let it go
- Pause: Let it // go.
- Low pitch, internalized pacing.

---

## 2. "That'll do."

**Satisfied closure**
- ToBI: H* L* L-L%
- Stress: **THAT'LL** do
- Pause: **That'll** do.
- Low fall, relaxed timing.
`;

describe('parseTobiMarkdown', () => {
  it('parses exercises with sentence text and numbering', () => {
    const { exercises, issues } = parseTobiMarkdown(GENERAL_FIXTURE, {
      file: '01-general-exercises.md',
      collection: '01-general-exercises',
    });
    expect(issues).toEqual([]);
    expect(exercises).toHaveLength(2);
    expect(exercises[0].number).toBe(1);
    expect(exercises[0].text).toBe('Let it go.');
    expect(exercises[0].approach).toBe('tobi');
    expect(exercises[0].id).toBe('tobi/01-general-exercises/1');
    expect(exercises[1].text).toBe("That'll do.");
  });

  it('parses all variations with their fields', () => {
    const { exercises } = parseTobiMarkdown(GENERAL_FIXTURE, {
      file: '01-general-exercises.md',
      collection: '01-general-exercises',
    });
    const v = exercises[0].variations;
    expect(v).toHaveLength(3);
    expect(v[0]).toMatchObject({
      intention: 'Encouraging release',
      tobi: 'L* H* L-L%',
      stress: 'Let it **GO**',
      pauses: 'Let , it **go**.',
      note: 'Breathy tone, slow fall.',
    });
    expect(v[2].intention).toBe('Resigned self-talk');
    expect(v[2].pauses).toBe('Let it // go.');
  });

  it('reports an issue for a variation missing a ToBI line, but still keeps parsing', () => {
    const broken = `## 1. "Hello."

**Warm greeting**
- Stress: **HELLO**
- Pause: Hello.
- Bright tone.

## 2. "Goodbye."

**Flat farewell**
- ToBI: L* L-L%
- Stress: Goodbye
- Pause: Goodbye.
- Level pitch.
`;
    const { exercises, issues } = parseTobiMarkdown(broken, {
      file: 'x.md',
      collection: 'x',
    });
    expect(exercises).toHaveLength(2);
    expect(exercises[0].variations[0].tobi).toBeUndefined();
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].message).toMatch(/ToBI/);
  });

  it('parses ### headings under ## section headings, with trailing descriptors', () => {
    // Format of 04-15 specialized files (variant A2)
    const md = `# Power Dynamics

## Authority Positions (1-25)

### 1. "Do it now."

**Commanding authority**
- ToBI: H* L* H+L* L-L%
- Stress: **DO** it now
- Pause: Do it now.
- Sharp, non-negotiable, downward finality.

### 66. "I'm fine" (when devastated)

**Brave front**
- ToBI: H* L-L%
- Stress: I'm **FINE**
- Pause: I'm fine.
- Tight, controlled.
`;
    const { exercises, issues } = parseTobiMarkdown(md, { file: 'x.md', collection: 'x' });
    expect(issues).toEqual([]);
    expect(exercises).toHaveLength(2);
    expect(exercises[0].section).toBe('Authority Positions (1-25)');
    expect(exercises[0].text).toBe('Do it now.');
    expect(exercises[1].text).toBe("I'm fine");
    expect(exercises[1].number).toBe(66);
  });

  it('handles aggregate files: # N. DOMAIN headings restart numbering; ids stay unique', () => {
    // Format of 16-20 / 21-30 aggregate files (variant A3)
    const md = `# 16. STATUS SIGNALS

Exploring high-status and low-status vocal displays.

## High Status Displays (1-25)

### 1. "I'll decide."

**Entitled authority**
- ToBI: H* L+H* L-L%
- Stress: **I'LL** decide
- Pause: I'll decide.
- Downward pitch, claiming power.

# 17. CURIOSITY MODES

## Wonder (1-25)

### 1. "What is that?"

**Open wonder**
- ToBI: L* H* L-H%
- Stress: What is **THAT**
- Pause: What is **that**?
- Rising, breathy.
`;
    const { exercises, issues } = parseTobiMarkdown(md, { file: 'x.md', collection: 'agg' });
    expect(issues).toEqual([]);
    expect(exercises).toHaveLength(2);
    expect(exercises[0].id).not.toBe(exercises[1].id);
    expect(exercises[0].id).toBe('tobi/agg/16/1');
    expect(exercises[1].id).toBe('tobi/agg/17/1');
  });

  it('skips interlude headings and Practice Notes prose without inventing variations', () => {
    const md = `## 1. "Let it go."

**Encouraging release**
- ToBI: L* H* L-L%
- Stress: Let it **GO**
- Pause: Let , it **go**.
- Breathy tone, slow fall.

## 51-100. [Additional exercises follow same pattern]

**Note:** The remaining exercises continue with the same structure.

## Practice Notes

Work through these slowly. Some prose here.
`;
    const { exercises, issues } = parseTobiMarkdown(md, { file: 'x.md', collection: 'x' });
    expect(issues).toEqual([]);
    expect(exercises).toHaveLength(1);
    expect(exercises[0].variations).toHaveLength(1);
  });

  it('reports a duplicated field bullet and keeps the first value', () => {
    // Real anomaly: 02-two-clause ex 16 has two Stress bullets (second should be Pause)
    const md = `## 16. "Wow, okay."

**Impressed-concerned**
- ToBI: H* L-H% // L* L-L%
- Stress: **WOW** okay
- Stress: Wow / okay
- Bright then flat.
`;
    const { exercises, issues } = parseTobiMarkdown(md, { file: 'x.md', collection: 'x' });
    expect(exercises[0].variations[0].stress).toBe('**WOW** okay');
    expect(issues.some((i) => /duplicate/i.test(i.message))).toBe(true);
  });

  it('ignores prose between the title and the first exercise heading', () => {
    const { exercises, issues } = parseTobiMarkdown(GENERAL_FIXTURE, {
      file: 'x.md',
      collection: 'x',
    });
    expect(issues).toEqual([]);
    expect(exercises[0].variations[0].intention).toBe('Encouraging release');
  });
});
