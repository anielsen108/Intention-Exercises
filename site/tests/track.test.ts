import { describe, expect, it } from 'vitest';
import {
  hzToSemitone,
  semitoneToHz,
  medianSmooth,
  voicedRuns,
  type TrackPoint,
} from '../src/analysis/track';

function pt(t: number, hz: number | null, clarity = 0.9, rms = 0.1): TrackPoint {
  return { t, hz, clarity, rms };
}

describe('semitone conversion', () => {
  it('maps A4=440 to MIDI 69 and octaves to ±12', () => {
    expect(hzToSemitone(440)).toBeCloseTo(69, 6);
    expect(hzToSemitone(220)).toBeCloseTo(57, 6);
    expect(hzToSemitone(880)).toBeCloseTo(81, 6);
  });

  it('round-trips', () => {
    for (const hz of [100, 173.3, 440]) {
      expect(semitoneToHz(hzToSemitone(hz))).toBeCloseTo(hz, 6);
    }
  });
});

describe('medianSmooth', () => {
  it('removes an isolated spike', () => {
    const smoothed = medianSmooth([10, 10, 40, 10, 10], 3);
    expect(smoothed[2]).toBe(10);
  });

  it('preserves a monotone ramp', () => {
    expect(medianSmooth([1, 2, 3, 4, 5], 3)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('voicedRuns', () => {
  const hop = 0.01; // 10 ms

  it('finds a single run and drops unvoiced edges', () => {
    const track = [
      pt(0, null, 0),
      pt(0.01, null, 0),
      ...Array.from({ length: 20 }, (_, i) => pt(0.02 + i * hop, 200)),
      pt(0.22, null, 0),
    ];
    const runs = voicedRuns(track, { minClarity: 0.5, minDurSec: 0.08, maxGapSec: 0.06, hopSec: hop });
    expect(runs).toHaveLength(1);
    expect(runs[0].start).toBe(2);
    expect(runs[0].end).toBe(21); // inclusive index of last voiced point
  });

  it('bridges gaps shorter than maxGapSec but splits on longer ones', () => {
    const voiced = (t0: number, n: number) =>
      Array.from({ length: n }, (_, i) => pt(t0 + i * hop, 200));
    const gap = (t0: number, n: number) =>
      Array.from({ length: n }, (_, i) => pt(t0 + i * hop, null, 0));
    const track = [
      ...voiced(0, 15),
      ...gap(0.15, 3), // 30 ms — bridge
      ...voiced(0.18, 15),
      ...gap(0.33, 30), // 300 ms — split
      ...voiced(0.63, 15),
    ];
    const runs = voicedRuns(track, { minClarity: 0.5, minDurSec: 0.08, maxGapSec: 0.06, hopSec: hop });
    expect(runs).toHaveLength(2);
  });

  it('drops runs shorter than minDurSec', () => {
    const track = [
      ...Array.from({ length: 4 }, (_, i) => pt(i * hop, 200)), // 40 ms
      ...Array.from({ length: 10 }, (_, i) => pt(0.04 + i * hop, null, 0)),
    ];
    const runs = voicedRuns(track, { minClarity: 0.5, minDurSec: 0.08, maxGapSec: 0.06, hopSec: hop });
    expect(runs).toHaveLength(0);
  });
});
