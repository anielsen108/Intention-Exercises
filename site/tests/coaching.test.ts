import { describe, expect, it } from 'vitest';
import { coachTake, describeShape } from '../src/analysis/coaching';
import { levelToHz } from '../src/analysis/calibration';
import { targetPolyline, scoreContour } from '../src/analysis/compare';
import { hzToSemitone, type TrackPoint } from '../src/analysis/track';
import { SESSIONS, sessionSteps } from '../src/content/sessions';
const CAL = { lowHz: 110, highHz: 220 };
function track(levels: number[], duration = 1): TrackPoint[] {
  return targetPolyline(levels, Math.round(duration * 100)).map((p, i) => ({
    t: i * 0.01,
    hz: CAL.lowHz * 2 ** p,
    clarity: 0.95,
    rms: 0.1,
  }));
}
describe('practice feedback', () => {
  it('scores the audible band-center guide consistently with the plotted guide', () => {
    const levels = [1, 3, 5];
    expect(
      scoreContour(
        levels.map((l) => hzToSemitone(levelToHz(l, CAL))),
        levels,
        CAL,
      ).score,
    ).toBe(100);
    expect(coachTake(track([4, 1]), CAL, [4, 1]).score).toBeGreaterThan(95);
  });
  it('gives a directional next attempt for a reversed delivery', () => {
    const feedback = coachTake(track([1, 5]), CAL, [5, 1]);
    expect(feedback.title).toBe('Let the ending settle');
    expect(feedback.score).toBeLessThan(50);
    expect(feedback.usable).toBe(true);
  });
  it('does not score silence, weak tracking, a very short take, or multiple voiced stretches', () => {
    const silent = track([3]).map((p) => ({ ...p, hz: null, rms: 0 }));
    const unclear = track([3]).map((p) => ({ ...p, clarity: 0.1 }));
    const split = track([4, 1]).map((p, i) =>
      i > 35 && i < 60 ? { ...p, hz: null, rms: 0 } : p,
    );
    for (const input of [silent, unclear, track([3], 0.1), split]) {
      const result = coachTake(input, CAL, [4, 1]);
      expect(result.score).toBeNull();
      expect(result.usable).toBe(false);
    }
  });
  it('withholds scores for excessive input and out-of-range voices', () => {
    expect(
      coachTake(
        track([4, 1]).map((p) => ({ ...p, rms: 0.8 })),
        CAL,
        [4, 1],
      ).score,
    ).toBeNull();
    expect(
      coachTake(
        track([4, 1]).map((p) => ({ ...p, hz: p.hz! * 3 })),
        CAL,
        [4, 1],
      ).title,
    ).toContain('outside');
  });
  it('offers listening feedback without an emotion score for a whole sentence', () => {
    const result = coachTake(track([4, 1]), CAL);
    expect(result.usable).toBe(true);
    expect(result.score).toBeNull();
    expect(result.cue).toContain('stressed word');
  });
  it('names interior turns without confusing them with endpoint direction', () => {
    expect(describeShape([4, 1, 3])).toBe('Fall, then rise');
    expect(describeShape([2, 5, 3])).toBe('Rise, then fall');
    expect(describeShape([3, 3])).toBe('Keep the pitch steady');
  });
});
describe('guided curriculum', () => {
  it('has 24 unique, resumable deliveries with playable targets and useful coaching', () => {
    const steps = SESSIONS.flatMap(sessionSteps);
    expect(steps).toHaveLength(24);
    expect(new Set(steps.map((s) => s.key)).size).toBe(24);
    for (const session of SESSIONS)
      for (const exercise of session.exercises)
        for (const v of exercise.variations) {
          expect(exercise.text.toLowerCase()).toContain(
            v.markers![0].word.toLowerCase(),
          );
          expect(v.situation.length).toBeGreaterThan(20);
          expect(v.action.length).toBeGreaterThan(20);
          expect(v.listenFor.endsWith('?')).toBe(true);
          expect(v.markers![0].levels.every((l) => l >= 1 && l <= 5)).toBe(
            true,
          );
        }
  });
});
