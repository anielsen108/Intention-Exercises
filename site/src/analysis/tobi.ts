/**
 * Heuristic, F0-only ToBI approximation. Boundary tones and break indices
 * are fairly reliable from pitch and pauses alone; pitch-accent labels are
 * genuinely approximate until word alignment lands (Phase 3b) — the UI must
 * present all of this as "approximate".
 */
import type { Calibration } from './calibration';
import { bandPosition } from './calibration';
import {
  runSemitones,
  semitoneToHz,
  voicedRuns,
  type TrackPoint,
  type VoicedRun,
} from './track';
import { RUN_OPTS, trackHopSec } from './transcribe';

export type BoundaryTone = 'L-L%' | 'L-H%' | 'H-H%' | 'H-L%';

export interface TobiApproximation {
  /** One heuristic accent label per voiced run (may be empty). */
  accents: string[];
  boundary: BoundaryTone | '';
  /** Break indices (2/3/4) for the pauses between voiced runs. */
  breaks: number[];
  /** Rendered label, e.g. "L+H* L-L%"; empty when nothing was voiced. */
  label: string;
}

/** Classify the final contour (0..1 range positions over the last ~250 ms). */
export function classifyBoundary(positions: number[]): BoundaryTone {
  const s = positions[0];
  const e = positions[positions.length - 1];
  const m = Math.min(...positions);

  if (e - s >= 0.15 && e >= 0.55) return 'H-H%';
  if (m <= s - 0.1 && e - m >= 0.12) return 'L-H%';
  if (e <= 0.4) return 'L-L%';
  return 'H-L%';
}

/** Heuristic accent label for one voiced run's range positions. */
function classifyAccent(positions: number[]): string | null {
  const max = Math.max(...positions);
  const maxIdx = positions.indexOf(max);
  const riseInto = max - Math.min(...positions.slice(0, maxIdx + 1));
  const mean = positions.reduce((a, b) => a + b, 0) / positions.length;

  if (riseInto >= 0.35) return 'L+H*';
  if (max >= 0.55) return 'H*';
  if (mean < 0.3) return 'L*';
  return null;
}

function breakIndex(gapSec: number): number | null {
  if (gapSec > 0.5) return 4;
  if (gapSec > 0.25) return 3;
  if (gapSec > 0.12) return 2;
  return null;
}

export function approximateTobi(track: TrackPoint[], cal: Calibration): TobiApproximation {
  const hopSec = trackHopSec(track);
  const runs = voicedRuns(track, { ...RUN_OPTS, hopSec });
  if (runs.length === 0) return { accents: [], boundary: '', breaks: [], label: '' };

  const runPositions = runs.map((run) =>
    runSemitones(track, run).map((st) => bandPosition(semitoneToHz(st), cal)),
  );

  const accents = runPositions
    .map((positions) => classifyAccent(positions))
    .filter((a): a is string => a !== null);

  const breaks: number[] = [];
  for (let i = 1; i < runs.length; i++) {
    const gap = track[runs[i].start].t - track[runs[i - 1].end].t;
    const bi = breakIndex(gap);
    if (bi !== null) breaks.push(bi);
  }

  const boundary = classifyBoundary(finalPositions(runPositions[runPositions.length - 1], hopSec));
  const label = [...accents, boundary].join(' ');
  return { accents, boundary, breaks, label };
}

/** The last ~250 ms of the final run (or all of it, if shorter). */
function finalPositions(positions: number[], hopSec: number): number[] {
  const n = Math.max(2, Math.round(0.25 / hopSec));
  return positions.slice(-n);
}

export type { VoicedRun };
