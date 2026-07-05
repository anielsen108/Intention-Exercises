import { describe, expect, it } from 'vitest';
import { scorePerformance } from '../src/analysis/performance';
import { semitoneToHz, hzToSemitone, type TrackPoint } from '../src/analysis/track';
import type { IpaToneMarker } from '../src/content/types';

const CAL = { lowHz: 110, highHz: 220 };
const LOW_ST = hzToSemitone(110);

function mkTrack(segs: { from: number; to: number; ms: number; voiced?: boolean }[]): TrackPoint[] {
  const track: TrackPoint[] = [];
  let t = 0;
  for (const seg of segs) {
    const n = Math.round(seg.ms / 10);
    for (let i = 0; i < n; i++) {
      const frac = n === 1 ? 0 : i / (n - 1);
      const pos = seg.from + frac * (seg.to - seg.from);
      track.push(
        seg.voiced === false
          ? { t, hz: null, clarity: 0, rms: 0.001 }
          : { t, hz: semitoneToHz(LOW_ST + pos * 12), clarity: 0.95, rms: 0.1 },
      );
      t += 0.01;
    }
  }
  return track;
}

const m = (word: string, levels: number[]): IpaToneMarker => ({ word, levels });

describe('scorePerformance', () => {
  it('pairs runs to markers in order when counts match, averaging scores', () => {
    // Two clauses: rise then fall — matching targets [1,5] and [5,1].
    const track = mkTrack([
      { from: 0.1, to: 0.9, ms: 300 },
      { from: 0, to: 0, ms: 300, voiced: false },
      { from: 0.9, to: 0.1, ms: 300 },
    ]);
    const result = scorePerformance(track, CAL, [m('now', [1, 5]), m('then', [5, 1])]);
    expect(result).not.toBeNull();
    expect(result!.perMarker).toHaveLength(2);
    expect(result!.perMarker[0].score).toBeGreaterThan(80);
    expect(result!.perMarker[1].score).toBeGreaterThan(80);
    expect(result!.score).toBeGreaterThan(80);
  });

  it('scores the nucleus against the best-matching marker when counts differ', () => {
    // One produced fall vs a two-marker target: should match the [5,1] marker.
    const track = mkTrack([{ from: 0.9, to: 0.1, ms: 300 }]);
    const result = scorePerformance(track, CAL, [m('now', [1, 5]), m('then', [5, 1])]);
    expect(result).not.toBeNull();
    expect(result!.perMarker).toHaveLength(1);
    expect(result!.perMarker[0].markerIndex).toBe(1);
    expect(result!.score).toBeGreaterThan(80);
  });

  it('returns null when nothing is voiced', () => {
    const track = mkTrack([{ from: 0, to: 0, ms: 300, voiced: false }]);
    expect(scorePerformance(track, CAL, [m('go', [5, 1])])).toBeNull();
  });
});
