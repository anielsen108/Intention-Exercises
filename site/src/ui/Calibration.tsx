import { useEffect, useRef, useState } from 'react';
import { Recorder } from '../audio/recorder';
import {
  calibrationFromSpeech,
  LEVEL_NAMES,
  levelToHz,
  median,
  type Calibration as Cal,
} from '../analysis/calibration';
import {
  checkCalibrationSample,
  type CalibrationStage,
} from '../analysis/calibrationSample';
import { reliablePitch } from '../analysis/timing';
import type { TrackPoint } from '../analysis/track';
import { playContour, stopContour } from '../audio/synth';

const STAGES: CalibrationStage[] = ['speech', 'low', 'high'];
const SECONDS = { speech: 8, low: 3, high: 3 };
const TITLES = {
  speech: 'Your everyday speaking voice',
  low: 'Your comfortable very low',
  high: 'Your comfortable very high',
};
const PASSAGE =
  'I have a few things to do today. First I’ll make something to eat, then I’ll go outside for a while. After that, I’ll see what needs doing.';

export function CalibrationModal({
  onComplete,
  onClose,
}: {
  onComplete: (cal: Cal) => void;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<CalibrationStage>('speech');
  const [phase, setPhase] = useState<
    'ready' | 'requesting' | 'recording' | 'review'
  >('ready');
  const [result, setResult] = useState<Cal | null>(null);
  const [countdown, setCountdown] = useState(8);
  const [liveHz, setLiveHz] = useState<number | null>(null);
  const [voicedSec, setVoicedSec] = useState(0);
  const [error, setError] = useState('');
  const [playingLevel, setPlayingLevel] = useState<number | null>(null);
  const samples = useRef<Partial<Record<CalibrationStage, number[]>>>({});
  const recorder = useRef<Recorder | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const pending = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const finish = useRef<(() => void) | null>(null);

  useEffect(() => {
    alive.current = true;
    stopContour();
    const element = dialog.current;
    element?.showModal();
    return () => {
      alive.current = false;
      if (interval.current) clearInterval(interval.current);
      if (timeout.current) clearTimeout(timeout.current);
      if (previewTimer.current) clearTimeout(previewTimer.current);
      stopContour();
      void recorder.current?.stop().then((r) => {
        if (r.audioUrl) URL.revokeObjectURL(r.audioUrl);
      });
      element?.close();
    };
  }, []);

  async function capture() {
    if (pending.current) return;
    pending.current = true;
    stopContour();
    const points: TrackPoint[] = [];
    const rec = new Recorder();
    recorder.current = rec;
    rec.onPoint = (p) => points.push(p);
    setPhase('requesting');
    setLiveHz(null);
    setVoicedSec(0);
    setCountdown(SECONDS[stage]);
    setError('');
    try {
      await rec.start();
      if (!alive.current) {
        const r = await rec.stop();
        if (r.audioUrl) URL.revokeObjectURL(r.audioUrl);
        return;
      }
      setPhase('recording');
      const started = performance.now();
      let finishing = false;
      const complete = async () => {
        if (finishing) return;
        finishing = true;
        if (interval.current) clearInterval(interval.current);
        if (timeout.current) clearTimeout(timeout.current);
        try {
          const r = await rec.stop();
          if (r.audioUrl) URL.revokeObjectURL(r.audioUrl);
          recorder.current = null;
          pending.current = false;
          if (!alive.current) return;
          const checked = checkCalibrationSample(
            r.track,
            stage,
            samples.current.speech ? median(samples.current.speech) : undefined,
          );
          if (checked.error) {
            setError(checked.error);
            setPhase('ready');
            return;
          }
          samples.current[stage] = checked.samples;
          const captured = samples.current;
          if (captured.speech && captured.low && captured.high) {
            const cal = calibrationFromSpeech(
              captured.speech,
              captured.low,
              captured.high,
            );
            if (!cal) {
              setError(
                'The three samples didn’t establish a usable range. Repeat this step in an easy register clearly different from your everyday voice.',
              );
              setPhase('ready');
              return;
            }
            setResult(cal);
            setPhase('review');
          } else {
            setStage(stage === 'speech' ? 'low' : 'high');
            setPhase('ready');
          }
        } catch {
          pending.current = false;
          if (alive.current) {
            setError('The microphone stopped early. Please repeat this step.');
            setPhase('ready');
          }
        }
      };
      finish.current = () => void complete();
      interval.current = setInterval(() => {
        setCountdown(
          Math.max(0, SECONDS[stage] - (performance.now() - started) / 1000),
        );
        const last = points.at(-1);
        setLiveHz(last && reliablePitch(last) ? last.hz : null);
        setVoicedSec(checkCalibrationSample(points, stage).voicedSec);
      }, 100);
      timeout.current = setTimeout(
        () => void complete(),
        SECONDS[stage] * 1000,
      );
    } catch {
      pending.current = false;
      if (alive.current) {
        setError(
          'The microphone couldn’t start. Allow microphone access and try again. You can also close this window and practice by ear.',
        );
        setPhase('ready');
      }
    }
  }
  function repeat(next: CalibrationStage) {
    stopContour();
    setPlayingLevel(null);
    if (next === 'speech') samples.current = {};
    else delete samples.current[next];
    setStage(next);
    setError('');
    setPhase('ready');
  }
  function preview(level: number) {
    try {
      playContour([level], result!, 0.35);
      setPlayingLevel(level);
      if (previewTimer.current) clearTimeout(previewTimer.current);
      previewTimer.current = setTimeout(() => setPlayingLevel(null), 550);
    } catch {
      setError('Audio couldn’t start. Try the level button again.');
    }
  }

  return (
    <dialog
      ref={dialog}
      className="modal calibration-modal"
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
        <h2 id="calibration-title">Find your speaking range.</h2>
        <button
          className="close-button"
          aria-label="Close voice calibration"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <ol className="calibration-progress" aria-label="Calibration steps">
        {STAGES.map((value, i) => (
          <li
            key={value}
            aria-current={
              phase !== 'review' && stage === value ? 'step' : undefined
            }
            className={samples.current[value] ? 'complete' : ''}
          >
            <span>{samples.current[value] ? '✓' : i + 1}</span>
            {['Speak', 'Low', 'High'][i]}
          </li>
        ))}
      </ol>
      <div className="calibration-step" role="status">
        {phase === 'review'
          ? 'Your five personal reference levels'
          : `${STAGES.indexOf(stage) + 1} of 3 · ${TITLES[stage]}`}
      </div>
      {phase !== 'review' && (
        <>
          <p>
            {stage === 'speech'
              ? 'Read this as if you’re talking to someone you know. Your usual speaking pitch will become “medium”. Keep your everyday pace and expression.'
              : `Use an easy ${stage === 'low' ? 'low' : 'high'} speaking register. Say “One, two, three” a few times, or hum in that register. Stay comfortable; absolute limits aren’t needed.`}
          </p>
          {stage === 'speech' && (
            <blockquote className="calibration-passage">{PASSAGE}</blockquote>
          )}
          {stage !== 'speech' && (
            <p className="baseline-note">
              Everyday center captured:{' '}
              <strong>
                {median(samples.current.speech ?? [0]).toFixed(0)} Hz
              </strong>
            </p>
          )}
        </>
      )}
      {phase === 'requesting' && (
        <p role="status">
          Opening your microphone. Allow access when the browser asks.
        </p>
      )}
      {phase === 'recording' && (
        <>
          <div className="calibration-listening" role="status">
            ●{' '}
            {stage === 'speech'
              ? 'Read aloud now'
              : `Use your ${stage} voice now`}
          </div>
          <progress
            max={SECONDS[stage]}
            value={SECONDS[stage] - countdown}
            aria-label="Recording progress"
          />
          <div className="calibration-meter" aria-live="off">
            <span>{countdown.toFixed(1)} s left</span>
            <span>{liveHz ? `${liveHz.toFixed(0)} Hz` : 'Listening…'}</span>
          </div>
          <p className="microcopy">
            {voicedSec.toFixed(1)} seconds of clear voice detected
          </p>
          {stage === 'speech' && (
            <button
              className="outline-button"
              disabled={voicedSec < 2.5}
              onClick={() => finish.current?.()}
            >
              Finished reading
            </button>
          )}
        </>
      )}
      {phase === 'ready' && (
        <>
          <button className="primary-button" onClick={() => void capture()}>
            {error
              ? 'Repeat this step'
              : stage === 'speech'
                ? 'Record my ordinary voice'
                : `Record my ${stage} voice`}{' '}
            →
          </button>
          <p className="microcopy">
            {SECONDS[stage]}-second recording · audio stays in this tab
          </p>
        </>
      )}
      {phase === 'review' && result && (
        <>
          <p>
            <strong>
              Medium is your spoken baseline: {result.midHz!.toFixed(0)} Hz.
            </strong>{' '}
            Low and high sit between that baseline and your two comfortable
            endpoints. Tap a level to hear it.
          </p>
          <div className="calibration-levels">
            {LEVEL_NAMES.map((label, i) => (
              <button
                key={label}
                aria-label={`Hear ${label.toLowerCase()}`}
                aria-pressed={playingLevel === i + 1}
                onClick={() => preview(i + 1)}
              >
                <span className="level-number">{i + 1}</span>
                <strong>{label}</strong>
                <span>{levelToHz(i + 1, result).toFixed(0)} Hz</span>
                <span aria-hidden="true">
                  {playingLevel === i + 1 ? '♫' : '▶'}
                </span>
              </button>
            ))}
          </div>
          <p className="microcopy">
            These are practice references. Your speaking pitch will vary with
            context. If an endpoint feels strained, repeat that sample before
            saving.
          </p>
          <button
            className="primary-button"
            onClick={() => {
              stopContour();
              onComplete(result);
            }}
          >
            Use this speaking range →
          </button>
          <div className="calibration-retry">
            {STAGES.map((value) => (
              <button
                key={value}
                className="text-button"
                onClick={() => repeat(value)}
              >
                Repeat {value === 'speech' ? 'ordinary speech' : value}
              </button>
            ))}
          </div>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </dialog>
  );
}
