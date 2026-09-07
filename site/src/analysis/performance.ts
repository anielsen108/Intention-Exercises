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
 * runs equals the number of markers, pair them in order. Withhold a score when
 * alignment is ambiguous; selecting the best target would inflate feedback.
 */
export function scorePerformance(
  track: TrackPoint[],
  cal: Calibration,
  markers: IpaToneMarker[],
): PerformanceScore | null {
  const transcription = transcribe(track, cal);
  if (transcription.nucleusIndex === -1 || markers.length === 0) return null;

  const { runs } = transcription;
  if (runs.length !== markers.length) return null;
  const perMarker: MarkerScore[] = [];

  if (runs.length === markers.length) {
    runs.forEach((run, i) => {
      const st = runSemitones(track, run);
      perMarker.push({ markerIndex: i, score: scoreContour(st, markers[i].levels, cal).score });
    });
  }

  const score = Math.round(perMarker.reduce((a, s) => a + s.score, 0) / perMarker.length);
  return { score, perMarker, transcription };
}
