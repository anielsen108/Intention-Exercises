/** Builds the notation overlay drawn on the pitch canvas after a take. */
import type { Calibration } from '../analysis/calibration';
import { bandPosition } from '../analysis/calibration';
import { breakIndex, type TobiApproximation } from '../analysis/tobi';
import type { TrackPoint, VoicedRun } from '../analysis/track';
import type { Transcription } from '../analysis/transcribe';
import { levelsToToneLetters } from '../content/tones';

export type OverlayMode = 'ipa' | 'tobi' | 'both' | 'off';

export interface CanvasAnnotation {
  /** Time within the take (seconds). */
  t: number;
  /** Vertical position, 0 (bottom) .. 1 (top). */
  pos: number;
  text: string;
  kind: 'ipa' | 'tobi-accent' | 'tobi-boundary' | 'tobi-break';
  /** Nucleus tone letters render larger. */
  emphasis?: boolean;
}

export function buildAnnotations(
  track: TrackPoint[],
  cal: Calibration,
  transcription: Transcription,
  tobi: TobiApproximation,
  mode: OverlayMode,
): CanvasAnnotation[] {
  if (mode === 'off') return [];
  const { runs, runLevels, nucleusIndex } = transcription;
  const annotations: CanvasAnnotation[] = [];

  if (mode === 'ipa' || mode === 'both') {
    runs.forEach((run, i) => {
      if (runLevels[i].length === 0) return;
      annotations.push({
        t: runCenter(track, run),
        pos: clamp(runMaxPos(track, run, cal) + 0.1, 0.08, 0.93),
        text: levelsToToneLetters(runLevels[i]),
        kind: 'ipa',
        emphasis: i === nucleusIndex,
      });
    });
  }

  if (mode === 'tobi' || mode === 'both') {
    runs.forEach((run, i) => {
      const accent = tobi.runAccents[i];
      if (!accent) return;
      annotations.push({
        t: runCenter(track, run),
        // Below the trace so ipa (above) and tobi don't collide in "both".
        pos: clamp(runMinPos(track, run, cal) - 0.12, 0.05, 0.9),
        text: accent,
        kind: 'tobi-accent',
      });
    });

    if (tobi.boundary) {
      const lastRun = runs[runs.length - 1];
      const endIdx = lastRun.end;
      const endHz = track[endIdx].hz;
      annotations.push({
        t: track[endIdx].t,
        pos: clamp((endHz !== null ? bandPosition(endHz, cal) : 0.5) - 0.12, 0.05, 0.9),
        text: tobi.boundary,
        kind: 'tobi-boundary',
      });
    }

    // Classify each inter-run gap directly (tobi.breaks is a filtered list,
    // so its indices don't align with gaps).
    for (let i = 1; i < runs.length; i++) {
      const gapStart = track[runs[i - 1].end].t;
      const gapEnd = track[runs[i].start].t;
      const bi = breakIndex(gapEnd - gapStart);
      if (bi === null) continue;
      annotations.push({
        t: (gapStart + gapEnd) / 2,
        pos: 0.06,
        text: String(bi),
        kind: 'tobi-break',
      });
    }
  }

  return annotations;
}

function runCenter(track: TrackPoint[], run: VoicedRun): number {
  return (track[run.start].t + track[run.end].t) / 2;
}

function runMaxPos(track: TrackPoint[], run: VoicedRun, cal: Calibration): number {
  return runPosExtreme(track, run, cal, Math.max, 0);
}

function runMinPos(track: TrackPoint[], run: VoicedRun, cal: Calibration): number {
  return runPosExtreme(track, run, cal, Math.min, 1);
}

function runPosExtreme(
  track: TrackPoint[],
  run: VoicedRun,
  cal: Calibration,
  pick: (a: number, b: number) => number,
  seed: number,
): number {
  let extreme = seed;
  for (let i = run.start; i <= run.end; i++) {
    const hz = track[i].hz;
    if (hz !== null) extreme = pick(extreme, bandPosition(hz, cal));
  }
  return extreme;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
