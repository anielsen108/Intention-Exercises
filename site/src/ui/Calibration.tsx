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
  calibrationPitch,
  calibrationCaptureComplete,
  retainCalibrationVoice,
  CALIBRATION_TARGET_SEC,
  CALIBRATION_MAX_SEC,
  CALIBRATION_MIN_RMS,
  type CalibrationStage,
} from '../analysis/calibrationSample';
import { ANALYSIS_FRAME_SEC, ANALYSIS_HOP_SEC } from '../analysis/timing';
import type { TrackPoint } from '../analysis/track';
import { playContour, stopContour } from '../audio/synth';

const STAGES: CalibrationStage[] = ['speech', 'low', 'high'];
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
    'ready' | 'requesting' | 'recording' | 'processing' | 'review'
  >('ready');
  const [result, setResult] = useState<Cal | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [inputState, setInputState] = useState<
    'waiting' | 'quiet' | 'unpitched' | 'voiced'
  >('waiting');
  const [inputLevel, setInputLevel] = useState(0);
  const retained = useRef<TrackPoint[]>([]);
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
    const points = [...retained.current];
    const offset =
      (points.at(-1)?.t ?? -ANALYSIS_HOP_SEC) +
      ANALYSIS_HOP_SEC -
      ANALYSIS_FRAME_SEC / 2;
    let audioSec = 0;
    let lastVoicedAt = 0;
    let receivedAt = 0;
    let latest: TrackPoint | undefined;
    const rec = new Recorder();
    recorder.current = rec;
    rec.onPoint = (p) => {
      points.push({ ...p, t: p.t + offset });
      latest = p;
      audioSec = p.t + ANALYSIS_FRAME_SEC / 2;
      receivedAt = performance.now();
      if (calibrationPitch(p)) lastVoicedAt = audioSec;
    };
    setPhase('requesting');
    setLiveHz(null);
    setInputState('waiting');
    setInputLevel(0);
    setVoicedSec(checkCalibrationSample(points, stage).voicedSec);
    setCountdown(CALIBRATION_MAX_SEC[stage]);
    setError('');
    try {
      await rec.start();
      if (!alive.current) {
        const r = await rec.stop();
        if (r.audioUrl) URL.revokeObjectURL(r.audioUrl);
        return;
      }
      setPhase('recording');
      let finishing = false;
      const complete = async () => {
        if (finishing) return;
        finishing = true;
        finish.current = null;
        if (interval.current) clearInterval(interval.current);
        if (timeout.current) clearTimeout(timeout.current);
        if (alive.current) setPhase('processing');
        try {
          const r = await rec.stop();
          if (r.audioUrl) URL.revokeObjectURL(r.audioUrl);
          recorder.current = null;
          pending.current = false;
          if (!alive.current) return;
          const checked = checkCalibrationSample(
            points,
            stage,
            samples.current.speech ? median(samples.current.speech) : undefined,
          );
          retained.current = checked.insufficient
            ? retainCalibrationVoice(points)
            : [];
          setVoicedSec(checked.insufficient ? checked.voicedSec : 0);
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
        const checked = checkCalibrationSample(points, stage);
        const point = latest;
        const receiving = point && performance.now() - receivedAt < 1000;
        setCountdown(Math.max(0, CALIBRATION_MAX_SEC[stage] - audioSec));
        setLiveHz(receiving && calibrationPitch(point) ? point.hz : null);
        setInputLevel(receiving ? Math.min(1, Math.sqrt(point.rms) * 3) : 0);
        setInputState(
          !receiving
            ? 'waiting'
            : calibrationPitch(point)
              ? 'voiced'
              : point.rms < CALIBRATION_MIN_RMS
                ? 'quiet'
                : 'unpitched',
        );
        setVoicedSec(checked.voicedSec);
        if (
          calibrationCaptureComplete(
            stage,
            audioSec,
            checked.voicedSec,
            audioSec - lastVoicedAt,
          )
        )
          void complete();
      }, 100);
      // Also release a stalled device or a background tab whose audio clock stops.
      timeout.current = setTimeout(
        () => void complete(),
        (CALIBRATION_MAX_SEC[stage] + 15) * 1000,
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
    retained.current = [];
    setVoicedSec(0);
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
      {phase === 'processing' && <p role="status">Checking your sample…</p>}
      {phase === 'recording' && (
        <>
          <div className="calibration-listening" role="status">
            {inputState === 'waiting'
              ? 'Waiting for microphone audio…'
              : stage === 'speech'
                ? '● Read aloud now'
                : `● Use your ${stage} voice now`}
          </div>
          <progress
            max={CALIBRATION_TARGET_SEC[stage]}
            value={Math.min(voicedSec, CALIBRATION_TARGET_SEC[stage])}
            aria-label="Usable voice collected"
          />
          <div className="calibration-meter" aria-live="off">
            <span>
              {voicedSec.toFixed(1)} / {CALIBRATION_TARGET_SEC[stage]} s of
              voice
            </span>
            <span>{liveHz ? `${liveHz.toFixed(0)} Hz` : 'Listening…'}</span>
          </div>
          <div className="calibration-input">
            <span>Microphone input</span>
            <meter
              min={0}
              max={1}
              value={inputLevel}
              aria-label="Microphone input level"
            />
          </div>
          <p className="microcopy" aria-live="off">
            {inputState === 'waiting'
              ? 'Your microphone is starting. The voice counter waits for audio.'
              : inputState === 'quiet'
                ? 'The input is quiet. Pauses are fine; if you are speaking, check your microphone input.'
                : inputState === 'unpitched'
                  ? 'Sound is reaching the microphone. We count the parts with a trackable pitch.'
                  : 'Your voice is being counted. Keep your natural pace; pauses and consonants are expected.'}
          </p>
          <p className="microcopy">
            {voicedSec >= CALIBRATION_TARGET_SEC[stage] - 1e-8
              ? 'Enough voice collected. Finish your sentence, then use this sample.'
              : 'Keep reading or repeat the passage. Your progress is kept if you pause.'}{' '}
            Recording pauses automatically within {Math.ceil(countdown)} s.
          </p>
          <button className="outline-button" onClick={() => finish.current?.()}>
            {voicedSec < CALIBRATION_TARGET_SEC[stage] - 1e-8
              ? 'Pause recording'
              : stage === 'speech'
                ? 'Finished reading'
                : 'Use this sample'}
          </button>
        </>
      )}
      {phase === 'ready' && (
        <>
          <div className="calibration-actions">
            <button className="primary-button" onClick={() => void capture()}>
              {retained.current.length
                ? 'Continue this step'
                : error
                  ? 'Repeat this step'
                  : stage === 'speech'
                    ? 'Record my ordinary voice'
                    : `Record my ${stage} voice`}{' '}
              →
            </button>
            {retained.current.length > 0 && (
              <button className="text-button" onClick={() => repeat(stage)}>
                Start this step over
              </button>
            )}
          </div>
          <p className="microcopy">
            {retained.current.length > 0
              ? `${voicedSec.toFixed(1)} seconds of voice kept · `
              : ''}
            {stage === 'speech'
              ? 'Read at your own pace'
              : 'Speak or hum comfortably'}{' '}
            · up to {CALIBRATION_MAX_SEC[stage]} seconds per recording · audio
            stays in this tab
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
