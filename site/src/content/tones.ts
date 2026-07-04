/** IPA tone letters ordered by level: index 0 = level 1 (extra low). */
export const TONE_LETTERS = ['˩', '˨', '˧', '˦', '˥'] as const;

const LEVEL_BY_LETTER = new Map<string, number>(
  TONE_LETTERS.map((letter, i) => [letter, i + 1]),
);

/** Matches one or more tone letters (used by parsers). */
export const TONE_RUN_RE = /[˩˨˧˦˥]+/u;

/**
 * "˥˩" or "˥ ˩" → [5, 1]. Throws if the string contains anything but tone
 * letters and spaces, or contains no tone letters at all.
 */
export function toneLettersToLevels(s: string): number[] {
  const levels: number[] = [];
  for (const ch of s) {
    if (ch === ' ') continue;
    const level = LEVEL_BY_LETTER.get(ch);
    if (level === undefined) {
      throw new Error(`Not a tone letter: "${ch}" in "${s}"`);
    }
    levels.push(level);
  }
  if (levels.length === 0) throw new Error(`No tone letters in "${s}"`);
  return levels;
}

/** [1, 3, 5] → "˩˧˥". Throws on levels outside 1–5. */
export function levelsToToneLetters(levels: number[]): string {
  return levels
    .map((level) => {
      const letter = TONE_LETTERS[level - 1];
      if (!Number.isInteger(level) || letter === undefined) {
        throw new Error(`Tone level out of range 1-5: ${level}`);
      }
      return letter;
    })
    .join('');
}
