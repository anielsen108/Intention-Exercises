import { targetPolyline } from '../../analysis/compare';

const BAND_VARS = ['--band1', '--band2', '--band3', '--band4', '--band5'];

/** Small SVG rendering of a tone contour over the five band stripes. */
export function ContourGraph({
  levels,
  width = 200,
  height = 88,
}: {
  levels: number[];
  width?: number;
  height?: number;
}) {
  const line = targetPolyline(levels, 24);
  const points = line
    .map((pos, i) => {
      const x = 10 + (i / (line.length - 1)) * (width - 20);
      const y = height - pos * (height - 12) - 6;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      className="contour-graph"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden="true"
    >
      {BAND_VARS.map((v, band) => (
        <rect
          key={v}
          x="0"
          y={height - ((band + 1) * height) / 5}
          width={width}
          height={height / 5}
          fill={`var(${v})`}
          opacity="0.13"
        />
      ))}
      <polyline
        points={points}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
