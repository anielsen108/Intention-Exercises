import { useEffect, useRef, useState } from 'react';
import type { Calibration } from '../analysis/calibration';
import { scorePerformance, type PerformanceScore } from '../analysis/performance';
import { approximateTobi, type TobiApproximation } from '../analysis/tobi';
import type { TrackPoint } from '../analysis/track';
import { transcribe } from '../analysis/transcribe';
import { Recorder } from '../audio/recorder';
import type { Variation } from '../content/types';
import { PitchCanvas } from './PitchCanvas';
import { TobiNotation, ToneLetters } from './ToneMarks';

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

  // New variation selected → clear the previous take.
  useEffect(() => {
    setResult(null);
    pointsRef.current = [];
  }, [variation]);

  if (!calibration) {
    return (
      <div className="recorder-panel">
        <button className="record-btn" onClick={onRequestCalibration}>
          Calibrate your voice to start recording
        </button>
      </div>
    );
  }

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
      setError('Microphone unavailable — check browser permissions.');
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
        {error && <span className="error">{error}</span>}
      </div>

      <PitchCanvas
        pointsRef={pointsRef}
        calibration={calibration}
        targetLevels={targetLevels}
        running={running}
      />

      {result && !running && (
        <div className="take-result">
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
          {result.performance && (
            <div className="result-row">
              <span className="result-label">Contour match</span>
              <span className={`score s${Math.floor(result.performance.score / 25)}`}>
                {result.performance.score}
              </span>
            </div>
          )}
          {result.audioUrl && <audio controls src={result.audioUrl} />}
        </div>
      )}
    </div>
  );
}
