import { describe, expect, it } from 'vitest';
import {
  bandOf,
  bandPosition,
  calibrationFromSamples,
} from '../src/analysis/calibration';

// One-octave speaking range: 110 Hz (low) to 220 Hz (high).
const CAL = { lowHz: 110, highHz: 220 };

describe('calibrationFromSamples', () => {
  it('takes the medians of the low and high sustained samples', () => {
    // True medians: [108,110,112,250] → 111; [100,218,220,222] → 219.
    const cal = calibrationFromSamples([108, 110, 112, 250], [218, 220, 222, 100]);
    expect(cal).not.toBeNull();
    expect(cal!.lowHz).toBeCloseTo(111, 0);
    expect(cal!.highHz).toBeCloseTo(219, 0);
  });

  it('rejects a range narrower than 4 semitones', () => {
    expect(calibrationFromSamples([200, 200, 200], [220, 220, 220])).toBeNull();
  });

  it('rejects empty samples', () => {
    expect(calibrationFromSamples([], [220])).toBeNull();
  });
});

describe('bandPosition', () => {
  it('maps the calibrated range onto 0..1 in log-frequency space', () => {
    expect(bandPosition(110, CAL)).toBeCloseTo(0, 6);
    expect(bandPosition(220, CAL)).toBeCloseTo(1, 6);
    // Geometric mean = halfway in semitones.
    expect(bandPosition(Math.sqrt(110 * 220), CAL)).toBeCloseTo(0.5, 6);
  });

  it('clamps outside the range', () => {
    expect(bandPosition(50, CAL)).toBe(0);
    expect(bandPosition(500, CAL)).toBe(1);
  });
});

describe('bandOf', () => {
  it('assigns five equal bands across the range', () => {
    expect(bandOf(110, CAL)).toBe(1);
    expect(bandOf(220, CAL)).toBe(5);
    expect(bandOf(Math.sqrt(110 * 220), CAL)).toBe(3);
  });

  it('clamps out-of-range frequencies to the edge bands', () => {
    expect(bandOf(60, CAL)).toBe(1);
    expect(bandOf(400, CAL)).toBe(5);
  });
});
