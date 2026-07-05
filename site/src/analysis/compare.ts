import type { Calibration } from './calibration';
import { hzToSemitone } from './track';

/** Resample a sequence to n points via linear interpolation. */
export function resample(values: number[], n: number): number[] {
  if (values.length === 0) return [];
  if (values.length === 1) return new Array(n).fill(values[0]);
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * (values.length - 1);
    const lo = Math.floor(x);
    const hi = Math.min(values.length - 1, lo + 1);
    out[i] = values[lo] + (x - lo) * (values[hi] - values[lo]);
  }
  return out;
}

const DTW_N = 32;

/**
 * Dynamic-time-warping distance between two sequences of 0..1 values,
 * normalized by optimal path length (so it reads as "average vertical
 * mismatch"). Sequences are resampled to a common length first.
 */
export function dtwDistance(a: number[], b: number[]): number {
  const x = resample(a, DTW_N);
  const y = resample(b, DTW_N);
  const n = x.length;

  const cost = new Float64Array(n * n);
  const steps = new Int32Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const c = Math.abs(x[i] - y[j]);
      const k = i * n + j;
      if (i === 0 && j === 0) {
        cost[k] = c;
        steps[k] = 1;
        continue;
      }
      let bestCost = Infinity;
      let bestSteps = 0;
      if (i > 0 && cost[k - n] < bestCost) {
        bestCost = cost[k - n];
        bestSteps = steps[k - n];
      }
      if (j > 0 && cost[k - 1] < bestCost) {
        bestCost = cost[k - 1];
        bestSteps = steps[k - 1];
      }
      if (i > 0 && j > 0 && cost[k - n - 1] <= bestCost) {
        bestCost = cost[k - n - 1];
        bestSteps = steps[k - n - 1];
      }
      cost[k] = c + bestCost;
      steps[k] = bestSteps + 1;
    }
  }
  const last = n * n - 1;
  return cost[last] / steps[last];
}

/** Render target IPA tone levels (1..5) as an n-point 0..1 polyline. */
export function targetPolyline(levels: number[], n: number = DTW_N): number[] {
  const positions = levels.map((lvl) => (lvl - 1) / 4);
  return resample(positions, n);
}

/** Distance above which the score bottoms out at 0. */
const WORST_DISTANCE = 0.45;

export interface ContourScore {
  /** 0..100. */
  score: number;
  distance: number;
}

/**
 * Score a produced semitone contour against target IPA tone levels.
 * Both are normalized into the speaker's calibrated 0..1 range.
 */
export function scoreContour(
  producedSt: number[],
  targetLevels: number[],
  cal: Calibration,
): ContourScore {
  if (producedSt.length === 0 || targetLevels.length === 0) {
    return { score: 0, distance: Infinity };
  }
  const lowSt = hzToSemitone(cal.lowHz);
  const span = hzToSemitone(cal.highHz) - lowSt;
  const produced = producedSt.map((st) => Math.min(1, Math.max(0, (st - lowSt) / span)));

  const distance = dtwDistance(produced, targetPolyline(targetLevels));
  const score = Math.round(100 * Math.max(0, 1 - distance / WORST_DISTANCE));
  return { score, distance };
}
