import { useEffect, useRef, type MutableRefObject } from 'react';
import type { Calibration } from '../analysis/calibration';
import { bandPosition } from '../analysis/calibration';
import type { TrackPoint } from '../analysis/track';
import { targetPolyline } from '../analysis/compare';

interface Props {
  /** Live-growing list of pitch points; the component polls it via rAF. */
  pointsRef: MutableRefObject<TrackPoint[]>;
  calibration: Calibration;
  /** Optional target contour to draw as a dashed guide. */
  targetLevels?: number[];
  /** Seconds of history to show. */
  windowSec?: number;
  running: boolean;
}

const BAND_COLORS = ['#4f46e51a', '#4f46e50d', '#4f46e51a', '#4f46e50d', '#4f46e51a'];

export function PitchCanvas({
  pointsRef,
  calibration,
  targetLevels,
  windowSec = 5,
  running,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;

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

      // Five calibrated bands, band 5 (extra high) on top.
      for (let band = 0; band < 5; band++) {
        ctx.fillStyle = BAND_COLORS[band];
        ctx.fillRect(0, (band * h) / 5, w, h / 5);
      }

      const points = pointsRef.current;
      const tEnd = points.length > 0 ? points[points.length - 1].t : 0;
      const tStart = running ? Math.max(0, tEnd - windowSec) : 0;
      const span = running ? windowSec : Math.max(tEnd, 0.001);
      const xOf = (t: number) => ((t - tStart) / span) * w;
      const yOf = (pos: number) => h - pos * h;

      if (targetLevels && targetLevels.length > 0) {
        const line = targetPolyline(targetLevels, 32);
        ctx.strokeStyle = '#71717d';
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        line.forEach((pos, i) => {
          const x = (i / (line.length - 1)) * w;
          if (i === 0) ctx.moveTo(x, yOf(pos));
          else ctx.lineTo(x, yOf(pos));
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      let pen = false;
      for (const p of points) {
        if (p.t < tStart) continue;
        if (p.hz === null || p.clarity < 0.6) {
          pen = false;
          continue;
        }
        const x = xOf(p.t);
        const y = yOf(bandPosition(p.hz, calibration));
        if (pen) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
        pen = true;
      }
      ctx.stroke();

      if (running) raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [pointsRef, calibration, targetLevels, windowSec, running]);

  return <canvas ref={canvasRef} className="pitch-canvas" />;
}
