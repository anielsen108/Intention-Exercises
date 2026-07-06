import { describe, expect, it } from 'vitest';
import { bandOf, levelToHz } from '../src/analysis/calibration';
import { contourForPattern, makeQuizChoices } from '../src/ui/learn/helpers';

const CAL = { lowHz: 110, highHz: 220 };

describe('levelToHz', () => {
  it('maps each band to a frequency inside that band', () => {
    for (let level = 1; level <= 5; level++) {
      expect(bandOf(levelToHz(level, CAL), CAL)).toBe(level);
    }
  });

  it('is monotonically increasing and stays inside the calibrated range', () => {
    let prev = 0;
    for (let level = 1; level <= 5; level++) {
      const hz = levelToHz(level, CAL);
      expect(hz).toBeGreaterThan(prev);
      expect(hz).toBeGreaterThanOrEqual(CAL.lowHz);
      expect(hz).toBeLessThanOrEqual(CAL.highHz);
      prev = hz;
    }
  });
});

describe('contourForPattern', () => {
  it('renders a declarative fall (H* L-L%) ending at the bottom', () => {
    const levels = contourForPattern(['H*', 'L-L%']);
    expect(Math.max(...levels)).toBeGreaterThanOrEqual(4);
    expect(levels[levels.length - 1]).toBe(1);
  });

  it('renders a yes/no question (L* H-H%) ending at the top', () => {
    const levels = contourForPattern(['L*', 'H-H%']);
    expect(Math.min(...levels)).toBeLessThanOrEqual(2);
    expect(levels[levels.length - 1]).toBe(5);
  });

  it('renders a rise onto the accent for L+H*', () => {
    const levels = contourForPattern(['L+H*', 'L-L%']);
    const peak = Math.max(...levels);
    expect(levels[0]).toBeLessThan(peak);
    expect(levels.indexOf(peak)).toBeGreaterThan(0);
  });

  it('ignores unknown tokens rather than crashing', () => {
    expect(contourForPattern(['XYZ', 'L-L%'])).toEqual(contourForPattern(['L-L%']));
  });
});

describe('makeQuizChoices', () => {
  const pool = ['˥˩', '˩˥', '˩˧˥', '˥˩˥', '˧˧', '˨˦'];
  // Deterministic "rng" cycling through fractions.
  const rng = (() => {
    let i = 0;
    const seq = [0.1, 0.7, 0.4, 0.9, 0.2, 0.6];
    return () => seq[i++ % seq.length];
  })();

  it('returns the requested count with the answer included exactly once', () => {
    const choices = makeQuizChoices('˥˩', pool, 4, rng);
    expect(choices).toHaveLength(4);
    expect(choices.filter((c) => c === '˥˩')).toHaveLength(1);
  });

  it('contains no duplicates', () => {
    const choices = makeQuizChoices('˩˥', pool, 4, rng);
    expect(new Set(choices).size).toBe(choices.length);
  });

  it('caps at the pool size when asked for more than available', () => {
    const choices = makeQuizChoices('˥˩', ['˥˩', '˩˥'], 4, rng);
    expect(choices).toHaveLength(2);
  });
});
