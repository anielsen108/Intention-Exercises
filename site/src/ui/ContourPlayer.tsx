import { useEffect, useRef, useState } from 'react';
import type { Calibration } from '../analysis/calibration';
import { describeShape } from '../analysis/coaching';
import { playContour, stopContour } from '../audio/synth';
import { targetPolyline } from '../analysis/compare';

export function ContourPlayer({
  levels,
  calibration,
  compact = false,
  label = 'Hear the pitch guide',
  disabled = false,
}: {
  levels: number[];
  calibration: Calibration | null;
  compact?: boolean;
  label?: string;
  disabled?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [slow, setSlow] = useState(false);
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
  }, [levels]);
  const line = targetPolyline(levels, 48);
  const points = line
    .map((p, i) => `${40 + (i / 47) * 480},${146 - p * 112}`)
    .join(' ');
  function play() {
    setError(false);
    if (playing) {
      stopContour();
      setPlaying(false);
      return;
    }
    try {
      const duration = slow ? 1.9 : 1.15;
      playContour(levels, calibration ?? undefined, duration);
      setPlaying(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(
        () => setPlaying(false),
        (duration + 0.15) * 1000,
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
            x1="40"
            x2="520"
            y1={146 - p * 112}
            y2={146 - p * 112}
            className="guide-grid"
          />
        ))}
        <text x="2" y="48" className="axis-label">
          high
        </text>
        <text x="5" y="139" className="axis-label">
          low
        </text>
        <polyline points={points} className="guide-shadow" />
        <polyline points={points} className="guide-line" />
        {playing && (
          <polyline
            key={String(slow)}
            points={points}
            className="guide-playhead"
            pathLength="1"
            style={{ animationDuration: `${slow ? 1.9 : 1.15}s` }}
          />
        )}
        <text x="40" y="172" className="axis-label">
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
        <button
          className="speed-button"
          aria-pressed={slow}
          disabled={playing || disabled}
          onClick={() => setSlow(!slow)}
        >
          {slow ? 'Slow · 0.6×' : 'Speed · 1×'}
        </button>
      </div>
      {!compact && (
        <p className="microcopy">
          A synthesized hum of the pitch shape. Try it on a hum, then on the
          words.
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
