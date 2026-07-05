/** Pitch-track post-processing shared by the live view and the analyzers. */

export interface TrackPoint {
  /** Time in seconds from the start of the take. */
  t: number;
  hz: number | null;
  clarity: number;
  rms: number;
}

/** Inclusive index range of a voiced stretch within a track. */
export interface VoicedRun {
  start: number;
  end: number;
}

/** Hz → MIDI-style semitone number (A4 = 440 Hz = 69). */
export function hzToSemitone(hz: number): number {
  return 12 * Math.log2(hz / 440) + 69;
}

export function semitoneToHz(st: number): number {
  return 440 * 2 ** ((st - 69) / 12);
}

/** Sliding-window median; edges are padded by repeating the boundary value. */
export function medianSmooth(values: number[], window = 5): number[] {
  const half = Math.floor(window / 2);
  const n = values.length;
  return values.map((_, i) => {
    const slice: number[] = [];
    for (let k = i - half; k <= i + half; k++) {
      slice.push(values[Math.min(n - 1, Math.max(0, k))]);
    }
    slice.sort((a, b) => a - b);
    return slice[half];
  });
}

export interface VoicedRunOptions {
  minClarity: number;
  /** Runs shorter than this are discarded. */
  minDurSec: number;
  /** Unvoiced gaps shorter than this are bridged. */
  maxGapSec: number;
  /** Track sampling interval in seconds. */
  hopSec: number;
}

/** Find voiced stretches: clarity-gated, short gaps bridged, short runs dropped. */
export function voicedRuns(track: TrackPoint[], opts: VoicedRunOptions): VoicedRun[] {
  const voiced = track.map((p) => p.hz !== null && p.clarity >= opts.minClarity);
  const maxGap = Math.round(opts.maxGapSec / opts.hopSec);
  const minLen = Math.round(opts.minDurSec / opts.hopSec);

  const runs: VoicedRun[] = [];
  let start = -1;
  let lastVoiced = -1;
  for (let i = 0; i < voiced.length; i++) {
    if (!voiced[i]) continue;
    if (start === -1) {
      start = i;
    } else if (i - lastVoiced - 1 > maxGap) {
      runs.push({ start, end: lastVoiced });
      start = i;
    }
    lastVoiced = i;
  }
  if (start !== -1) runs.push({ start, end: lastVoiced });

  return runs.filter((r) => r.end - r.start + 1 >= minLen);
}

/** Smoothed semitone values of a run (nulls interpolated are not needed: run is voiced). */
export function runSemitones(track: TrackPoint[], run: VoicedRun): number[] {
  const values: number[] = [];
  for (let i = run.start; i <= run.end; i++) {
    const hz = track[i].hz;
    if (hz !== null) values.push(hzToSemitone(hz));
  }
  return medianSmooth(values, 5);
}
