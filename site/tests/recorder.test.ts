import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Recorder } from '../src/audio/recorder';
const stopTrack = vi.fn();
const stream = { getTracks: () => [{ stop: stopTrack }] };
const closeContext = vi.fn(async () => {});
const addModule = vi.fn(async () => {});
class FakeContext {
  sampleRate = 48000;
  destination = {};
  audioWorklet = { addModule };
  resume = async () => {};
  close = closeContext;
  createMediaStreamSource = () => ({ connect: vi.fn() });
}
class FakeWorklet {
  port = { onmessage: null };
  connect = vi.fn();
  disconnect = vi.fn();
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('navigator', {
    mediaDevices: { getUserMedia: vi.fn(async () => stream) },
  });
  vi.stubGlobal('AudioContext', FakeContext);
  vi.stubGlobal('AudioWorkletNode', FakeWorklet);
  vi.stubGlobal('MediaRecorder', undefined);
});
afterEach(() => vi.unstubAllGlobals());
describe('microphone lifecycle', () => {
  it('stops a stream if the user leaves while the permission prompt is pending', async () => {
    let grant!: (value: unknown) => void;
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: () =>
          new Promise((resolve) => {
            grant = resolve;
          }),
      },
    });
    const rec = new Recorder();
    const starting = rec.start();
    await rec.stop();
    grant(stream);
    await starting;
    expect(stopTrack).toHaveBeenCalledTimes(1);
    expect(rec.isRecording).toBe(false);
  });
  it('releases the microphone after an audio worklet fails to initialize', async () => {
    addModule.mockRejectedValueOnce(new Error('worklet unavailable'));
    const rec = new Recorder();
    await expect(rec.start()).rejects.toThrow('worklet unavailable');
    expect(stopTrack).toHaveBeenCalledTimes(1);
    expect(closeContext).toHaveBeenCalledTimes(1);
  });
  it('makes repeated stop calls share one cleanup operation', async () => {
    const rec = new Recorder();
    await rec.start();
    const a = rec.stop(),
      b = rec.stop();
    expect(a).toBe(b);
    const result = await a;
    expect(stopTrack).toHaveBeenCalledTimes(1);
    expect(closeContext).toHaveBeenCalledTimes(1);
    expect(result.audioUrl).toBeNull();
  });
  it('allows only one microphone owner and releases ownership after stopping', async () => {
    const first = new Recorder();
    const second = new Recorder();
    await first.start();
    await expect(second.start()).rejects.toThrow('already in progress');
    await first.stop();
    await second.start();
    expect(second.isRecording).toBe(true);
    await second.stop();
  });

  it('keeps the sample buffer bounded without losing the recording timeline', async () => {
    const rec = new Recorder();
    const times: number[] = [];
    rec.onPoint = point => times.push(point.t);
    await rec.start();
    const tap = rec as unknown as { ingest: (chunk: Float32Array) => void; buffer: Float32Array };
    for (let i = 0; i < 5000; i++) {
      tap.ingest(new Float32Array(128));
      expect(tap.buffer.length).toBeLessThan(2048);
    }
    const result = await rec.stop();
    expect(result.durationSec).toBeCloseTo(5000 * 128 / 48000);
    expect(times.length).toBeGreaterThan(600);
    for (let i = 1; i < times.length; i++) expect(times[i] - times[i - 1]).toBeCloseTo(1024 / 48000);
  });

  it('explains missing browser microphone support before allocating resources', async () => {
    vi.stubGlobal('navigator', {});
    await expect(new Recorder().start()).rejects.toThrow('HTTPS');
    expect(stopTrack).not.toHaveBeenCalled();
  });
});
