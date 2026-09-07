import { useEffect, useRef, type MutableRefObject } from 'react';
import type { Calibration } from '../analysis/calibration';
import { bandPosition, LEVEL_NAMES } from '../analysis/calibration';
import {
  chartDomain,
  reliablePitch,
  formatDuration,
  type SoundRegion,
} from '../analysis/timing';
import type { TrackPoint } from '../analysis/track';
import { targetPolyline } from '../analysis/compare';
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
  focusRegion?: SoundRegion;
  fullTake?: boolean;
  /** Notation overlay drawn on the finished take. */
  annotations?: CanvasAnnotation[];
  /** Spoken-word summary of the current state for screen readers. */
  ariaLabel?: string;
}

const BAND_VARS = ['--band1', '--band2', '--band3', '--band4', '--band5'];

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

export function PitchCanvas({
  pointsRef,
  calibration,
  targetLevels,
  windowSec = 2,
  running,
  focusRegion,
  fullTake = false,
  annotations,
  ariaLabel,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let raf = 0;

    const bands = BAND_VARS.map(cssVar);
    const muted = cssVar('--fg-muted');
    const accent = cssVar('--accent');

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const plotH = h - 26;
      drawBands(ctx, w, plotH, bands, muted);

      const points = pointsRef.current;
      const domain = chartDomain(
        points,
        running,
        windowSec,
        focusRegion,
        fullTake,
      );
      const tStart = domain.start,
        span = domain.end - domain.start;
      const xOf = (t: number) => 64 + ((t - tStart) / span) * (w - 84);
      const yOf = (pos: number) => plotH - pos * plotH;
      canvas.dataset.timeStart = String(tStart);
      canvas.dataset.timeEnd = String(domain.end);
      if (!running && targetLevels?.length) {
        drawTargetRibbon(
          ctx,
          xOf(focusRegion?.start ?? tStart),
          xOf(focusRegion?.end ?? domain.end),
          targetLevels,
          cssVar('--tone'),
          yOf,
        );
      }
      ctx.fillStyle = muted;
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.textBaseline = 'middle';
      for (const fraction of [0, 0.5, 1]) {
        ctx.textAlign =
          fraction === 0 ? 'left' : fraction === 1 ? 'right' : 'center';
        const t = tStart + span * fraction;
        const label = fullTake
          ? formatDuration(t)
          : formatDuration(span * fraction);
        ctx.fillText(label, xOf(t), h - 10);
      }
      ctx.textAlign = 'start';
      drawTrace(
        ctx,
        points,
        calibration,
        accent,
        tStart,
        domain.end,
        xOf,
        yOf,
        running,
      );

      if (!running && annotations && annotations.length > 0) {
        drawAnnotations(
          ctx,
          annotations,
          cssVar('--tone'),
          cssVar('--fg'),
          w,
          xOf,
          yOf,
        );
      }

      if (running) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    const resize = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    });
    resize.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
    };
  }, [
    pointsRef,
    calibration,
    targetLevels,
    windowSec,
    running,
    annotations,
    focusRegion,
    fullTake,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className="pitch-canvas"
      role="img"
      aria-label={
        ariaLabel ?? 'Live pitch trace over your five calibrated tone bands'
      }
    />
  );
}

function drawTrace(
  ctx: CanvasRenderingContext2D,
  points: TrackPoint[],
  calibration: Calibration,
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
    if (!reliablePitch(p)) {
      pen = false;
      continue;
    }
    const x = xOf(p.t);
    const y = yOf(bandPosition(p.hz!, calibration));
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

function drawBands(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bands: string[],
  muted: string,
) {
  ctx.font = '10px "Segoe UI", sans-serif';
  ctx.textBaseline = 'middle';
  for (let band = 0; band < 5; band++) {
    const yTop = h - ((band + 1) * h) / 5;
    // Band tint (hex + alpha suffix keeps this simple: tokens are 6-digit hex).
    ctx.fillStyle = `${bands[band]}09`;
    ctx.fillRect(0, yTop, w, h / 5);
    // Rule at the band's upper edge.
    ctx.strokeStyle = `${muted}2a`;
    ctx.beginPath();
    ctx.moveTo(0, yTop);
    ctx.lineTo(w, yTop);
    ctx.stroke();
    // Tone-letter axis label at the band center.
    ctx.fillStyle = muted;
    ctx.fillText(LEVEL_NAMES[band].toLowerCase(), 5, yTop + h / 10);
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
  xStart: number,
  xEnd: number,
  targetLevels: number[],
  muted: string,
  yOf: (pos: number) => number,
) {
  const line = targetPolyline(targetLevels, 32);
  ctx.strokeStyle = `${muted}30`;
  ctx.lineWidth = 10;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  line.forEach((pos, i) => {
    const x = xStart + (i / (line.length - 1)) * (xEnd - xStart);
    if (i === 0) ctx.moveTo(x, yOf(pos));
    else ctx.lineTo(x, yOf(pos));
  });
  ctx.stroke();
}
