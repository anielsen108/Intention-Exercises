import { median } from './calibration';
import { hzToSemitone, type TrackPoint } from './track';
import { hopSeconds, reliablePitch } from './timing';

export type CalibrationStage = 'speech' | 'low' | 'high';
export interface SampleCheck {
  samples: number[];
  voicedSec: number;
  error: string | null;
}
/** Quality gate before accepting a calibration sample; medians resist isolated octave errors. */
export function checkCalibrationSample(
  track: TrackPoint[],
  stage: CalibrationStage,
  baseline?: number,
): SampleCheck {
  const voiced = track.filter(
    (p) => reliablePitch(p) && p.clarity >= 0.8 && p.hz! >= 50 && p.hz! <= 800,
  );
  const voicedSec = voiced.length * hopSeconds(track);
  const samples = voiced.map((p) => p.hz!);
  const fail = (error: string): SampleCheck => ({ samples, voicedSec, error });
  if (voicedSec < (stage === 'speech' ? 2.5 : 0.7))
    return fail(
      stage === 'speech'
        ? 'We need at least 2.5 seconds of clear voiced speech. Read the whole passage at your ordinary pace, closer to the microphone if needed.'
        : 'We need a little more clear voice. Say the short phrase or hum comfortably for the full countdown.',
    );
  if (voiced.filter((p) => p.rms > 0.45).length > voiced.length * 0.1)
    return fail(
      'The microphone input is too loud. Move a little farther away and use an easy speaking volume.',
    );
  const mid = median(samples);
  if (stage !== 'speech') {
    const deviations = samples.map((hz) =>
      Math.abs(hzToSemitone(hz) - hzToSemitone(mid)),
    );
    if (median(deviations) > 2)
      return fail(
        'That sample moved around too much. Use one easy, fairly steady register for this step.',
      );
    if (
      baseline &&
      (stage === 'low'
        ? 12 * Math.log2(baseline / mid) < 2
        : 12 * Math.log2(mid / baseline) < 2)
    )
      return fail(
        `That was too close to your usual speaking pitch. Try a clearly ${stage === 'low' ? 'lower' : 'higher'} register that still feels easy.`,
      );
  }
  return { samples, voicedSec, error: null };
}
