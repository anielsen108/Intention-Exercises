import { useEffect, useRef, useState } from 'react';
import { Recorder } from '../audio/recorder';
import {
  calibrationFromSamples,
  type Calibration as Cal,
} from '../analysis/calibration';
import { stopContour } from '../audio/synth';

type Step =
  'intro' | 'requesting' | 'low' | 'high' | 'high-rec' | 'done' | 'error';
const SECONDS = 2.5;

export function CalibrationModal({
  onComplete,
  onClose,
}: {
  onComplete: (cal: Cal) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>('intro');
  const [result, setResult] = useState<Cal | null>(null);
  const [countdown, setCountdown] = useState(SECONDS);
  const [liveHz, setLiveHz] = useState<number | null>(null);
  const [error, setError] = useState('');
  const lowSamples = useRef<number[]>([]);
  const recorder = useRef<Recorder | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const pending = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    alive.current = true;
    stopContour();
    const element = dialog.current;
    element?.showModal();
    return () => {
      alive.current = false;
      if (interval.current) clearInterval(interval.current);
      if (timeout.current) clearTimeout(timeout.current);
      void recorder.current?.stop().then((r) => {
        if (r.audioUrl) URL.revokeObjectURL(r.audioUrl);
      });
      element?.close();
    };
  }, []);
  async function capture(high: boolean) {
    if (pending.current) return;
    pending.current = true;
    const samples: number[] = [];
    const rec = new Recorder();
    recorder.current = rec;
    rec.onPoint = (p) => {
      if (p.hz !== null && p.clarity > 0.8 && p.rms > 0.003) samples.push(p.hz);
    };
    setStep('requesting');
    setLiveHz(null);
    setCountdown(SECONDS);
    setError('');
    try {
      await rec.start();
      if (!alive.current) {
        const r = await rec.stop();
        if (r.audioUrl) URL.revokeObjectURL(r.audioUrl);
        return;
      }
      setStep(high ? 'high-rec' : 'low');
      const started = Date.now();
      interval.current = setInterval(() => {
        setCountdown(Math.max(0, SECONDS - (Date.now() - started) / 1000));
        setLiveHz(samples.at(-1) ?? null);
      }, 100);
      timeout.current = setTimeout(async () => {
        if (interval.current) clearInterval(interval.current);
        try {
          const r = await rec.stop();
          if (r.audioUrl) URL.revokeObjectURL(r.audioUrl);
          recorder.current = null;
          pending.current = false;
          if (!alive.current) return;
          if (samples.length < 20) {
            setError(
              'We didn’t hear a steady note for long enough. Move closer and hum at a comfortable volume for the full countdown.',
            );
            setStep('error');
            return;
          }
          if (!high) {
            lowSamples.current = samples;
            setStep('high');
            return;
          }
          const cal = calibrationFromSamples(lowSamples.current, samples);
          if (!cal) {
            setError(
              'The notes were too close together. Try a comfortably low hum and a clearly higher hum, keeping both easy.',
            );
            setStep('error');
            return;
          }
          setResult(cal);
          setStep('done');
        } catch {
          if (alive.current) {
            pending.current = false;
            setError(
              'The microphone stopped before calibration finished. Try again.',
            );
            setStep('error');
          }
        }
      }, SECONDS * 1000);
    } catch {
      pending.current = false;
      if (alive.current) {
        setError(
          'The microphone couldn’t start. Allow microphone access in your browser, check that a microphone is connected, then try again. You can close this window and practice by ear.',
        );
        setStep('error');
      }
    }
  }
  const pos =
    liveHz === null
      ? null
      : Math.min(1, Math.max(0, Math.log(liveHz / 60) / Math.log(800 / 60)));
  return (
    <dialog
      ref={dialog}
      className="modal"
      aria-labelledby="calibration-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialog.current) {
          const rect = dialog.current.getBoundingClientRect();
          if (
            e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-heading">
        <h2 id="calibration-title">Make room for your voice.</h2>
        <button
          className="close-button"
          aria-label="Close voice calibration"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div aria-live="polite">
        <div className="calibration-step">
          {step === 'low'
            ? '1 of 2 · A comfortable low note'
            : step === 'high' || step === 'high-rec'
              ? '2 of 2 · A comfortable high note'
              : step === 'done'
                ? 'Your range is ready'
                : 'Two short hums · about 10 seconds'}
        </div>
        {step === 'intro' && (
          <>
            <p>
              The guide adapts to your comfortable speaking range. Hum a low
              note, then a higher note, for about 3 seconds each.
            </p>
            <p>
              Keep both notes easy. You don’t need to reach your absolute
              limits.
            </p>
            <button
              className="primary-button"
              onClick={() => void capture(false)}
            >
              Start with the low note →
            </button>
            <p className="microcopy">
              Your microphone is used only during calibration or a take.
            </p>
          </>
        )}
        {step === 'requesting' && (
          <p>Opening your microphone. Allow access when the browser asks.</p>
        )}
        {(step === 'low' || step === 'high-rec') && (
          <>
            <p>
              Hum your <strong>{step === 'low' ? 'low' : 'high'}</strong>{' '}
              comfortable note now.
            </p>
            <div className="live-meter" aria-hidden="true">
              <div className="live-meter-track">
                {pos !== null && (
                  <div
                    className="live-meter-dot"
                    style={{ left: `${pos * 100}%` }}
                  />
                )}
              </div>
              <span className="live-meter-label">
                {liveHz ? `${liveHz.toFixed(0)} Hz` : 'Listening…'}
              </span>
            </div>
            <p aria-live="off">{countdown.toFixed(1)} seconds remaining</p>
          </>
        )}
        {step === 'high' && (
          <>
            <p>
              Low note captured. Now hum a clearly higher note that still feels
              comfortable.
            </p>
            <button
              className="primary-button"
              onClick={() => void capture(true)}
            >
              Record the high note →
            </button>
          </>
        )}
        {step === 'done' && result && (
          <>
            <p>
              Your practice range is {result.lowHz.toFixed(0)}–
              {result.highHz.toFixed(0)} Hz. You can reset it with “Voice range”
              whenever you need to.
            </p>
            <button
              className="primary-button"
              onClick={() => {
                onComplete(result);
              }}
            >
              Use this range →
            </button>
          </>
        )}
        {step === 'error' && (
          <>
            <p className="error" role="alert">
              {error}
            </p>
            <button
              className="primary-button"
              onClick={() => {
                pending.current = false;
                setStep('intro');
              }}
            >
              Try calibration again
            </button>
          </>
        )}
      </div>
    </dialog>
  );
}
