import { median } from './calibration';
import { hzToSemitone, type TrackPoint } from './track';
import { hopSeconds } from './timing';

export type CalibrationStage = 'speech' | 'low' | 'high';
// Collection targets, not requirements to sustain a single vowel.
export const CALIBRATION_TARGET_SEC = { speech: 2.5, low: 0.7, high: 0.7 };
export const CALIBRATION_MIN_SEC = { speech: 8, low: 3, high: 3 };
export const CALIBRATION_MAX_SEC = { speech: 30, low: 12, high: 12 };
export const CALIBRATION_MIN_RMS = 0.0005;

/** Same periodicity gate as practice; a median over many frames tolerates quieter input. */
export function calibrationPitch(p: TrackPoint): boolean {
  return (
    p.hz !== null &&
    Number.isFinite(p.hz) &&
    p.hz >= 50 &&
    p.hz <= 800 &&
    p.clarity >= 0.6 &&
    Number.isFinite(p.rms) &&
    p.rms >= CALIBRATION_MIN_RMS
  );
}

/** Use captured audio time, so device startup cannot consume the recording budget. */
export function calibrationCaptureComplete(
  stage: CalibrationStage,
  audioSec: number,
  voicedSec: number,
  quietSec: number,
): boolean {
  return (
    audioSec >= CALIBRATION_MAX_SEC[stage] ||
    (audioSec >= CALIBRATION_MIN_SEC[stage] &&
      voicedSec >= CALIBRATION_TARGET_SEC[stage] - 1e-8 &&
      quietSec >= 0.6)
  );
}

/** Pack only usable frames for continuation; an insufficient sample stays bounded. */
export function retainCalibrationVoice(track: TrackPoint[]): TrackPoint[] {
  const hop = hopSeconds(track);
  return track.filter(calibrationPitch).map((p, i) => ({ ...p, t: i * hop }));
}

export interface SampleCheck {
  samples: number[];
  voicedSec: number;
  error: string | null;
  insufficient: boolean;
}
/** Quality gate before accepting a sample; medians resist isolated octave errors. */
export function checkCalibrationSample(
  track: TrackPoint[],
  stage: CalibrationStage,
  baseline?: number,
): SampleCheck {
  const voiced = track.filter(calibrationPitch);
  const voicedSec = voiced.length * hopSeconds(track);
  const samples = voiced.map((p) => p.hz!);
  const fail = (error: string, insufficient = false): SampleCheck => ({
    samples,
    voicedSec,
    error,
    insufficient,
  });
  if (voicedSec < CALIBRATION_TARGET_SEC[stage] - 1e-8) {
    if (voicedSec > 0)
      return fail(
        `${voicedSec.toFixed(1)} seconds of usable voice captured and kept. Continue this step to add a little more; pauses and consonants don’t count toward the voice total.`,
        true,
      );
    if (!track.length)
      return fail(
        'The microphone opened but no audio arrived. Check the selected input in your browser’s microphone settings, then try again.',
        true,
      );
    if (!track.some((p) => p.rms >= CALIBRATION_MIN_RMS))
      return fail(
        'The microphone signal is very quiet. Check that the correct input is selected and unmuted in your browser or system microphone settings.',
        true,
      );
    return fail(
      'Sound reached the microphone, but its pitch couldn’t be tracked. Check that the selected microphone is picking up your voice, and try again with less background noise.',
      true,
    );
  }
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
  return { samples, voicedSec, error: null, insufficient: false };
}
