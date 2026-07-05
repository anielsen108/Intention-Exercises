import { useEffect, useRef, type MutableRefObject } from 'react';
import type { Calibration } from '../analysis/calibration';
import { bandPosition } from '../analysis/calibration';
import type { TrackPoint } from '../analysis/track';
import { targetPolyline } from '../analysis/compare';
import { TONE_LETTERS } from '../content/tones';
import type { CanvasAnnotation } from './annotations';

interface Props {
  /** Live-growing list of pitch points; the component polls it via rAF. */
  pointsRef: MutableRefObject<TrackPoint[]>;
  calibration: Calibration;
  /** Optional target contour to draw as a soft ribbon guide. */
  targetLevels?: number[];
  /** Seconds of history to show while recording. */
  windowSec?: number;
  running: boolean;
  /** Notation overlay drawn on the finished take. */
  annotations?: CanvasAnnotation[];
  /** Spoken-word summary of the current state for screen readers. */
  ariaLabel?: string;
}

const BAND_VARS = ['--band1', '--band2', '--band3', '--band4', '--band5'];
const REPLAY_MS = 700;

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function PitchCanvas({
  pointsRef,
  calibration,
  targetLevels,
  windowSec = 5,
  running,
  annotations,
  ariaLabel,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wasRunning = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let raf = 0;

    // On stop, replay the take: the trace draws itself on over REPLAY_MS.
    const replaying = wasRunning.current && !running;
    wasRunning.current = running;
    const replayStart = performance.now();

    const bands = BAND_VARS.map(cssVar);
    const muted = cssVar('--fg-muted');
    const accent = cssVar('--accent');

    const draw = (now: number) => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      drawBands(ctx, w, h, bands, muted);

      const points = pointsRef.current;
      const tEnd = points.length > 0 ? points[points.length - 1].t : 0;
      const tStart = running ? Math.max(0, tEnd - windowSec) : 0;
      const span = running ? windowSec : Math.max(tEnd, 0.001);
      const xOf = (t: number) => ((t - tStart) / span) * w;
      const yOf = (pos: number) => h - pos * h;

      if (targetLevels && targetLevels.length > 0) {
        drawTargetRibbon(ctx, w, h, targetLevels, muted, yOf);
      }

      const progress = replaying
        ? Math.min(1, (now - replayStart) / REPLAY_MS)
        : 1;
      const tCut = tStart + span * progress;

      drawTrace(ctx, points, accent, tStart, tCut, xOf, yOf, running);

      if (!running && progress >= 1 && annotations && annotations.length > 0) {
        drawAnnotations(ctx, annotations, cssVar('--tone'), cssVar('--fg'), w, xOf, yOf);
      }

      if (running || (replaying && progress < 1)) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [pointsRef, calibration, targetLevels, windowSec, running, annotations]);

  return (
    <canvas
      ref={canvasRef}
      className="pitch-canvas"
      role="img"
      aria-label={ariaLabel ?? 'Live pitch trace over your five calibrated tone bands'}
    />
  );

  function drawTrace(
    ctx: CanvasRenderingContext2D,
    points: TrackPoint[],
    accent: string,
    tStart: number,
    tCut: number,
    xOf: (t: number) => number,
    yOf: (pos: number) => number,
    live: boolean,
  ) {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = accent;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    let pen = false;
    let last: { x: number; y: number } | null = null;
    for (const p of points) {
      if (p.t < tStart || p.t > tCut) continue;
      if (p.hz === null || p.clarity < 0.6) {
        pen = false;
        continue;
      }
      const x = xOf(p.t);
      const y = yOf(bandPosition(p.hz, calibration));
      if (pen) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
      pen = true;
      last = { x, y };
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // A bright dot rides the current pitch while live.
    if (live && last) {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBands(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bands: string[],
  muted: string,
) {
  ctx.font = '13px "Gentium Plus Web", serif';
  ctx.textBaseline = 'middle';
  for (let band = 0; band < 5; band++) {
    const yTop = h - ((band + 1) * h) / 5;
    // Band tint (hex + alpha suffix keeps this simple: tokens are 6-digit hex).
    ctx.fillStyle = `${bands[band]}17`;
    ctx.fillRect(0, yTop, w, h / 5);
    // Rule at the band's upper edge.
    ctx.strokeStyle = `${muted}2a`;
    ctx.beginPath();
    ctx.moveTo(0, yTop);
    ctx.lineTo(w, yTop);
    ctx.stroke();
    // Tone-letter axis label at the band center.
    ctx.fillStyle = bands[band];
    ctx.fillText(TONE_LETTERS[band], 8, yTop + h / 10);
  }
}

function drawAnnotations(
  ctx: CanvasRenderingContext2D,
  annotations: CanvasAnnotation[],
  toneColor: string,
  fgColor: string,
  w: number,
  xOf: (t: number) => number,
  yOf: (pos: number) => number,
) {
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  for (const a of annotations) {
    const x = Math.min(w - 24, Math.max(24, xOf(a.t)));
    const y = yOf(a.pos);
    if (a.kind === 'ipa') {
      ctx.font = `${a.emphasis ? 26 : 19}px "Gentium Plus Web", serif`;
      ctx.fillStyle = toneColor;
    } else {
      ctx.font = '12px ui-monospace, Consolas, monospace';
      ctx.fillStyle = a.kind === 'tobi-break' ? `${fgColor}99` : fgColor;
    }
    ctx.fillText(a.text, x, y);
  }
  ctx.textAlign = 'start';
}

function drawTargetRibbon(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  targetLevels: number[],
  muted: string,
  yOf: (pos: number) => number,
) {
  const line = targetPolyline(targetLevels, 32);
  ctx.strokeStyle = `${muted}30`;
  ctx.lineWidth = h / 5 - 6; // roughly one band thick: "land anywhere in here"
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  line.forEach((pos, i) => {
    const x = 24 + (i / (line.length - 1)) * (w - 48);
    if (i === 0) ctx.moveTo(x, yOf(pos));
    else ctx.lineTo(x, yOf(pos));
  });
  ctx.stroke();
}
