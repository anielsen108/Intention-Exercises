import { hzToSemitone, semitoneToHz } from './track';

/** Plot boundaries, plus a measured habitual-speaking center in newer profiles. */
export interface Calibration {
  lowHz: number;
  highHz: number;
  midHz?: number;
  version?: 2;
}

/** Minimum usable range: five bands need at least ~4 semitones. */
const MIN_SPAN_ST = 4;

export function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
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
  return semitonePosition(hzToSemitone(hz), cal);
}

/** Piecewise log scale: the measured speaking baseline always sits at medium. */
export function semitonePosition(st: number, cal: Calibration): number {
  const lowSt = hzToSemitone(cal.lowHz),
    highSt = hzToSemitone(cal.highHz);
  const midSt = cal.midHz ? hzToSemitone(cal.midHz) : (lowSt + highSt) / 2;
  const pos =
    st <= midSt
      ? (0.5 * (st - lowSt)) / (midSt - lowSt)
      : 0.5 + (0.5 * (st - midSt)) / (highSt - midSt);
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

/** Center frequency of a tone band (1..5) — the inverse of bandOf. */
export function levelToHz(level: number, cal: Calibration): number {
  const lowSt = hzToSemitone(cal.lowHz),
    highSt = hzToSemitone(cal.highHz);
  const midSt = cal.midHz ? hzToSemitone(cal.midHz) : (lowSt + highSt) / 2;
  const pos = (level - 0.5) / 5;
  return semitoneToHz(
    pos <= 0.5
      ? lowSt + pos * 2 * (midSt - lowSt)
      : midSt + (pos - 0.5) * 2 * (highSt - midSt),
  );
}

/** The two easy endpoint samples become band centers, not unreachable edges. */
export function calibrationFromSpeech(
  speech: number[],
  low: number[],
  high: number[],
): Calibration | null {
  if (
    ![speech, low, high].every(
      (xs) =>
        xs.length &&
        xs.every((hz) => Number.isFinite(hz) && hz >= 50 && hz <= 800),
    )
  )
    return null;
  const midHz = median(speech),
    midSt = hzToSemitone(midHz);
  const lowSt = hzToSemitone(median(low)),
    highSt = hzToSemitone(median(high));
  // A repeatable distinction on each side; never invent a symmetric range.
  if (midSt - lowSt < 2 || highSt - midSt < 2) return null;
  const cal: Calibration = {
    lowHz: semitoneToHz(midSt - (midSt - lowSt) * 1.25),
    highHz: semitoneToHz(midSt + (highSt - midSt) * 1.25),
    midHz,
    version: 2,
  };
  return cal.lowHz >= 30 && cal.highHz <= 1500 ? cal : null;
}

export const LEVEL_NAMES = ['Very low', 'Low', 'Medium', 'High', 'Very high'];
