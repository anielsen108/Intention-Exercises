import type { Calibration } from './calibration';
import { positionToBand } from './calibration';
import {
  hzToSemitone,
  runSemitones,
  voicedRuns,
  type TrackPoint,
  type VoicedRun,
} from './track';

/** Pitch swings smaller than this (semitones) are not contour turns. */
const PROMINENCE_ST = 1.0;
/** At most start + two turns + end. */
const MAX_ANCHORS = 4;

export const RUN_OPTS = { minClarity: 0.6, minDurSec: 0.08, maxGapSec: 0.06 };

export interface Transcription {
  /** IPA tone levels (1..5) of the nuclear run's contour; empty if unvoiced. */
  levels: number[];
  /** Index into `runs` of the nucleus, or -1. */
  nucleusIndex: number;
  runs: VoicedRun[];
  /** Tone levels for every voiced run, parallel to `runs`. */
  runLevels: number[][];
}

export function trackHopSec(track: TrackPoint[]): number {
  return track.length >= 2 ? track[1].t - track[0].t : 0.01;
}

/** Transcribe a recorded pitch track into IPA tone levels. */
export function transcribe(track: TrackPoint[], cal: Calibration): Transcription {
  const runs = voicedRuns(track, { ...RUN_OPTS, hopSec: trackHopSec(track) });
  if (runs.length === 0) return { levels: [], nucleusIndex: -1, runs, runLevels: [] };

  const runLevels = runs.map((run) => contourLevels(runSemitones(track, run), cal));
  const nucleusIndex = pickNucleus(track, runs);
  return { levels: runLevels[nucleusIndex], nucleusIndex, runs, runLevels };
}

/** Nucleus = the voiced run with the largest pitch excursion × mean energy. */
export function pickNucleus(track: TrackPoint[], runs: VoicedRun[]): number {
  let best = 0;
  let bestScore = -Infinity;
  runs.forEach((run, i) => {
    const st = runSemitones(track, run);
    const excursion = Math.max(...st) - Math.min(...st);
    let rmsSum = 0;
    for (let j = run.start; j <= run.end; j++) rmsSum += track[j].rms;
    const meanRms = rmsSum / (run.end - run.start + 1);
    const score = (excursion + 0.5) * meanRms;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

/**
 * Reduce a smoothed semitone contour to IPA tone levels: keep the endpoints
 * plus direction reversals larger than the prominence threshold, quantize
 * each anchor to a band, and collapse repeats.
 */
export function contourLevels(semitones: number[], cal: Calibration): number[] {
  if (semitones.length === 0) return [];
  const anchors = zigzagAnchors(semitones, PROMINENCE_ST).slice(0, MAX_ANCHORS);

  const lowSt = hzToSemitone(cal.lowHz);
  const span = hzToSemitone(cal.highHz) - lowSt;
  const levels = anchors.map((i) => {
    const pos = Math.min(1, Math.max(0, (semitones[i] - lowSt) / span));
    return positionToBand(pos);
  });

  return levels.filter((lvl, i) => i === 0 || lvl !== levels[i - 1]);
}

/** Indices of endpoints + direction reversals with swing ≥ prominence. */
function zigzagAnchors(values: number[], prominence: number): number[] {
  const anchors = [0];
  let dir = 0;
  let candidate = 0;
  for (let i = 1; i < values.length; i++) {
    if (dir === 0) {
      if (Math.abs(values[i] - values[0]) >= prominence) {
        dir = Math.sign(values[i] - values[0]);
        candidate = i;
      }
    } else if (dir > 0) {
      if (values[i] >= values[candidate]) candidate = i;
      else if (values[candidate] - values[i] >= prominence) {
        anchors.push(candidate);
        dir = -1;
        candidate = i;
      }
    } else {
      if (values[i] <= values[candidate]) candidate = i;
      else if (values[i] - values[candidate] >= prominence) {
        anchors.push(candidate);
        dir = 1;
        candidate = i;
      }
    }
  }
  const last = values.length - 1;
  if (anchors[anchors.length - 1] !== last) anchors.push(last);
  return anchors;
}
