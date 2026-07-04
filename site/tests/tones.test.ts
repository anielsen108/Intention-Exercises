import { describe, expect, it } from 'vitest';
import {
  TONE_LETTERS,
  levelsToToneLetters,
  toneLettersToLevels,
} from '../src/content/tones';

describe('toneLettersToLevels', () => {
  it('maps each of the five tone letters to its level', () => {
    expect(toneLettersToLevels('˥')).toEqual([5]);
    expect(toneLettersToLevels('˦')).toEqual([4]);
    expect(toneLettersToLevels('˧')).toEqual([3]);
    expect(toneLettersToLevels('˨')).toEqual([2]);
    expect(toneLettersToLevels('˩')).toEqual([1]);
  });

  it('maps contour sequences', () => {
    expect(toneLettersToLevels('˥˩')).toEqual([5, 1]);
    expect(toneLettersToLevels('˩˧˥')).toEqual([1, 3, 5]);
    expect(toneLettersToLevels('˦˨˦')).toEqual([4, 2, 4]);
  });

  it('ignores spaces between tone letters', () => {
    expect(toneLettersToLevels('˩ ˧ ˥')).toEqual([1, 3, 5]);
  });

  it('throws on non-tone characters', () => {
    expect(() => toneLettersToLevels('˥x˩')).toThrow(/tone/i);
    expect(() => toneLettersToLevels('')).toThrow(/tone/i);
  });
});

describe('levelsToToneLetters', () => {
  it('round-trips with toneLettersToLevels', () => {
    for (const s of ['˥˩', '˩˧˥', '˧', '˨˦˨', '˥˥']) {
      expect(levelsToToneLetters(toneLettersToLevels(s))).toBe(s);
    }
  });

  it('rejects out-of-range levels', () => {
    expect(() => levelsToToneLetters([0])).toThrow(/level/i);
    expect(() => levelsToToneLetters([6])).toThrow(/level/i);
  });
});

describe('TONE_LETTERS', () => {
  it('is ordered from level 1 to level 5', () => {
    expect(TONE_LETTERS).toEqual(['˩', '˨', '˧', '˦', '˥']);
  });
});
