/**
 * Microphone capture + live pitch tracking. An AudioWorklet taps raw samples
 * (loaded from a Blob URL so no build config is needed); the main thread runs
 * YIN every hop and appends TrackPoints. A parallel MediaRecorder captures a
 * compressed take for playback.
 */
import { yinDetect } from './yin';
import type { TrackPoint } from '../analysis/track';

import { ANALYSIS_FRAME_SEC, ANALYSIS_HOP_SEC } from '../analysis/timing';

const WORKLET_SRC = `
class ViTap extends AudioWorkletProcessor {
  constructor() {
    super();
    this.block = new Float32Array(256);
    this.used = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) for (let i = 0; i < ch.length; i++) {
      this.block[this.used++] = ch[i];
      if (this.used === this.block.length) {
        this.port.postMessage(this.block);
        this.used = 0;
      }
    }
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

let activeRecorder: object | null = null;

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
  private cancelled = false;
  private readonly ownerToken = {};
  private stopping: Promise<RecordingResult> | null = null;

  get isRecording(): boolean {
    return this.ctx !== null;
  }

  async start(): Promise<void> {
    if (this.ctx) return;
    if (activeRecorder && activeRecorder !== this.ownerToken)
      throw new Error('Another microphone recording is already in progress.');
    activeRecorder = this.ownerToken;
    this.cancelled = false;
    this.stopping = null;
    this.track = [];
    this.chunks = [];
    this.buffer = new Float32Array(0);
    this.consumed = 0;
    this.totalSamples = 0;

    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          'Microphone access requires HTTPS or localhost in a supported browser.',
        );
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      if (this.cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      this.ctx = new AudioContext({ sampleRate: 16000 });
      await this.ctx.resume();
      const workletUrl = URL.createObjectURL(
        new Blob([WORKLET_SRC], { type: 'application/javascript' }),
      );
      try {
        await this.ctx.audioWorklet.addModule(workletUrl);
      } finally {
        URL.revokeObjectURL(workletUrl);
      }

      if (this.cancelled || !this.ctx || !this.stream) return;

      const source = this.ctx.createMediaStreamSource(this.stream);
      this.node = new AudioWorkletNode(this.ctx, 'vi-tap');
      this.node.port.onmessage = (e: MessageEvent<Float32Array>) =>
        this.ingest(e.data);
      source.connect(this.node);
      // Keep the worklet in the rendered audio graph; its output is silent.
      this.node.connect(this.ctx.destination);

      if (typeof MediaRecorder !== 'undefined') {
        this.media = new MediaRecorder(this.stream);
        this.media.ondataavailable = (e) => {
          if (e.data.size > 0) this.chunks.push(e.data);
        };
        this.media.start();
      }
    } catch (error) {
      await this.stop();
      throw error;
    }
  }

  stop(): Promise<RecordingResult> {
    this.cancelled = true;
    if (activeRecorder === this.ownerToken) activeRecorder = null;
    this.stopping ??= this.finish();
    return this.stopping;
  }

  private async finish(): Promise<RecordingResult> {
    const track = this.track;
    const sampleRate = this.ctx?.sampleRate ?? 48000;
    const durationSec = this.totalSamples / sampleRate;

    const mediaResult = this.stopMedia();
    this.node?.disconnect();
    if (this.node) this.node.port.onmessage = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    await this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.stream = null;
    this.node = null;
    this.media = null;
    const audioUrl = await mediaResult;

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
    const frameSize = Math.round(sampleRate * ANALYSIS_FRAME_SEC);
    const hopSize = Math.round(sampleRate * ANALYSIS_HOP_SEC);
    while (this.buffer.length - this.consumed >= frameSize) {
      const frame = this.buffer.subarray(
        this.consumed,
        this.consumed + frameSize,
      );
      const { hz, clarity } = yinDetect(frame, sampleRate);
      let sumSq = 0;
      for (let i = 0; i < frame.length; i++) sumSq += frame[i] * frame[i];
      const point: TrackPoint = {
        t:
          (this.totalSamples -
            (this.buffer.length - this.consumed) +
            frameSize / 2) /
          sampleRate,
        hz,
        clarity,
        rms: Math.sqrt(sumSq / frame.length),
      };
      this.track.push(point);
      this.onPoint?.(point);
      this.consumed += hopSize;
    }
    // Keep only the unconsumed overlap. Retaining seconds of consumed samples
    // would copy a growing buffer on every worklet message and starve UI timers.
    if (this.consumed > 0) {
      this.buffer = this.buffer.slice(this.consumed);
      this.consumed = 0;
    }
  }
}
