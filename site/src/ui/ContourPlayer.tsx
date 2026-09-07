import { useEffect, useId, useRef, useState } from 'react';
import { LEVEL_NAMES, type Calibration } from '../analysis/calibration';
import { describeShape } from '../analysis/coaching';
import { playContour, stopContour } from '../audio/synth';
import { targetPolyline } from '../analysis/compare';
import { GUIDE_DURATIONS, formatDuration } from '../analysis/timing';

export function ContourPlayer({
  levels,
  calibration,
  compact = false,
  label = 'Hear the pitch guide',
  disabled = false,
  takeDuration,
}: {
  levels: number[];
  calibration: Calibration | null;
  compact?: boolean;
  label?: string;
  disabled?: boolean;
  takeDuration?: number;
}) {
  const [playing, setPlaying] = useState(false);
  const [pace, setPace] = useState('0.35');
  const duration =
    pace === 'take' && takeDuration ? takeDuration : Number(pace) || 0.35;
  const paceId = useId();
  const [error, setError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      stopContour();
    },
    [],
  );
  useEffect(() => {
    setPlaying(false);
    stopContour();
    if (timer.current) clearTimeout(timer.current);
  }, [levels, calibration, takeDuration, disabled]);
  const line = targetPolyline(levels, 48);
  const points = line
    .map((p, i) => `${64 + (i / 47) * 456},${146 - p * 112}`)
    .join(' ');
  function play() {
    setError(false);
    if (playing) {
      stopContour();
      setPlaying(false);
      return;
    }
    try {
      playContour(levels, calibration ?? undefined, duration);
      setPlaying(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(
        () => setPlaying(false),
        (duration + 0.06) * 1000,
      );
    } catch {
      setError(true);
    }
  }
  return (
    <div className={`contour-player ${compact ? 'compact' : ''}`}>
      <svg viewBox="0 0 560 180" role="img" aria-label={describeShape(levels)}>
        {[0.1, 0.3, 0.5, 0.7, 0.9].map((p) => (
          <line
            key={p}
            x1="64"
            x2="520"
            y1={146 - p * 112}
            y2={146 - p * 112}
            className="guide-grid"
          />
        ))}
        {LEVEL_NAMES.map((name, i) => (
          <text
            key={name}
            x="2"
            y={149 - ((i + 0.5) / 5) * 112}
            className="axis-label"
          >
            {name.toLowerCase()}
          </text>
        ))}
        <polyline points={points} className="guide-shadow" />
        <polyline points={points} className="guide-line" />
        {playing && (
          <polyline
            key={String(duration)}
            points={points}
            className="guide-playhead"
            pathLength="1"
            style={{ animationDuration: `${duration}s` }}
          />
        )}
        <text x="64" y="172" className="axis-label">
          start
        </text>
        <text x="496" y="172" className="axis-label">
          finish
        </text>
      </svg>
      <div className="player-controls">
        <button
          className="listen-button"
          onClick={play}
          disabled={disabled}
          aria-pressed={playing}
        >
          <span aria-hidden="true">{playing ? '■' : '▶'}</span>{' '}
          {playing ? 'Stop guide' : label}
        </button>
        <label className="guide-duration" htmlFor={paceId}>
          Guide duration
          <select
            id={paceId}
            value={pace === 'take' && !takeDuration ? '0.35' : pace}
            disabled={playing || disabled}
            onChange={(e) => setPace(e.target.value)}
          >
            {GUIDE_DURATIONS.map((item) => (
              <option key={item.seconds} value={String(item.seconds)}>
                {item.label} · {formatDuration(item.seconds)}
              </option>
            ))}
            {takeDuration && (
              <option value="take">
                Match my sound · {formatDuration(takeDuration)}
              </option>
            )}
          </select>
        </label>
      </div>
      {!compact && (
        <p className="microcopy">
          A synthesized pitch shape. Choose a pace, then try the word naturally.
          Your take is compared by shape; guide duration isn’t a timing test.
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          Audio couldn’t start. Try the play button again in a browser with Web
          Audio support.
        </p>
      )}
    </div>
  );
}
