import { describe, expect, it } from 'vitest';
import { buildAnnotations } from '../src/ui/annotations';
import { approximateTobi } from '../src/analysis/tobi';
import { transcribe } from '../src/analysis/transcribe';
import { semitoneToHz, hzToSemitone, type TrackPoint } from '../src/analysis/track';

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

// Two clauses (rise, then fall) separated by a 300 ms pause.
const TRACK = mkTrack([
  { from: 0.1, to: 0.9, ms: 300 },
  { from: 0, to: 0, ms: 300, voiced: false },
  { from: 0.9, to: 0.1, ms: 300 },
]);
const TRANSCRIPTION = transcribe(TRACK, CAL);
const TOBI = approximateTobi(TRACK, CAL);

describe('buildAnnotations', () => {
  it('returns nothing when mode is off', () => {
    expect(buildAnnotations(TRACK, CAL, TRANSCRIPTION, TOBI, 'off')).toEqual([]);
  });

  it('in ipa mode: one tone-letter annotation per voiced run, nucleus emphasized', () => {
    const anns = buildAnnotations(TRACK, CAL, TRANSCRIPTION, TOBI, 'ipa');
    expect(anns).toHaveLength(2);
    expect(anns.every((a) => a.kind === 'ipa')).toBe(true);
    expect(anns.filter((a) => a.emphasis)).toHaveLength(1);
    expect(anns[0].text).toBe('˩˥'); // rise across the octave
    expect(anns[1].text).toBe('˥˩');
  });

  it('in tobi mode: accents per run, a boundary at the end, a break in the gap', () => {
    const anns = buildAnnotations(TRACK, CAL, TRANSCRIPTION, TOBI, 'tobi');
    const kinds = anns.map((a) => a.kind);
    expect(kinds.filter((k) => k === 'tobi-accent')).toHaveLength(2);
    expect(kinds.filter((k) => k === 'tobi-boundary')).toHaveLength(1);
    expect(kinds.filter((k) => k === 'tobi-break')).toHaveLength(1);
    const boundary = anns.find((a) => a.kind === 'tobi-boundary')!;
    expect(boundary.text).toBe('L-L%');
    // The break sits inside the pause between the runs (0.3s–0.6s).
    const brk = anns.find((a) => a.kind === 'tobi-break')!;
    expect(brk.t).toBeGreaterThan(0.3);
    expect(brk.t).toBeLessThan(0.6);
  });

  it('in both mode: ipa and tobi annotations together', () => {
    const anns = buildAnnotations(TRACK, CAL, TRANSCRIPTION, TOBI, 'both');
    expect(anns.some((a) => a.kind === 'ipa')).toBe(true);
    expect(anns.some((a) => a.kind === 'tobi-accent')).toBe(true);
  });

  it('places annotations within the take and the 0..1 vertical range', () => {
    const anns = buildAnnotations(TRACK, CAL, TRANSCRIPTION, TOBI, 'both');
    const tEnd = TRACK[TRACK.length - 1].t;
    for (const a of anns) {
      expect(a.t).toBeGreaterThanOrEqual(0);
      expect(a.t).toBeLessThanOrEqual(tEnd + 0.01);
      expect(a.pos).toBeGreaterThanOrEqual(0);
      expect(a.pos).toBeLessThanOrEqual(1);
    }
  });
});
