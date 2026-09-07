import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { yinDetect } from '../src/audio/yin';
import { median } from '../src/analysis/calibration';
import {
  calibrationCaptureComplete,
  calibrationPitch,
  checkCalibrationSample,
  retainCalibrationVoice,
} from '../src/analysis/calibrationSample';
import type { TrackPoint } from '../src/analysis/track';

// A real read-speech recording, not a periodic oscillator. Attribution beside the WAV.
const wav = readFileSync(
  new URL('./fixtures/voices-speech.wav', import.meta.url),
);
let pcm = new Float32Array();
for (let offset = 12; offset + 8 < wav.length;) {
  const id = wav.toString('ascii', offset, offset + 4);
  const length = wav.readUInt32LE(offset + 4);
  if (id === 'fmt ') {
    if (
      wav.readUInt16LE(offset + 8) !== 1 ||
      wav.readUInt16LE(offset + 10) !== 1 ||
      wav.readUInt32LE(offset + 12) !== 16000 ||
      wav.readUInt16LE(offset + 22) !== 16
    )
      throw new Error('Fixture must be mono 16 kHz PCM16');
  }
  if (id === 'data')
    pcm = Float32Array.from(
      { length: length / 2 },
      (_, i) => wav.readInt16LE(offset + 8 + i * 2) / 32768,
    );
  offset += 8 + length + (length % 2);
}
if (!pcm.length) throw new Error('Missing speech fixture');

function analyze(input: Float32Array): TrackPoint[] {
  const track: TrackPoint[] = [];
  for (let start = 0; start + 960 <= input.length; start += 160) {
    const frame = input.subarray(start, start + 960);
    track.push({
      t: (start + 480) / 16000,
      ...yinDetect(frame, 16000),
      rms: Math.sqrt(
        frame.reduce((sum, value) => sum + value * value, 0) / frame.length,
      ),
    });
  }
  return track;
}
function speech(gain = 1): TrackPoint[] {
  const input = new Float32Array(8 * 16000);
  const phrase = pcm.map((value) => value * gain);
  input.set(phrase, Math.round(0.3 * 16000));
  input.set(phrase, Math.round(4.1 * 16000));
  return analyze(input);
}

describe('calibration with recorded speech', () => {
  const normal = speech();
  const quiet = speech(0.02);
  it('accepts ordinary speech that the old 0.8 periodicity gate rejected', () => {
    const oldSeconds =
      normal.filter((p) => p.hz && p.clarity >= 0.8 && p.rms >= 0.003).length *
      0.01;
    expect(oldSeconds).toBeLessThan(2.5);
    const checked = checkCalibrationSample(normal, 'speech');
    expect(checked.error).toBeNull();
    expect(checked.voicedSec).toBeGreaterThan(3);
  });
  it('keeps the speech median consistent when microphone gain is reduced fiftyfold', () => {
    const checked = checkCalibrationSample(quiet, 'speech');
    expect(checked.error).toBeNull();
    expect(checked.voicedSec).toBeGreaterThan(3);
    const difference =
      12 *
      Math.log2(
        median(checked.samples) /
          median(checkCalibrationSample(normal, 'speech').samples),
      );
    expect(Math.abs(difference)).toBeLessThan(0.5);
  });
  it('keeps a partial passage and adds the next recording without counting its pauses', () => {
    const first = quiet.filter((p) => p.t < 4);
    const partial = checkCalibrationSample(first, 'speech');
    expect(partial.insufficient).toBe(true);
    expect(partial.voicedSec).toBeGreaterThan(1);
    const kept = retainCalibrationVoice(first);
    expect(kept.length).toBeLessThan(250);
    expect(kept.every(calibrationPitch)).toBe(true);
    const next = quiet.filter((p) => p.t >= 4);
    const offset = kept.at(-1)!.t + 0.01 - next[0].t;
    const combined = [...kept, ...next.map((p) => ({ ...p, t: p.t + offset }))];
    expect(checkCalibrationSample(combined, 'speech').error).toBeNull();
    expect(checkCalibrationSample(combined, 'speech').voicedSec).toBeCloseTo(
      checkCalibrationSample(quiet, 'speech').voicedSec,
    );
  });
  it('still rejects silence and broadband noise, with different recovery instructions', () => {
    expect(checkCalibrationSample([], 'speech').error).toContain(
      'no audio arrived',
    );
    expect(
      checkCalibrationSample(analyze(new Float32Array(16000)), 'speech').error,
    ).toContain('very quiet');
    let seed = 42;
    const noise = Float32Array.from({ length: 4 * 16000 }, () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return (seed / 4294967296 - 0.5) * 0.2;
    });
    const checked = checkCalibrationSample(analyze(noise), 'speech');
    expect(checked.samples).toHaveLength(0);
    expect(checked.error).toContain('pitch couldn’t be tracked');
  });
});

describe('calibration recording budget', () => {
  it('extends past eight seconds when speech is incomplete, and waits for a pause when it is complete', () => {
    expect(calibrationCaptureComplete('speech', 8, 1.9, 1)).toBe(false);
    expect(calibrationCaptureComplete('speech', 12, 3.1, 0)).toBe(false);
    expect(calibrationCaptureComplete('speech', 12, 3.1, 0.7)).toBe(true);
    expect(calibrationCaptureComplete('speech', 0, 0, 0)).toBe(false);
  });
  it('caps each recording even without a usable voice, while allowing endpoints extra time', () => {
    expect(calibrationCaptureComplete('speech', 30, 0, 30)).toBe(true);
    expect(calibrationCaptureComplete('low', 3, 0.5, 1)).toBe(false);
    expect(calibrationCaptureComplete('high', 5, 0.9, 0.7)).toBe(true);
    expect(calibrationCaptureComplete('low', 12, 0.2, 1)).toBe(true);
  });
});
