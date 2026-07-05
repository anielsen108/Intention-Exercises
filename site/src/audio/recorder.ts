/**
 * Microphone capture + live pitch tracking. An AudioWorklet taps raw samples
 * (loaded from a Blob URL so no build config is needed); the main thread runs
 * YIN every hop and appends TrackPoints. A parallel MediaRecorder captures a
 * compressed take for playback.
 */
import { yinDetect } from './yin';
import type { TrackPoint } from '../analysis/track';

const FRAME = 2048;
const HOP = 1024;

const WORKLET_SRC = `
class ViTap extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) this.port.postMessage(ch.slice(0));
    return true;
  }
}
registerProcessor('vi-tap', ViTap);
`;

export interface RecordingResult {
  track: TrackPoint[];
  /** Object URL of the recorded audio, or null if MediaRecorder unavailable. */
  audioUrl: string | null;
  durationSec: number;
}

export class Recorder {
  /** Called for every new pitch point while recording (for the live trace). */
  onPoint: ((p: TrackPoint) => void) | null = null;

  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  private media: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private buffer: Float32Array = new Float32Array(0);
  private consumed = 0;
  private totalSamples = 0;
  private track: TrackPoint[] = [];

  get isRecording(): boolean {
    return this.ctx !== null;
  }

  async start(): Promise<void> {
    if (this.ctx) return;
    this.track = [];
    this.chunks = [];
    this.buffer = new Float32Array(0);
    this.consumed = 0;
    this.totalSamples = 0;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    this.ctx = new AudioContext();
    const workletUrl = URL.createObjectURL(
      new Blob([WORKLET_SRC], { type: 'application/javascript' }),
    );
    try {
      await this.ctx.audioWorklet.addModule(workletUrl);
    } finally {
      URL.revokeObjectURL(workletUrl);
    }

    const source = this.ctx.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.ctx, 'vi-tap');
    this.node.port.onmessage = (e: MessageEvent<Float32Array>) => this.ingest(e.data);
    source.connect(this.node);

    if (typeof MediaRecorder !== 'undefined') {
      this.media = new MediaRecorder(this.stream);
      this.media.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };
      this.media.start();
    }
  }

  async stop(): Promise<RecordingResult> {
    const track = this.track;
    const sampleRate = this.ctx?.sampleRate ?? 48000;
    const durationSec = this.totalSamples / sampleRate;

    const audioUrl = await this.stopMedia();
    this.node?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    await this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.stream = null;
    this.node = null;
    this.media = null;

    return { track, audioUrl, durationSec };
  }

  private stopMedia(): Promise<string | null> {
    return new Promise((resolve) => {
      const media = this.media;
      if (!media || media.state === 'inactive') {
        resolve(null);
        return;
      }
      media.onstop = () => {
        const blob = new Blob(this.chunks, { type: media.mimeType });
        resolve(blob.size > 0 ? URL.createObjectURL(blob) : null);
      };
      media.stop();
    });
  }

  private ingest(chunk: Float32Array): void {
    const merged = new Float32Array(this.buffer.length + chunk.length);
    merged.set(this.buffer);
    merged.set(chunk, this.buffer.length);
    this.buffer = merged;
    this.totalSamples += chunk.length;

    const sampleRate = this.ctx?.sampleRate ?? 48000;
    while (this.buffer.length - this.consumed >= FRAME) {
      const frame = this.buffer.subarray(this.consumed, this.consumed + FRAME);
      const { hz, clarity } = yinDetect(frame, sampleRate);
      let sumSq = 0;
      for (let i = 0; i < frame.length; i++) sumSq += frame[i] * frame[i];
      const point: TrackPoint = {
        t: (this.totalSamples - (this.buffer.length - this.consumed)) / sampleRate,
        hz,
        clarity,
        rms: Math.sqrt(sumSq / frame.length),
      };
      this.track.push(point);
      this.onPoint?.(point);
      this.consumed += HOP;
    }
    // Drop consumed samples periodically to bound memory.
    if (this.consumed > sampleRate * 10) {
      this.buffer = this.buffer.slice(this.consumed - FRAME + HOP);
      this.consumed = FRAME - HOP;
    }
  }
}
