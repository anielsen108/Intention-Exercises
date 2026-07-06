/** Pure logic behind the Learn section (shapes, quizzes). */

/**
 * Stylized contour shapes for ToBI tokens, as tone levels 1..5. Concatenated
 * they sketch the utterance melody a pattern like "H* L-L%" describes —
 * pedagogical approximations, not phonetic truth.
 */
const TOBI_TOKEN_SHAPES: Record<string, number[]> = {
  'H*': [4, 4],
  'L*': [2, 2],
  'L+H*': [2, 5],
  'H+L*': [5, 2],
  '!H*': [3, 3],
  'L-L%': [2, 1],
  'L-H%': [1, 3],
  'H-H%': [4, 5],
  'H-L%': [4, 4],
};

/** Sketch the melody of a ToBI pattern as a sequence of tone levels. */
export function contourForPattern(tokens: string[]): number[] {
  return tokens.flatMap((token) => TOBI_TOKEN_SHAPES[token] ?? []);
}

/**
 * Build shuffled multiple-choice options: the answer plus distractors drawn
 * from the pool, no duplicates. `rng` is injectable for testing.
 */
export function makeQuizChoices(
  answer: string,
  pool: string[],
  count: number,
  rng: () => number = Math.random,
): string[] {
  const distractors = pool.filter((p) => p !== answer);
  const choices = [answer];
  while (choices.length < count && distractors.length > 0) {
    const i = Math.floor(rng() * distractors.length);
    choices.push(distractors.splice(i, 1)[0]);
  }
  // Fisher–Yates shuffle.
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return choices;
}
