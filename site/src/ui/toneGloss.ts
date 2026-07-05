/** Hover descriptions for ToBI tokens and IPA tone contours. */
import { levelsToToneLetters } from '../content/tones';

const TOBI_GLOSSES: Record<string, string> = {
  'H*': 'High pitch accent — the stressed syllable is prominent on a high tone',
  'L*': 'Low pitch accent — the stressed syllable is prominent on a low tone',
  'L+H*': 'Rising pitch accent — rise from low up to an accented high peak',
  'H+L*': 'Falling pitch accent — fall from high onto an accented low',
  '!H*': 'Downstepped high accent — high, but stepped down from the previous peak',
  'L+!H*': 'Rising accent to a downstepped high — rise to a peak lower than the last one',
  'H+!H*': 'Slight fall onto a downstepped high accent',
  'L-L%': 'Low phrase accent + low boundary — falling contour; finality, completion',
  'L-H%': 'Low phrase accent + high boundary — fall then rise; continuation or uncertainty',
  'H-H%': 'High phrase accent + high boundary — strong rise; yes/no question, appeal',
  'H-L%': 'High phrase accent + low boundary — high plateau, level ending; expectancy',
  'H-': 'High phrase accent — the stretch after the last accent stays high',
  'L-': 'Low phrase accent — the stretch after the last accent falls low',
  '%H': 'High initial boundary tone — the phrase starts high',
  '//': 'Major break — full intonational-phrase boundary (break index 4)',
  '/': 'Minor break — intermediate-phrase boundary (break index 3)',
};

/** Description for one ToBI token, or null when unrecognized. */
export function tobiGloss(token: string): string | null {
  return TOBI_GLOSSES[token] ?? null;
}

const LEVEL_NAMES = ['extra-low', 'low', 'mid', 'high', 'extra-high'];

interface Shape {
  name: string;
  typical: string;
}

function contourShape(levels: number[]): Shape {
  const deltas: number[] = [];
  for (let i = 1; i < levels.length; i++) deltas.push(Math.sign(levels[i] - levels[i - 1]));
  const rises = deltas.some((d) => d > 0);
  const falls = deltas.some((d) => d < 0);

  if (rises && falls) {
    return deltas.find((d) => d !== 0)! > 0
      ? { name: 'Rise-fall', typical: 'emphasis, contrast, correction' }
      : { name: 'Fall-rise', typical: 'reservation, implicature, irony' };
  }
  if (rises) return { name: 'Rising', typical: 'questions, invitations, politeness' };
  if (falls) return { name: 'Falling', typical: 'finality, certainty, commands' };
  return { name: 'Level', typical: 'suspension, flatness, holding the floor' };
}

/** Description of an IPA tone contour, e.g. [5,1] → "Falling (˥˩): …". */
export function ipaGloss(levels: number[]): string {
  const shape = contourShape(levels);
  const names = levels.map((lvl) => LEVEL_NAMES[lvl - 1]).join(' → ');
  return `${shape.name} (${levelsToToneLetters(levels)}): ${names}. Typical: ${shape.typical}.`;
}
