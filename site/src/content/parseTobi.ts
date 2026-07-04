import type { Exercise, ParseIssue, ParseResult, Variation } from './types';

export interface ParseContext {
  file: string;
  collection: string;
}

/**
 * `## 1. "Let it go."` (variant A1) or `### 66. "I'm fine" (when devastated)`
 * (variant A2/A3) — tolerates curly quotes and a trailing descriptor.
 */
const EXERCISE_HEADING_RE = /^#{2,3}\s+(\d+)\.\s+["“](.+?)["”]\s*(?:\(.*\))?\s*$/u;
/** `# 16. STATUS SIGNALS` — aggregate-file domain heading; numbering restarts. */
const DOMAIN_RE = /^#\s+(\d+)\.\s+(.+)$/u;
/** `## Authority Positions (1-25)` — section heading (exactly two #). */
const SECTION_RE = /^##\s+(.+)$/u;
/** `**Encouraging release**` on its own line (but not `**Note:**`). */
const INTENTION_RE = /^\*\*([^*]+?)\*\*\s*$/u;
/** `- ToBI: L* H* L-L%` etc. */
const FIELD_RE = /^-\s+(ToBI|Stress|Pause):\s*(.*)$/u;
/** Any other bullet = performance note. */
const NOTE_RE = /^-\s+(.*)$/u;

const FIELD_KEYS = { ToBI: 'tobi', Stress: 'stress', Pause: 'pauses' } as const;

interface Cursor {
  exercise: Exercise | null;
  variation: Variation | null;
  section?: string;
  domain?: number;
}

/**
 * Parse a ToBI-approach exercise file. Handles all three surveyed layouts:
 * flat `## N. "…"`, sectioned `## Section` + `### N. "…"`, and aggregate
 * `# N. DOMAIN` files where exercise numbering restarts per domain.
 */
export function parseTobiMarkdown(md: string, ctx: ParseContext): ParseResult {
  const exercises: Exercise[] = [];
  const issues: ParseIssue[] = [];
  const cur: Cursor = { exercise: null, variation: null };

  const lines = md.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '' || line === '---') continue;

    if (line.startsWith('#')) {
      finishExercise(cur, exercises, issues, ctx, i);
      consumeHeading(line, cur, ctx);
      continue;
    }

    if (!cur.exercise) continue; // prose outside exercises (blurbs, notes)

    const intention = line.match(INTENTION_RE);
    if (intention && !intention[1].endsWith(':')) {
      cur.variation = { intention: intention[1] };
      cur.exercise.variations.push(cur.variation);
      continue;
    }

    if (cur.variation) {
      consumeVariationLine(line, cur.variation, issues, ctx, i);
    } else {
      issues.push(issue(ctx, i, 'Line outside any variation block', line));
    }
  }
  finishExercise(cur, exercises, issues, ctx, lines.length);

  return { exercises, issues };
}

/** Interpret a heading line: exercise start, domain, section, or ignorable. */
function consumeHeading(line: string, cur: Cursor, ctx: ParseContext): void {
  const heading = line.match(EXERCISE_HEADING_RE);
  if (heading) {
    const number = Number(heading[1]);
    const idBase = cur.domain !== undefined ? `${cur.domain}/${number}` : `${number}`;
    cur.exercise = {
      id: `tobi/${ctx.collection}/${idBase}`,
      approach: 'tobi',
      collection: ctx.collection,
      section: cur.section,
      number,
      text: heading[2],
      variations: [],
    };
    return;
  }

  const domain = line.match(DOMAIN_RE);
  if (domain) {
    cur.domain = Number(domain[1]);
    cur.section = domain[2].trim();
    return;
  }

  const section = line.match(SECTION_RE);
  if (section) {
    // Interlude headings like `## 51-100. [Additional…]` and prose sections
    // like `## Practice Notes` land here too; their bodies are skipped
    // because no exercise is open.
    cur.section = section[1].trim();
  }
}

function consumeVariationLine(
  line: string,
  variation: Variation,
  issues: ParseIssue[],
  ctx: ParseContext,
  i: number,
): void {
  const field = line.match(FIELD_RE);
  if (field) {
    const key = FIELD_KEYS[field[1] as keyof typeof FIELD_KEYS];
    if (variation[key] !== undefined) {
      issues.push(issue(ctx, i, `Duplicate ${field[1]} bullet (keeping first)`, line));
    } else {
      variation[key] = field[2];
    }
    return;
  }
  const note = line.match(NOTE_RE);
  if (note) {
    variation.note = variation.note ? `${variation.note} ${note[1]}` : note[1];
    return;
  }
  issues.push(issue(ctx, i, 'Unrecognized line in variation block', line));
}

function finishExercise(
  cur: Cursor,
  exercises: Exercise[],
  issues: ParseIssue[],
  ctx: ParseContext,
  i: number,
): void {
  const ex = cur.exercise;
  cur.exercise = null;
  cur.variation = null;
  if (!ex) return;

  if (ex.variations.length === 0) {
    issues.push(issue(ctx, i, `Exercise ${ex.number} has no variations`, ex.text));
  }
  for (const v of ex.variations) {
    if (v.tobi === undefined) {
      issues.push(
        issue(ctx, i, `Variation "${v.intention}" of exercise ${ex.number} has no ToBI line`, ex.text),
      );
    }
  }
  exercises.push(ex);
}

function issue(ctx: ParseContext, lineIdx: number, message: string, excerpt: string): ParseIssue {
  return { file: ctx.file, line: lineIdx + 1, message, excerpt: excerpt.slice(0, 120) };
}
