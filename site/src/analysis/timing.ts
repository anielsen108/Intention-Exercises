import type { TrackPoint } from './track';
import { voicedRuns } from './track';

// Engineering thresholds, not a claim that all spoken tones last this long.
export const MIN_CONTOUR_SEC = 0.12;
export const ANALYSIS_HOP_SEC = 0.01;
export const ANALYSIS_FRAME_SEC = 0.06;
export const GUIDE_DURATIONS = [
  { label: 'Quick', seconds: 0.2 },
  { label: 'Conversational', seconds: 0.35 },
  { label: 'Slow practice', seconds: 0.7 },
] as const;

export function reliablePitch(p: TrackPoint): boolean {
  return (
    p.hz !== null &&
    Number.isFinite(p.hz) &&
    p.hz > 0 &&
    p.clarity >= 0.6 &&
    p.rms >= 0.003
  );
}
export function hopSeconds(track: TrackPoint[]): number {
  return track.length > 1
    ? Math.max(0.001, track[1].t - track[0].t)
    : ANALYSIS_HOP_SEC;
}
export interface SoundRegion {
  start: number;
  end: number;
  voicedSec: number;
  startIndex: number;
  endIndex: number;
}

/** Voiced regions, bridging only brief consonant/tracker gaps. No word recognition. */
export function soundRegions(track: TrackPoint[]): SoundRegion[] {
  const hopSec = hopSeconds(track);
  const gated = track.map((p) => (reliablePitch(p) ? p : { ...p, hz: null }));
  return voicedRuns(gated, {
    minClarity: 0.6,
    minDurSec: 0.08,
    maxGapSec: 0.06,
    hopSec,
  })
    .map((run) => ({
      start: track[run.start].t,
      end: track[run.end].t + hopSec,
      voicedSec:
        gated.slice(run.start, run.end + 1).filter(reliablePitch).length *
        hopSec,
      startIndex: run.start,
      endIndex: run.end,
    }))
    .filter((run) => run.voicedSec >= 0.06 - 1e-8);
}

/** Choose by duration only. A competing substantial sound requires user selection. */
export function automaticRegion(regions: SoundRegion[]): number | null {
  if (!regions.length) return null;
  if (regions.length === 1) return 0;
  const order = regions
    .map((r, i) => ({ i, duration: r.voicedSec }))
    .sort((a, b) => b.duration - a.duration);
  return order[0].duration >= MIN_CONTOUR_SEC &&
    order[1].duration < order[0].duration * 0.25
    ? order[0].i
    : null;
}
export function regionTrack(
  track: TrackPoint[],
  region?: SoundRegion,
): TrackPoint[] {
  return region ? track.slice(region.startIndex, region.endIndex + 1) : track;
}
export function formatDuration(seconds: number): string {
  return seconds < 1
    ? `${Math.round(seconds * 1000)} ms`
    : `${seconds.toFixed(2)} s`;
}

/** Shared time domain for the target ribbon and the recorded contour. */
export function chartDomain(
  track: TrackPoint[],
  running: boolean,
  windowSec: number,
  focus?: SoundRegion,
  fullTake = false,
) {
  const voiced = track.filter(reliablePitch);
  if (running) {
    const end = track.at(-1)?.t ?? 0;
    const first = voiced[0]?.t ?? end;
    const start = Math.max(first, end - windowSec);
    return { start, end: start + Math.max(0.6, end - start + 0.1) };
  }
  if (focus && !fullTake) return { start: focus.start, end: focus.end };
  const hop = hopSeconds(track);
  const start = fullTake ? 0 : (voiced[0]?.t ?? 0);
  const end = fullTake
    ? (track.at(-1)?.t ?? 0) + hop
    : (voiced.at(-1)?.t ?? start) + hop;
  return { start, end: Math.max(start + 0.12, end) };
}
