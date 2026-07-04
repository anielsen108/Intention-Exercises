import { toneLettersToLevels } from './tones';
import type { Exercise, IpaToneMarker, ParseIssue, ParseResult } from './types';
import type { ParseContext } from './parseTobi';

/**
 * `1. **Firm command** — [Stop˥˩]. [˥ ˩ => ˥˩]` — em-dash separator per the
 * corpus convention. Group 3 catches label text spilling past the bold close
 * (real anomaly: `**Tender fierce**ness`).
 */
const ENTRY_RE = /^(\d+)\.\s+\*\*(.+?)\*\*([^—–]*?)\s*[—–]\s*(.+)$/u;
/** Any numbered line — used to flag entries that fail ENTRY_RE. */
const NUMBERED_RE = /^\d+\.\s/u;
/** A tone legend block: `[˥ ˩ => ˥˩]` — left side may be spaced or fused. */
const LEGEND_RE = /\[\s*([˩˨˧˦˥](?:\s*[˩˨˧˦˥])*)\s*=>\s*[˩˨˧˦˥\s]+\]/gu;
/** A tone-marked word: `[Stop˥˩]` (word may contain letters, apostrophes, hyphens). */
const MARKER_RE = /\[([^\[\]˩˨˧˦˥]+?)([˩˨˧˦˥]+)\]/gu;
const SECTION_RE = /^##\s+(.+)$/u;
/** `# 16. Status Signals — 100 Exercises` — domain heading; numbering restarts. */
const DOMAIN_RE = /^#\s+(\d+)\.\s*(.+)$/u;

/**
 * Parse an IPA-approach exercise file: numbered one-line entries
 * `N. **Intention** — sentence with [word˥˩] markers. [legends]`
 * grouped under `## Section` headings.
 */
export function parseIpaMarkdown(md: string, ctx: ParseContext): ParseResult {
  const exercises: Exercise[] = [];
  const issues: ParseIssue[] = [];
  let section: string | undefined;
  let domain: number | undefined;

  const lines = md.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    const sectionMatch = line.match(SECTION_RE);
    if (sectionMatch) {
      section = sectionMatch[1].trim();
      continue;
    }

    const domainMatch = line.match(DOMAIN_RE);
    if (domainMatch) {
      domain = Number(domainMatch[1]);
      section = domainMatch[2].trim();
      continue;
    }

    const entry = line.match(ENTRY_RE);
    if (!entry) {
      if (NUMBERED_RE.test(line)) {
        issues.push({
          file: ctx.file,
          line: i + 1,
          message: 'Numbered line does not match entry format',
          excerpt: line.slice(0, 120),
        });
      }
      continue;
    }

    const parsed = parseEntryBody(entry[4], ctx, i, issues);
    if (!parsed) continue;

    const number = Number(entry[1]);
    const intention = (entry[2] + entry[3]).trim();
    exercises.push({
      id: `ipa/${ctx.collection}/${domain !== undefined ? `${domain}/` : ''}${number}`,
      approach: 'ipa',
      collection: ctx.collection,
      section,
      number,
      text: parsed.text,
      variations: [
        {
          intention,
          sentence: parsed.text,
          markers: parsed.markers,
        },
      ],
    });
  }

  return { exercises, issues };
}

interface EntryBody {
  text: string;
  markers: IpaToneMarker[];
}

function parseEntryBody(
  body: string,
  ctx: ParseContext,
  lineIdx: number,
  issues: ParseIssue[],
): EntryBody | null {
  // Pull out and remove the trailing legends, counting them for validation.
  let legendCount = 0;
  const withoutLegends = body.replace(LEGEND_RE, () => {
    legendCount++;
    return '';
  });

  const markers: IpaToneMarker[] = [];
  const text = withoutLegends
    .replace(MARKER_RE, (_m, word: string, tones: string) => {
      markers.push({ word: word.trim(), levels: toneLettersToLevels(tones) });
      return word.trim();
    })
    .replace(/\s+/g, ' ')
    .trim();

  if (markers.length === 0) {
    issues.push({
      file: ctx.file,
      line: lineIdx + 1,
      message: 'Entry has no tone markers',
      excerpt: body.slice(0, 120),
    });
    return null;
  }

  if (legendCount !== markers.length || !legendsMatchMarkers(body, markers)) {
    issues.push({
      file: ctx.file,
      line: lineIdx + 1,
      message: `Tone legends do not match markers (${markers.length} markers, ${legendCount} legends)`,
      excerpt: body.slice(0, 120),
    });
  }

  return { text, markers };
}

/** Check that each legend's spaced tones equal the corresponding marker's contour. */
function legendsMatchMarkers(body: string, markers: IpaToneMarker[]): boolean {
  const legendLevels: number[][] = [];
  for (const m of body.matchAll(LEGEND_RE)) {
    legendLevels.push(toneLettersToLevels(m[1]));
  }
  if (legendLevels.length !== markers.length) return false;
  return markers.every(
    (marker, i) =>
      legendLevels[i].length === marker.levels.length &&
      legendLevels[i].every((lvl, j) => lvl === marker.levels[j]),
  );
}
