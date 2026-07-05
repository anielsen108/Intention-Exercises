import { describe, expect, it } from 'vitest';
import { transcribe } from '../src/analysis/transcribe';
import { semitoneToHz, hzToSemitone, type TrackPoint } from '../src/analysis/track';

const CAL = { lowHz: 110, highHz: 220 };
const HOP = 0.01;
const LOW_ST = hzToSemitone(110); // band 1 floor
const SPAN = 12; // one octave

/** Band center n (1..5) as a semitone value within the calibrated range. */
function bandSt(band: number): number {
  return LOW_ST + ((band - 0.5) / 5) * SPAN;
}

interface Seg {
  fromBand: number;
  toBand: number;
  ms: number;
  rms?: number;
  voiced?: boolean;
}

/** Build a synthetic pitch track from band-level segments. */
function mkTrack(segs: Seg[]): TrackPoint[] {
  const track: TrackPoint[] = [];
  let t = 0;
  for (const seg of segs) {
    const n = Math.round(seg.ms / 10);
    for (let i = 0; i < n; i++) {
      const frac = n === 1 ? 0 : i / (n - 1);
      const st = bandSt(seg.fromBand) + frac * (bandSt(seg.toBand) - bandSt(seg.fromBand));
      track.push(
        seg.voiced === false
          ? { t, hz: null, clarity: 0, rms: 0.001 }
          : { t, hz: semitoneToHz(st), clarity: 0.95, rms: seg.rms ?? 0.1 },
      );
      t += HOP;
    }
  }
  return track;
}

describe('transcribe', () => {
  it('transcribes a high fall as [5, 1]', () => {
    const track = mkTrack([{ fromBand: 5, toBand: 1, ms: 300 }]);
    const result = transcribe(track, CAL);
    expect(result.levels).toEqual([5, 1]);
  });

  it('transcribes a low rise as [1, 3]', () => {
    const track = mkTrack([{ fromBand: 1, toBand: 3, ms: 300 }]);
    expect(transcribe(track, CAL).levels).toEqual([1, 3]);
  });

  it('transcribes a rise-fall as [1, 5, 1]', () => {
    const track = mkTrack([
      { fromBand: 1, toBand: 5, ms: 200 },
      { fromBand: 5, toBand: 1, ms: 200 },
    ]);
    expect(transcribe(track, CAL).levels).toEqual([1, 5, 1]);
  });

  it('transcribes a level tone as a single band', () => {
    const track = mkTrack([{ fromBand: 3, toBand: 3, ms: 300 }]);
    expect(transcribe(track, CAL).levels).toEqual([3]);
  });

  it('ignores micro-wobble below the prominence threshold', () => {
    // Fall 5→1 with a tiny 0.5-semitone bump in the middle.
    const track = mkTrack([{ fromBand: 5, toBand: 1, ms: 300 }]);
    const mid = Math.floor(track.length / 2);
    track[mid] = {
      ...track[mid],
      hz: semitoneToHz(hzToSemitone(track[mid].hz!) + 0.5),
    };
    expect(transcribe(track, CAL).levels).toEqual([5, 1]);
  });

  it('picks the run with the largest excursion × energy as the nucleus', () => {
    const track = mkTrack([
      { fromBand: 3, toBand: 3, ms: 200, rms: 0.05 }, // flat, quiet
      { fromBand: 3, toBand: 3, ms: 100, voiced: false },
      { fromBand: 5, toBand: 1, ms: 300, rms: 0.15 }, // big fall, loud → nucleus
    ]);
    const result = transcribe(track, CAL);
    expect(result.levels).toEqual([5, 1]);
    expect(result.nucleusIndex).toBe(1); // second voiced run
  });

  it('returns empty levels when nothing is voiced', () => {
    const track = mkTrack([{ fromBand: 3, toBand: 3, ms: 300, voiced: false }]);
    const result = transcribe(track, CAL);
    expect(result.levels).toEqual([]);
    expect(result.nucleusIndex).toBe(-1);
  });
});
