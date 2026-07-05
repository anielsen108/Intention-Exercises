import { useEffect, useRef, useState } from 'react';
import type { Calibration } from '../analysis/calibration';
import { scorePerformance, type PerformanceScore } from '../analysis/performance';
import { approximateTobi, type TobiApproximation } from '../analysis/tobi';
import type { TrackPoint } from '../analysis/track';
import { transcribe } from '../analysis/transcribe';
import { Recorder } from '../audio/recorder';
import type { Variation } from '../content/types';
import { PitchCanvas } from './PitchCanvas';
import { ipaGloss } from './toneGloss';
import { TobiNotation, ToneLetters } from './ToneMarks';

function ScoreRing({ score }: { score: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div>
      <div className={`score-ring s${Math.floor(score / 25)}`}>
        <svg viewBox="0 0 72 72" width="72" height="72" aria-hidden="true">
          <circle className="ring-bg" cx="36" cy="36" r={r} />
          <circle
            className="ring-fg"
            cx="36"
            cy="36"
            r={r}
            strokeDasharray={c}
            strokeDashoffset={c * (1 - score / 100)}
          />
        </svg>
        <span className="score-num">{score}</span>
      </div>
      <span className="score-caption">match</span>
    </div>
  );
}

interface TakeResult {
  producedLevels: number[];
  tobi: TobiApproximation;
  performance: PerformanceScore | null;
  audioUrl: string | null;
}

interface Props {
  calibration: Calibration | null;
  /** The variation being practiced (its markers become the scoring target). */
  variation: Variation | null;
  onRequestCalibration: () => void;
}

export function RecorderPanel({ calibration, variation, onRequestCalibration }: Props) {
  const recorder = useRef<Recorder | null>(null);
  const pointsRef = useRef<TrackPoint[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TakeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      recorder.current?.stop().catch(() => {});
    };
  }, []);

  // Space toggles recording (unless the user is typing in a field).
  const toggleRef = useRef<() => void>(() => {});
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.code !== 'Space' || target.closest('input, textarea, [contenteditable]')) return;
      e.preventDefault();
      toggleRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // New variation selected → clear the previous take.
  useEffect(() => {
    setResult(null);
    pointsRef.current = [];
  }, [variation]);

  if (!calibration) {
    return (
      <div className="recorder-panel">
        <div className="setup-card">
          <h3>Hear yourself in tones</h3>
          <p>
            Record a take and see your pitch drawn live, transcribed into IPA tone letters
            and approximate ToBI. First, a 6-second calibration maps the five tone bands to{' '}
            <em>your</em> voice: hum a low note, then a high note.
          </p>
          <button className="record-btn" onClick={onRequestCalibration}>
            Calibrate your voice
          </button>
        </div>
      </div>
    );
  }

  toggleRef.current = () => void toggle();

  async function toggle() {
    setError(null);
    if (running && recorder.current) {
      const { track, audioUrl } = await recorder.current.stop();
      recorder.current = null;
      setRunning(false);
      analyse(track, audioUrl);
      return;
    }
    const rec = new Recorder();
    recorder.current = rec;
    pointsRef.current = [];
    setResult(null);
    rec.onPoint = (p) => pointsRef.current.push(p);
    try {
      await rec.start();
      setRunning(true);
    } catch {
      setError(
        'Microphone unavailable. Click the camera/mic icon in your browser’s address bar and allow microphone access, then try again.',
      );
      recorder.current = null;
    }
  }

  function analyse(track: TrackPoint[], audioUrl: string | null) {
    const cal = calibration!;
    const transcription = transcribe(track, cal);
    const tobi = approximateTobi(track, cal);
    const markers = variation?.markers ?? [];
    const performance = markers.length > 0 ? scorePerformance(track, cal, markers) : null;
    setResult({ producedLevels: transcription.levels, tobi, performance, audioUrl });
  }

  const targetLevels = variation?.markers?.[0]?.levels;

  return (
    <div className="recorder-panel">
      <div className="recorder-controls">
        <button className={`record-btn ${running ? 'recording' : ''}`} onClick={toggle}>
          {running ? '■ Stop' : '● Record'}
        </button>
        <span className="record-hint">space</span>
        {error && <span className="error">{error}</span>}
      </div>

      <PitchCanvas
        pointsRef={pointsRef}
        calibration={calibration}
        targetLevels={targetLevels}
        running={running}
        ariaLabel={
          result && result.producedLevels.length > 0
            ? `Your last take: ${ipaGloss(result.producedLevels)}`
            : undefined
        }
      />

      {result && !running && (
        <div className="take-result">
          <div className="result-rows">
          <div className="result-row">
            <span className="result-label">You said (IPA)</span>
            {result.producedLevels.length > 0 ? (
              <ToneLetters levels={result.producedLevels} big />
            ) : (
              <span className="muted">— no voiced pitch detected —</span>
            )}
            {variation?.markers && variation.markers.length > 0 && (
              <span className="result-target">
                target:{' '}
                {variation.markers.map((m, i) => (
                  <span key={i}>
                    {i > 0 && ' … '}
                    {m.word}
                    <ToneLetters levels={m.levels} />
                  </span>
                ))}
              </span>
            )}
          </div>
          <div className="result-row">
            <span className="result-label">ToBI (approximate)</span>
            {result.tobi.label ? <TobiNotation value={result.tobi.label} /> : <span>—</span>}
            {variation?.tobi && (
              <span className="result-target">
                target: <TobiNotation value={variation.tobi} />
              </span>
            )}
          </div>
          </div>
          {result.performance && <ScoreRing score={result.performance.score} />}
          {result.audioUrl && <audio controls src={result.audioUrl} />}
        </div>
      )}
    </div>
  );
}
