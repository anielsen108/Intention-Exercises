/** Ties the analyzers together: score a whole take against a target variation. */
import type { Calibration } from './calibration';
import { scoreContour } from './compare';
import { runSemitones, type TrackPoint } from './track';
import { transcribe, type Transcription } from './transcribe';
import type { IpaToneMarker } from '../content/types';

export interface MarkerScore {
  markerIndex: number;
  score: number;
}

export interface PerformanceScore {
  /** Overall 0..100. */
  score: number;
  perMarker: MarkerScore[];
  transcription: Transcription;
}

/**
 * Score a take against the exercise's tone markers. When the number of voiced
 * runs equals the number of markers, pair them in order; otherwise score the
 * nuclear run against every marker and keep the best match.
 */
export function scorePerformance(
  track: TrackPoint[],
  cal: Calibration,
  markers: IpaToneMarker[],
): PerformanceScore | null {
  const transcription = transcribe(track, cal);
  if (transcription.nucleusIndex === -1 || markers.length === 0) return null;

  const { runs, nucleusIndex } = transcription;
  const perMarker: MarkerScore[] = [];

  if (runs.length === markers.length) {
    runs.forEach((run, i) => {
      const st = runSemitones(track, run);
      perMarker.push({ markerIndex: i, score: scoreContour(st, markers[i].levels, cal).score });
    });
  } else {
    const st = runSemitones(track, runs[nucleusIndex]);
    let best: MarkerScore = { markerIndex: 0, score: -1 };
    markers.forEach((marker, i) => {
      const { score } = scoreContour(st, marker.levels, cal);
      if (score > best.score) best = { markerIndex: i, score };
    });
    perMarker.push(best);
  }

  const score = Math.round(perMarker.reduce((a, s) => a + s.score, 0) / perMarker.length);
  return { score, perMarker, transcription };
}
