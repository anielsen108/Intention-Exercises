import { hzToSemitone } from './track';

/** The speaker's comfortable pitch range, set once via the calibration flow. */
export interface Calibration {
  lowHz: number;
  highHz: number;
}

/** Minimum usable range: five bands need at least ~4 semitones. */
const MIN_SPAN_ST = 4;

function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Derive a calibration from the pitch samples of the "hold a low note" and
 * "hold a high note" steps. Returns null if unusable (empty or too narrow).
 */
export function calibrationFromSamples(
  lowSamples: number[],
  highSamples: number[],
): Calibration | null {
  if (lowSamples.length === 0 || highSamples.length === 0) return null;
  const lowHz = median(lowSamples);
  const highHz = median(highSamples);
  if (hzToSemitone(highHz) - hzToSemitone(lowHz) < MIN_SPAN_ST) return null;
  return { lowHz, highHz };
}

/** Position of a frequency within the calibrated range, 0..1, log-spaced, clamped. */
export function bandPosition(hz: number, cal: Calibration): number {
  const lowSt = hzToSemitone(cal.lowHz);
  const highSt = hzToSemitone(cal.highHz);
  const pos = (hzToSemitone(hz) - lowSt) / (highSt - lowSt);
  return Math.min(1, Math.max(0, pos));
}

/** IPA tone band (1 = extra low … 5 = extra high) for a frequency. */
export function bandOf(hz: number, cal: Calibration): number {
  return positionToBand(bandPosition(hz, cal));
}

/** Map a 0..1 range position to a band 1..5. */
export function positionToBand(pos: number): number {
  return Math.min(5, Math.max(1, Math.floor(pos * 5) + 1));
}
