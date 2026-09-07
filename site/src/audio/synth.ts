/** Synthesizes a contour as a soft hum so learners can hear tone shapes. */
import type { Calibration } from '../analysis/calibration';
import { levelToHz } from '../analysis/calibration';
import { resample } from '../analysis/compare';

export const DEFAULT_SYNTH_CAL: Calibration = { lowHz: 110, highHz: 220 };

let ctx: AudioContext | null = null;
let active: AudioScheduledSourceNode[] = [];

export function stopContour(): void {
  active.forEach((node) => {
    try {
      node.stop();
    } catch {
      /* Already finished. */
    }
  });
  active = [];
}

function audioCtx(): AudioContext {
  if (!ctx || ctx.state === 'closed') ctx = new AudioContext();
  void ctx.resume();
  return ctx;
}

/** Play tone levels (1..5) as a pitch glide over the given range. */
export function playContour(
  levels: number[],
  cal: Calibration = DEFAULT_SYNTH_CAL,
  durSec = 0.7,
): void {
  stopContour();
  if (levels.length === 0) return;
  const ac = audioCtx();
  const t0 = ac.currentTime + 0.04;

  const osc = ac.createOscillator();
  osc.type = 'sine';
  // Sample relative pitch so an asymmetric baseline agrees with the plotted guide.
  const freqs = resample(
    levels,
    Math.max(2, Math.min(128, Math.round(durSec / 0.01) + 1)),
  ).map((lvl) => levelToHz(lvl, cal));
  osc.frequency.setValueAtTime(freqs[0], t0);
  if (freqs.length > 1) {
    freqs.slice(1).forEach((hz, i) => {
      osc.frequency.exponentialRampToValueAtTime(
        hz,
        t0 + ((i + 1) / (freqs.length - 1)) * durSec,
      );
    });
  }

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(
    0.22,
    t0 + Math.min(0.015, durSec * 0.1),
  );
  gain.gain.setValueAtTime(0.22, t0 + durSec - Math.min(0.03, durSec * 0.15));
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durSec);

  osc.connect(gain).connect(ac.destination);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
    active = active.filter((node) => node !== osc);
  };
  active.push(osc);
  osc.start(t0);
  osc.stop(t0 + durSec + 0.01);
}
