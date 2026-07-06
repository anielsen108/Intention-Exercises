import type { Calibration } from '../../analysis/calibration';
import { playContour } from '../../audio/synth';
import { levelsToToneLetters } from '../../content/tones';
import { ContourGraph } from './ContourGraph';

interface Props {
  /** Tone levels 1..5 describing the contour. */
  levels: number[];
  /** Big symbol shown on the card; defaults to the tone letters. */
  symbol?: string;
  /** Set for ToBI symbols so they render in monospace, not the tone font. */
  mono?: boolean;
  /** Hide the notation symbol entirely (for non-technical pages). */
  hideSymbol?: boolean;
  title: string;
  description: string;
  calibration: Calibration | null;
}

/** A symbol card: shape, name, meaning, and a button to hear it. */
export function ContourDemo({
  levels,
  symbol,
  mono,
  hideSymbol,
  title,
  description,
  calibration,
}: Props) {
  return (
    <div className="demo-card">
      <div className="demo-head">
        <span className={`demo-symbol ${mono ? 'tobi' : 'tone-letters'}`}>
          {hideSymbol ? '' : (symbol ?? levelsToToneLetters(levels))}
        </span>
        <button
          className="play-btn"
          aria-label={`Play ${title}`}
          onClick={() => playContour(levels, calibration ?? undefined)}
        >
          ▶
        </button>
      </div>
      <ContourGraph levels={levels} />
      <h4>{title}</h4>
      <p>{description}</p>
    </div>
  );
}
