import { describe, expect, it } from 'vitest';
import {
  automaticRegion,
  chartDomain,
  formatDuration,
  regionTrack,
  soundRegions,
} from '../src/analysis/timing';
import { coachTake } from '../src/analysis/coaching';
import type { TrackPoint } from '../src/analysis/track';
const CAL = { lowHz: 110, highHz: 220 };
function recording(
  parts: Array<[number, number | null, number | null]>,
): TrackPoint[] {
  const out: TrackPoint[] = [];
  for (const [duration, start, end] of parts) {
    const count = Math.round(duration * 100);
    for (let i = 0; i < count; i++)
      out.push({
        t: out.length * 0.01,
        hz:
          start && end
            ? start * (end / start) ** (i / Math.max(1, count - 1))
            : null,
        clarity: start ? 0.95 : 0,
        rms: start ? 0.1 : 0,
      });
  }
  return out;
}
describe('speech-scale analysis and display', () => {
  it('accepts a clear 150 ms fall and does not require the guide tempo', () => {
    const a = coachTake(
      recording([[0.15, 110 * 2 ** 0.7, 110 * 2 ** 0.1]]),
      CAL,
      [4, 1],
    );
    const b = coachTake(
      recording([[0.7, 110 * 2 ** 0.7, 110 * 2 ** 0.1]]),
      CAL,
      [4, 1],
    );
    expect(a.score).toBeGreaterThan(90);
    expect(Math.abs(a.score! - b.score!)).toBeLessThan(8);
    expect(
      coachTake(recording([[0.08, 180, 120]]), CAL, [4, 1]).score,
    ).toBeNull();
  });
  it('fits a 180 ms word despite seconds of silence and brief trailing pitch artifacts', () => {
    const points = recording([
      [1, null, null],
      [0.18, 180, 120],
      [0.5, null, null],
      [0.04, 80, 80],
      [6, null, null],
    ]);
    const regions = soundRegions(points);
    expect(regions).toHaveLength(1);
    expect(automaticRegion(regions)).toBe(0);
    const domain = chartDomain(points, false, 2, regions[0]);
    expect(domain.start).toBeCloseTo(1);
    expect(domain.end - domain.start).toBeCloseTo(0.18);
    const full = chartDomain(points, false, 2, regions[0], true);
    expect(full.end - full.start).toBeGreaterThan(7);
    expect(regionTrack(points, regions[0])).toHaveLength(18);
  });
  it('does not choose the easiest target when two substantial sounds compete', () => {
    const points = recording([
      [0.2, 120, 180],
      [0.3, null, null],
      [0.25, 180, 120],
    ]);
    const regions = soundRegions(points);
    expect(regions).toHaveLength(2);
    expect(automaticRegion(regions)).toBeNull();
    expect(coachTake(points, CAL, [4, 1]).score).toBeNull();
    expect(
      coachTake(regionTrack(points, regions[1]), CAL, [4, 1]).score,
    ).toBeGreaterThan(85);
  });
  it('bridges a 40 ms interruption without stretching an inter-word pause away', () => {
    expect(
      soundRegions(
        recording([
          [0.1, 180, 160],
          [0.04, null, null],
          [0.1, 150, 120],
        ]),
      ),
    ).toHaveLength(1);
    expect(
      soundRegions(
        recording([
          [0.1, 180, 160],
          [0.1, null, null],
          [0.1, 150, 120],
        ]),
      ),
    ).toHaveLength(2);
  });
  it('ignores sub-threshold background pitch and starts live display at voice onset', () => {
    const points = recording([
      [3, null, null],
      [0.2, 180, 120],
    ]);
    const domain = chartDomain(points, true, 2);
    expect(domain.start).toBeCloseTo(3);
    expect(domain.end - domain.start).toBeLessThan(1);
    expect(
      soundRegions(points.map((p) => ({ ...p, rms: 0.0001 }))),
    ).toHaveLength(0);
    expect(formatDuration(0.18)).toBe('180 ms');
  });
});
