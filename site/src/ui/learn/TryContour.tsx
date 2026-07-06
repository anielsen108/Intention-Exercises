import { useEffect, useRef, useState } from 'react';
import type { Calibration } from '../../analysis/calibration';
import { scoreContour } from '../../analysis/compare';
import { runSemitones, type TrackPoint } from '../../analysis/track';
import { transcribe } from '../../analysis/transcribe';
import { Recorder } from '../../audio/recorder';
import { playContour } from '../../audio/synth';
import { levelsToToneLetters } from '../../content/tones';
import { PitchCanvas } from '../PitchCanvas';

const PASS_SCORE = 70;

interface Props {
  /** Target tone levels the learner should produce. */
  target: number[];
  /** Prompt, e.g. "Say “no” with a firm fall". */
  prompt: string;
  calibration: Calibration | null;
  onRequestCalibration: () => void;
}

interface Attempt {
  producedLetters: string;
  score: number;
  passed: boolean;
}

/** Mic-checked micro-exercise: produce the target contour, get a verdict. */
export function TryContour({ target, prompt, calibration, onRequestCalibration }: Props) {
  const recorder = useRef<Recorder | null>(null);
  const pointsRef = useRef<TrackPoint[]>([]);
  const [running, setRunning] = useState(false);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    return () => {
      recorder.current?.stop().catch(() => {});
    };
  }, []);

  if (!calibration) {
    return (
      <div className="try-card">
        <p className="try-prompt">{prompt}</p>
        <button className="ghost-btn" onClick={onRequestCalibration}>
          Calibrate your voice to try this
        </button>
      </div>
    );
  }

  async function toggle() {
    setError(false);
    if (running && recorder.current) {
      const { track } = await recorder.current.stop();
      recorder.current = null;
      setRunning(false);
      grade(track);
      return;
    }
    const rec = new Recorder();
    recorder.current = rec;
    pointsRef.current = [];
    setAttempt(null);
    rec.onPoint = (p) => pointsRef.current.push(p);
    try {
      await rec.start();
      setRunning(true);
    } catch {
      setError(true);
      recorder.current = null;
    }
  }

  function grade(track: TrackPoint[]) {
    const cal = calibration!;
    const transcription = transcribe(track, cal);
    if (transcription.nucleusIndex === -1) {
      setAttempt({ producedLetters: '', score: 0, passed: false });
      return;
    }
    const st = runSemitones(track, transcription.runs[transcription.nucleusIndex]);
    const { score } = scoreContour(st, target, cal);
    setAttempt({
      producedLetters: levelsToToneLetters(transcription.levels),
      score,
      passed: score >= PASS_SCORE,
    });
  }

  return (
    <div className="try-card">
      <p className="try-prompt">
        {prompt} <span className="tone-letters">{levelsToToneLetters(target)}</span>
      </p>
      <div className="try-controls">
        <button className="play-btn" onClick={() => playContour(target, calibration)}>
          ▶ hear it
        </button>
        <button className={`record-btn small ${running ? 'recording' : ''}`} onClick={toggle}>
          {running ? '■ Stop' : '● Try it'}
        </button>
        {error && <span className="error">Microphone unavailable.</span>}
      </div>
      <PitchCanvas
        pointsRef={pointsRef}
        calibration={calibration}
        targetLevels={target}
        running={running}
        windowSec={3}
      />
      {attempt && !running && (
        <p className={`try-verdict ${attempt.passed ? 'pass' : 'fail'}`}>
          {attempt.producedLetters === '' ? (
            'No voiced pitch detected — try humming the shape first.'
          ) : (
            <>
              You produced <span className="tone-letters">{attempt.producedLetters}</span> —{' '}
              {attempt.passed
                ? `nailed it (${attempt.score}).`
                : `close, but aim for ${levelsToToneLetters(target)} (score ${attempt.score}). Exaggerate the shape.`}
            </>
          )}
        </p>
      )}
    </div>
  );
}
