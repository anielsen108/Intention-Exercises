import { describe, expect, it } from 'vitest';
import { dtwDistance, targetPolyline, scoreContour } from '../src/analysis/compare';

describe('dtwDistance', () => {
  it('is zero for identical sequences', () => {
    expect(dtwDistance([0, 0.5, 1], [0, 0.5, 1])).toBeCloseTo(0, 9);
  });

  it('equals the constant offset for parallel flat sequences', () => {
    expect(dtwDistance([0.2, 0.2, 0.2], [0.5, 0.5, 0.5])).toBeCloseTo(0.3, 6);
  });

  it('is robust to time warping of the same shape', () => {
    const slow = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1];
    const fast = [0, 0.5, 1];
    expect(dtwDistance(slow, fast)).toBeLessThan(0.08);
  });

  it('is large for opposite shapes', () => {
    const rise = [0, 0.25, 0.5, 0.75, 1];
    const fall = [1, 0.75, 0.5, 0.25, 0];
    expect(dtwDistance(rise, fall)).toBeGreaterThan(0.3);
  });
});

describe('targetPolyline', () => {
  it('renders a fall [5,1] as a descending 0..1 line', () => {
    const line = targetPolyline([5, 1], 5);
    expect(line[0]).toBeCloseTo(1, 6);
    expect(line[4]).toBeCloseTo(0, 6);
    expect(line[2]).toBeCloseTo(0.5, 6);
  });

  it('renders a single level as a constant', () => {
    expect(targetPolyline([3], 4)).toEqual([0.5, 0.5, 0.5, 0.5]);
  });
});

describe('scoreContour', () => {
  const CAL = { lowHz: 110, highHz: 220 };
  // Semitone values spanning the calibrated octave (45=110Hz … 57=220Hz).
  const riseSt = [45, 48, 51, 54, 57];
  const fallSt = [57, 54, 51, 48, 45];

  it('scores a matching contour high', () => {
    const { score } = scoreContour(riseSt, [1, 5], CAL);
    expect(score).toBeGreaterThan(85);
  });

  it('scores an opposite contour low', () => {
    const { score } = scoreContour(fallSt, [1, 5], CAL);
    expect(score).toBeLessThan(50);
  });

  it('returns zero score for an empty production', () => {
    expect(scoreContour([], [1, 5], CAL).score).toBe(0);
  });
});
