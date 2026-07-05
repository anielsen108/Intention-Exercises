import { describe, expect, it } from 'vitest';
import { yinDetect } from '../src/audio/yin';

const SR = 48000;

function sine(freq: number, n = 2048, amp = 0.6): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / SR);
  return out;
}

/** Deterministic pseudo-noise (xorshift32) so the test is reproducible. */
function noise(n = 2048): Float32Array {
  const out = new Float32Array(n);
  let s = 0x9e3779b9;
  for (let i = 0; i < n; i++) {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    out[i] = ((s >>> 0) / 0xffffffff - 0.5) * 0.8;
  }
  return out;
}

describe('yinDetect', () => {
  it('detects pure tones across the speaking range', () => {
    for (const f of [100, 150, 220, 330, 440]) {
      const { hz, clarity } = yinDetect(sine(f), SR);
      expect(hz).not.toBeNull();
      expect(Math.abs(hz! - f)).toBeLessThan(f * 0.01);
      expect(clarity).toBeGreaterThan(0.9);
    }
  });

  it('detects a harmonically rich tone at the fundamental, not a harmonic', () => {
    const f = 180;
    const frame = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) {
      const t = (2 * Math.PI * f * i) / SR;
      frame[i] = 0.5 * Math.sin(t) + 0.3 * Math.sin(2 * t) + 0.15 * Math.sin(3 * t);
    }
    const { hz } = yinDetect(frame, SR);
    expect(Math.abs(hz! - f)).toBeLessThan(f * 0.01);
  });

  it('returns null pitch for silence', () => {
    const { hz, clarity } = yinDetect(new Float32Array(2048), SR);
    expect(hz).toBeNull();
    expect(clarity).toBe(0);
  });

  it('reports low clarity for white noise', () => {
    const { clarity } = yinDetect(noise(), SR);
    expect(clarity).toBeLessThan(0.6);
  });

  it('respects the fMin/fMax search range', () => {
    // 50 Hz is below the default 60 Hz floor: must not report it.
    const { hz, clarity } = yinDetect(sine(50), SR);
    if (hz !== null) {
      expect(clarity).toBeLessThan(0.9);
    }
  });
});
