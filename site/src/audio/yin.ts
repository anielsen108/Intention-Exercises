/**
 * YIN pitch detection (de Cheveigné & Kawahara 2002), steps 1-3 + parabolic
 * interpolation. Pure function — runs the same in tests and in the browser.
 */

export interface PitchEstimate {
  /** Detected fundamental in Hz, or null when the frame is not periodic. */
  hz: number | null;
  /** 0..1; roughly "how periodic is this frame". */
  clarity: number;
}

export interface YinOptions {
  fMin?: number;
  fMax?: number;
  /** CMND threshold below which a dip counts as the period (step 4). */
  threshold?: number;
}

const SILENCE_RMS = 1e-4;

export function yinDetect(
  frame: Float32Array,
  sampleRate: number,
  { fMin = 60, fMax = 500, threshold = 0.15 }: YinOptions = {},
): PitchEstimate {
  let sumSq = 0;
  for (let i = 0; i < frame.length; i++) sumSq += frame[i] * frame[i];
  if (Math.sqrt(sumSq / frame.length) < SILENCE_RMS) {
    return { hz: null, clarity: 0 };
  }

  const tauMin = Math.max(2, Math.floor(sampleRate / fMax));
  const tauMax = Math.min(Math.floor(sampleRate / fMin), Math.floor(frame.length / 2));
  const w = frame.length - tauMax; // fixed window so all taus are comparable

  // Difference function d(tau), then cumulative-mean-normalized d'(tau).
  const cmnd = new Float64Array(tauMax + 1);
  cmnd[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    let d = 0;
    for (let i = 0; i < w; i++) {
      const delta = frame[i] - frame[i + tau];
      d += delta * delta;
    }
    runningSum += d;
    cmnd[tau] = runningSum === 0 ? 1 : (d * tau) / runningSum;
  }

  // First dip under threshold; walk to its local minimum.
  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    if (cmnd[t] < threshold) {
      while (t + 1 <= tauMax && cmnd[t + 1] < cmnd[t]) t++;
      tau = t;
      break;
    }
  }
  // Fallback: global minimum in range (low clarity, caller may gate).
  if (tau === -1) {
    let best = tauMin;
    for (let t = tauMin + 1; t <= tauMax; t++) {
      if (cmnd[t] < cmnd[best]) best = t;
    }
    tau = best;
  }

  const clarity = Math.max(0, 1 - cmnd[tau]);
  if (clarity < 0.5) return { hz: null, clarity };

  // Parabolic interpolation around the chosen tau.
  let refined = tau;
  if (tau > tauMin && tau < tauMax) {
    const a = cmnd[tau - 1];
    const b = cmnd[tau];
    const c = cmnd[tau + 1];
    const denom = a - 2 * b + c;
    if (denom !== 0) refined = tau + (a - c) / (2 * denom) / 1;
  }

  return { hz: sampleRate / refined, clarity };
}
