import { describe, expect, it } from 'vitest';
import {
  bandPosition,
  bandOf,
  calibrationFromSpeech,
  levelToHz,
  semitonePosition,
} from '../src/analysis/calibration';
import { checkCalibrationSample } from '../src/analysis/calibrationSample';
import { scoreContour, targetPolyline } from '../src/analysis/compare';
import { hzToSemitone, type TrackPoint } from '../src/analysis/track';
import { contourLevels } from '../src/analysis/transcribe';
const samples = (hz: number, n = 300): TrackPoint[] =>
  Array.from({ length: n }, (_, i) => ({
    t: i * 0.01,
    hz,
    clarity: 0.95,
    rms: 0.1,
  }));

describe('calibration from ordinary speech', () => {
  const cal = calibrationFromSpeech(
    [150, 150, 150, 300],
    [100, 100, 100, 200],
    [240, 240, 240, 120],
  )!;
  it('anchors medium to the speech median and very low/high to the easy endpoint samples', () => {
    expect(cal.midHz).toBe(150);
    expect(cal.version).toBe(2);
    expect(levelToHz(1, cal)).toBeCloseTo(100);
    expect(levelToHz(3, cal)).toBeCloseTo(150);
    expect(levelToHz(5, cal)).toBeCloseTo(240);
    expect(levelToHz(2, cal)).toBeCloseTo(Math.sqrt(100 * 150));
    expect(levelToHz(4, cal)).toBeCloseTo(Math.sqrt(150 * 240));
  });
  it('keeps playback, plotted positions, transcription and scoring on the same asymmetric scale', () => {
    for (let level = 1; level <= 5; level++) {
      expect(bandOf(levelToHz(level, cal), cal)).toBe(level);
      expect(bandPosition(levelToHz(level, cal), cal)).toBeCloseTo(
        (level - 0.5) / 5,
      );
    }
    const levels = [5, 1, 4];
    const produced = targetPolyline(levels, 61).map((p) =>
      hzToSemitone(levelToHz(p * 5 + 0.5, cal)),
    );
    expect(scoreContour(produced, levels, cal).score).toBeGreaterThan(98);
    expect(contourLevels(produced, cal)).toEqual(levels);
    expect(semitonePosition(hzToSemitone(150), cal)).toBeCloseTo(0.5);
  });
  it('rejects reversed, one-sided, too narrow or invalid samples instead of inventing a range', () => {
    for (const [speech, low, high] of [
      [[], [100], [240]],
      [[150], [155], [240]],
      [[150], [100], [140]],
      [[150], [145], [155]],
      [[NaN], [100], [240]],
      [[150], [0], [240]],
      [[150], [100], [Infinity]],
    ])
      expect(calibrationFromSpeech(speech, low, high)).toBeNull();
  });
  it('requires enough clear voiced speech, and rejects excessive volume', () => {
    expect(checkCalibrationSample(samples(150), 'speech').error).toBeNull();
    expect(checkCalibrationSample(samples(150, 100), 'speech').error).toContain(
      'captured and kept',
    );
    expect(
      checkCalibrationSample(
        samples(150).map((p) => ({ ...p, rms: 0.0001 })),
        'speech',
      ).error,
    ).not.toBeNull();
    expect(
      checkCalibrationSample(
        samples(150).map((p) => ({ ...p, rms: 0.8 })),
        'speech',
      ).error,
    ).toContain('loud');
  });
  it('retries only the endpoint that overlaps the ordinary baseline', () => {
    expect(
      checkCalibrationSample(samples(100, 100), 'low', 150).error,
    ).toBeNull();
    expect(
      checkCalibrationSample(samples(240, 100), 'high', 150).error,
    ).toBeNull();
    expect(
      checkCalibrationSample(samples(145, 100), 'low', 150).error,
    ).toContain('too close');
    expect(
      checkCalibrationSample(samples(150, 50), 'high', 150).error,
    ).not.toBeNull();
  });
});
