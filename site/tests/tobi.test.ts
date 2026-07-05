import { describe, expect, it } from 'vitest';
import { classifyBoundary, approximateTobi } from '../src/analysis/tobi';
import { semitoneToHz, hzToSemitone, type TrackPoint } from '../src/analysis/track';

const CAL = { lowHz: 110, highHz: 220 };
const LOW_ST = hzToSemitone(110);
const HOP = 0.01;

/** Positions are 0..1 within the calibrated range. */
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
      t += HOP;
    }
  }
  return track;
}

describe('classifyBoundary', () => {
  it('final fall to the bottom → L-L%', () => {
    expect(classifyBoundary([0.6, 0.45, 0.3, 0.15, 0.05])).toBe('L-L%');
  });

  it('final rise to the top → H-H%', () => {
    expect(classifyBoundary([0.4, 0.55, 0.7, 0.85, 0.95])).toBe('H-H%');
  });

  it('fall then rise → L-H%', () => {
    expect(classifyBoundary([0.5, 0.3, 0.15, 0.3, 0.45])).toBe('L-H%');
  });

  it('high plateau → H-L%', () => {
    expect(classifyBoundary([0.7, 0.7, 0.68, 0.7, 0.69])).toBe('H-L%');
  });
});

describe('approximateTobi', () => {
  it('labels a rise-fall utterance with a bitonal accent and a low boundary', () => {
    const track = mkTrack([
      { from: 0.2, to: 0.9, ms: 250 },
      { from: 0.9, to: 0.05, ms: 300 },
    ]);
    const result = approximateTobi(track, CAL);
    expect(result.boundary).toBe('L-L%');
    expect(result.accents).toContain('L+H*');
    expect(result.label).toMatch(/L\+H\*.*L-L%$/);
  });

  it('labels a high level utterance ending in a rise as H* H-H%', () => {
    const track = mkTrack([
      { from: 0.7, to: 0.7, ms: 300 },
      { from: 0.7, to: 0.95, ms: 200 },
    ]);
    const result = approximateTobi(track, CAL);
    expect(result.boundary).toBe('H-H%');
    expect(result.accents).toContain('H*');
  });

  it('labels a low flat utterance with L* and L-L%', () => {
    const track = mkTrack([{ from: 0.15, to: 0.1, ms: 400 }]);
    const result = approximateTobi(track, CAL);
    expect(result.accents).toContain('L*');
    expect(result.boundary).toBe('L-L%');
  });

  it('assigns break indices from pause lengths', () => {
    const track = mkTrack([
      { from: 0.5, to: 0.5, ms: 200 },
      { from: 0, to: 0, ms: 300, voiced: false }, // 300 ms gap → BI 3
      { from: 0.5, to: 0.2, ms: 200 },
    ]);
    const result = approximateTobi(track, CAL);
    expect(result.breaks).toEqual([3]);
  });

  it('returns an empty label when nothing is voiced', () => {
    const track = mkTrack([{ from: 0, to: 0, ms: 300, voiced: false }]);
    const result = approximateTobi(track, CAL);
    expect(result.label).toBe('');
  });
});
