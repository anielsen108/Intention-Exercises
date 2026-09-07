import { useEffect, useRef, useState } from 'react';
import type { Calibration } from '../analysis/calibration';
import { coachTake, type Feedback } from '../analysis/coaching';
import { transcribe } from '../analysis/transcribe';
import type { TrackPoint } from '../analysis/track';
import { Recorder } from '../audio/recorder';
import { stopContour } from '../audio/synth';
import { PitchCanvas } from './PitchCanvas';
import { ToneLetters } from './ToneMarks';

interface Take {
  id: number;
  track: TrackPoint[];
  audioUrl: string | null;
  feedback: Feedback;
  levels: number[];
  duration: number;
}
interface Props {
  calibration: Calibration | null;
  targetLevels?: number[];
  prompt: string;
  onRequestCalibration: () => void;
  onBusy?: (busy: boolean) => void;
  keyboardShortcut?: boolean;
}
const MAX_SECONDS = 12;

export function RecorderPanel({
  calibration,
  targetLevels,
  prompt,
  onRequestCalibration,
  onBusy,
  keyboardShortcut = true,
}: Props) {
  const recorder = useRef<Recorder | null>(null);
  const pointsRef = useRef<TrackPoint[]>([]);
  const alive = useRef(true);
  const busyRef = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const urls = useRef(new Set<string>());
  const sequence = useRef(0);
  const requestId = useRef(0);
  const [status, setStatus] = useState<
    'idle' | 'requesting' | 'recording' | 'processing'
  >('idle');
  const [elapsed, setElapsed] = useState(0);
  const [takes, setTakes] = useState<Take[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [byEar, setByEar] = useState(false);
  const [meter, setMeter] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const take = takes.find((t) => t.id === selected) ?? null;
  const running = status === 'recording';
  const busy = status !== 'idle';
  const busyCallback = useRef(onBusy);
  busyCallback.current = onBusy;

  useEffect(() => {
    alive.current = true;
    const ownedUrls = urls.current;
    return () => {
      alive.current = false;
      if (timer.current) clearInterval(timer.current);
      void recorder.current?.stop().then((r) => {
        if (r.audioUrl) URL.revokeObjectURL(r.audioUrl);
      });
      ownedUrls.forEach((url) => URL.revokeObjectURL(url));
      busyCallback.current?.(false);
    };
  }, []);
  useEffect(() => {
    busyCallback.current?.(busy);
  }, [busy]);

  function selectTake(value: Take) {
    audioRef.current?.pause();
    pointsRef.current = value.track;
    setSelected(value.id);
  }
  async function stop() {
    if (status !== 'recording' && !recorder.current) return;
    if (timer.current) clearInterval(timer.current);
    const rec = recorder.current;
    if (!rec) return;
    setStatus('processing');
    try {
      const result = await rec.stop();
      recorder.current = null;
      if (!alive.current) {
        if (result.audioUrl) URL.revokeObjectURL(result.audioUrl);
        return;
      }
      const feedback = coachTake(result.track, calibration!, targetLevels);
      const item: Take = {
        id: ++sequence.current,
        track: result.track,
        audioUrl: result.audioUrl,
        feedback,
        levels: transcribe(result.track, calibration!).levels,
        duration: result.durationSec,
      };
      if (item.audioUrl) urls.current.add(item.audioUrl);
      setTakes((previous) => {
        const next = [...previous, item];
        if (next.length > 3) {
          const removed = next.shift()!;
          if (removed.audioUrl) {
            URL.revokeObjectURL(removed.audioUrl);
            urls.current.delete(removed.audioUrl);
          }
        }
        return next;
      });
      pointsRef.current = item.track;
      setSelected(item.id);
    } catch {
      if (alive.current)
        setError('The take couldn’t be finished. Try recording again.');
    } finally {
      busyRef.current = false;
      if (alive.current) setStatus('idle');
    }
  }
  const stopRef = useRef(stop);
  stopRef.current = stop;

  async function start() {
    if (!calibration || busyRef.current) return;
    busyRef.current = true;
    const request = ++requestId.current;
    audioRef.current?.pause();
    stopContour();
    setError('');
    setElapsed(0);
    setMeter(0);
    setSelected(null);
    setStatus('requesting');
    pointsRef.current = [];
    const rec = new Recorder();
    recorder.current = rec;
    rec.onPoint = (point) => pointsRef.current.push(point);
    try {
      await rec.start();
      if (!alive.current || request !== requestId.current) {
        const result = await rec.stop();
        if (result.audioUrl) URL.revokeObjectURL(result.audioUrl);
        return;
      }
      setStatus('recording');
      const started = performance.now();
      timer.current = setInterval(() => {
        const seconds = (performance.now() - started) / 1000;
        setElapsed(seconds);
        setMeter(Math.min(1, (pointsRef.current.at(-1)?.rms ?? 0) * 7));
        if (seconds >= MAX_SECONDS) void stopRef.current();
      }, 100);
    } catch (reason) {
      if (!alive.current || request !== requestId.current) return;
      busyRef.current = false;
      recorder.current = null;
      setStatus('idle');
      const name = reason instanceof DOMException ? reason.name : '';
      setError(
        name === 'NotAllowedError'
          ? 'Microphone access was declined. Allow it in your browser’s site permissions and try again, or choose “Practice by ear”.'
          : name === 'NotFoundError'
            ? 'No microphone was found. Connect one and try again, or practice by ear.'
            : 'The microphone couldn’t start. Check that this page uses HTTPS (or localhost), and that another app isn’t holding the microphone. You can still practice by ear.',
      );
    }
  }
  function cancelRequest() {
    requestId.current++;
    void recorder.current?.stop().then((result) => {
      if (result.audioUrl) URL.revokeObjectURL(result.audioUrl);
    });
    recorder.current = null;
    busyRef.current = false;
    setStatus('idle');
  }
  const toggleRef = useRef(() => {});
  toggleRef.current = () => {
    if (running) void stop();
    else if (!busy) void start();
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        !keyboardShortcut ||
        e.code !== 'Space' ||
        e.repeat ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey
      )
        return;
      const element = e.target as HTMLElement;
      if (
        element.closest(
          'button,a,input,textarea,select,summary,audio,[contenteditable],[role="dialog"],dialog',
        )
      )
        return;
      if (!calibration) return;
      e.preventDefault();
      toggleRef.current();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [calibration, keyboardShortcut]);

  const previous = take ? takes.find((t) => t.id === take.id - 1) : null;
  const delta =
    take?.feedback.score != null && previous?.feedback.score != null
      ? take.feedback.score - previous.feedback.score
      : null;
  return (
    <section className="recorder-panel" aria-label="Record and review">
      <div className="section-label">
        <span>02 / YOUR TURN</span>
        <span>
          {running
            ? `${elapsed.toFixed(1)} / ${MAX_SECONDS}s`
            : 'Audio stays in this tab'}
        </span>
      </div>
      <h3 className="record-prompt">{prompt}</h3>
      {!calibration && (
        <div className="setup-card">
          <div>
            <strong>Fit the pitch guide to your voice</strong>
            <p>
              Set a comfortable low and high once to record and compare your
              pitch.
            </p>
          </div>
          <button className="primary-button" onClick={onRequestCalibration}>
            Set my voice range <span aria-hidden="true">→</span>
          </button>
        </div>
      )}
      {calibration && (
        <>
          <div className="live-chart">
            <div className="chart-legend">
              <span>
                <i className="legend-voice" /> Your voice
              </span>
              {targetLevels && (
                <span>
                  <i className="legend-target" />{' '}
                  {running ? 'Guide appears after stop' : 'Pitch guide'}
                </span>
              )}
              <span className={running ? 'live-status' : ''}>
                {running
                  ? '● Recording'
                  : take
                    ? `Take ${take.id}`
                    : 'Ready when you are'}
              </span>
            </div>
            <PitchCanvas
              key={selected ?? 'live'}
              pointsRef={pointsRef}
              calibration={calibration}
              targetLevels={targetLevels}
              running={running}
              windowSec={MAX_SECONDS}
              ariaLabel={
                take
                  ? `Pitch trace for take ${take.id}. ${take.feedback.title}.`
                  : 'Pitch monitor. Record to see your voice.'
              }
            />
            {!running && !take && (
              <div className="chart-empty">
                {status === 'requesting'
                  ? 'Allow the microphone when your browser asks.'
                  : 'Your voice will appear here.'}
              </div>
            )}
          </div>
          <div className="record-actions">
            {status === 'requesting' && (
              <button className="outline-button" onClick={cancelRequest}>
                Cancel microphone request
              </button>
            )}
            <button
              className={`primary-button record-button ${running ? 'recording' : ''}`}
              disabled={status === 'requesting' || status === 'processing'}
              onClick={() => (running ? void stop() : void start())}
            >
              <span aria-hidden="true">{running ? '■' : '●'}</span>{' '}
              {running
                ? 'Stop & review'
                : status === 'requesting'
                  ? 'Opening microphone…'
                  : status === 'processing'
                    ? 'Finishing take…'
                    : takes.length
                      ? 'Record another take'
                      : 'Record a take'}
            </button>
            <span className="microcopy">
              {running
                ? 'Speak now · stops at 12 seconds'
                : keyboardShortcut
                  ? 'Space to record / stop'
                  : 'Record, then stop to review'}
            </span>
            {running && (
              <meter
                min={0}
                max={1}
                value={meter}
                aria-label="Microphone input level"
              />
            )}
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
      {!!takes.length && !busy && (
        <div className="review-panel">
          <div className="section-label">
            <span>03 / LISTEN & ADJUST</span>
            <span>Last 3 takes · this delivery</span>
          </div>
          <div className="take-tabs" aria-label="Select a take">
            {takes.map((t) => (
              <button
                key={t.id}
                className={selected === t.id ? 'active' : ''}
                aria-pressed={selected === t.id}
                onClick={() => selectTake(t)}
              >
                Take {t.id}
                <span>{t.duration.toFixed(1)}s</span>
              </button>
            ))}
          </div>
          {take && (
            <>
              <div className="feedback-heading" role="status">
                <h3>{take.feedback.title}</h3>
                {take.feedback.score !== null && (
                  <div className="shape-score">
                    <strong>
                      {take.feedback.score}
                      <small>/100</small>
                    </strong>
                    <span>pitch similarity</span>
                  </div>
                )}
              </div>
              <p>{take.feedback.cue}</p>
              {delta !== null && (
                <p className="microcopy">
                  {delta > 0
                    ? `Up ${delta}`
                    : delta < 0
                      ? `Down ${Math.abs(delta)}`
                      : 'Unchanged'}{' '}
                  from the preceding take on pitch similarity.
                </p>
              )}
              {take.audioUrl ? (
                <audio
                  key={take.id}
                  ref={audioRef}
                  controls
                  src={take.audioUrl}
                  onPlay={() => stopContour()}
                  aria-label={`Listen to take ${take.id}`}
                />
              ) : (
                <p className="microcopy">
                  This browser captured the pitch trace but did not provide
                  audio playback.
                </p>
              )}
              {take.levels.length > 0 && (
                <details className="technical-detail">
                  <summary>Pitch notation & how to read this feedback</summary>
                  <p>
                    Prominent detected contour:{' '}
                    <ToneLetters levels={take.levels} />. Pitch similarity
                    compares one voiced stretch with the selected guide in your
                    calibrated range. It does not assess your words, timing,
                    emotion, or how another person would interpret you.
                  </p>
                </details>
              )}
            </>
          )}
        </div>
      )}
      <button
        className="text-button ear-toggle"
        disabled={busy}
        aria-expanded={byEar}
        onClick={() => setByEar(!byEar)}
      >
        {byEar
          ? 'Hide practice by ear'
          : 'Practice by ear · no microphone needed'}{' '}
        <span aria-hidden="true">{byEar ? '−' : '+'}</span>
      </button>
      {byEar && (
        <div className="ear-practice">
          <strong>Listen → hum → speak</strong>
          <ol>
            <li>Listen to the guide and trace its shape in the air.</li>
            <li>
              Hum the movement, then speak the line with the selected intention.
            </li>
            <li>
              Try the contrasting intention. Notice what changed in the ending,
              emphasis, and pace.
            </li>
          </ol>
          <p>
            Use the reflection below to note what you heard. This is your own
            assessment.
          </p>
        </div>
      )}
    </section>
  );
}
