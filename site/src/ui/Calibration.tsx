import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Recorder } from '../audio/recorder';
import {
  calibrationFromSamples,
  type Calibration as Cal,
} from '../analysis/calibration';

const STORAGE_KEY = 'vi.calibration';

export function loadCalibration(): Cal | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cal;
    return parsed.lowHz > 0 && parsed.highHz > parsed.lowHz ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCalibration(cal: Cal): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cal));
}

type Step = 'intro' | 'low' | 'high' | 'high-rec' | 'done' | 'error';

const STEP_SECONDS = 2.5;

interface Props {
  onComplete: (cal: Cal) => void;
  onClose: () => void;
}

export function CalibrationModal({ onComplete, onClose }: Props) {
  const [step, setStep] = useState<Step>('intro');
  const [result, setResult] = useState<Cal | null>(null);
  const [countdown, setCountdown] = useState(0);
  const lowSamples = useRef<number[]>([]);
  const highSamples = useRef<number[]>([]);
  const recorder = useRef<Recorder | null>(null);

  useEffect(() => {
    return () => {
      recorder.current?.stop().catch(() => {});
    };
  }, []);

  async function capture(into: MutableRefObject<number[]>, next: () => void) {
    into.current = [];
    const rec = new Recorder();
    recorder.current = rec;
    rec.onPoint = (p) => {
      if (p.hz !== null && p.clarity > 0.8) into.current.push(p.hz);
    };
    try {
      await rec.start();
    } catch {
      setStep('error');
      return;
    }
    const started = Date.now();
    const tick = setInterval(
      () => setCountdown(Math.max(0, STEP_SECONDS - (Date.now() - started) / 1000)),
      100,
    );
    setTimeout(async () => {
      clearInterval(tick);
      await rec.stop();
      recorder.current = null;
      next();
    }, STEP_SECONDS * 1000);
  }

  function finish() {
    const cal = calibrationFromSamples(lowSamples.current, highSamples.current);
    if (!cal) {
      setStep('error');
      return;
    }
    saveCalibration(cal);
    setResult(cal);
    setStep('done');
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Voice calibration</h2>

        {step === 'intro' && (
          <>
            <p>
              The five IPA tone bands are relative to <em>your</em> range. Two quick steps
              (~3 seconds each): hum your lowest comfortable pitch, then your highest —
              not falsetto, just the top of your comfortable speaking range.
            </p>
            <button onClick={() => { setStep('low'); capture(lowSamples, () => setStep('high')); }}>
              Start — low note first
            </button>
          </>
        )}

        {step === 'low' && (
          <p className="capturing">
            Hum your <strong>lowest</strong> comfortable note… {countdown.toFixed(1)}s
          </p>
        )}

        {step === 'high' && (
          <>
            <p>Now the high note.</p>
            <button onClick={() => { setStep('high-rec'); capture(highSamples, finish); }}>
              Record high note
            </button>
          </>
        )}

        {step === 'high-rec' && (
          <p className="capturing">
            Hum your <strong>highest</strong> comfortable note… {countdown.toFixed(1)}s
          </p>
        )}

        {step === 'done' && result && (
          <>
            <p>
              Range set: {result.lowHz.toFixed(0)} Hz – {result.highHz.toFixed(0)} Hz.
            </p>
            <button onClick={() => onComplete(result)}>Done</button>
          </>
        )}

        {step === 'error' && (
          <>
            <p>
              Couldn't get a usable range — the two notes were too close together, too
              quiet, or the microphone was unavailable. Try again with a bigger low/high
              contrast.
            </p>
            <button onClick={() => setStep('intro')}>Retry</button>
          </>
        )}
      </div>
    </div>
  );
}
