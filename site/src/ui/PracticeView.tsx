import { useEffect, useState } from 'react';
import type { Calibration } from '../analysis/calibration';
import type { Exercise, Variation } from '../content/types';
import { levelsToToneLetters } from '../content/tones';
import { boldSegments } from './format';
import { RecorderPanel } from './RecorderPanel';

function Bold({ text }: { text: string }) {
  return (
    <>
      {boldSegments(text).map((seg, i) =>
        seg.bold ? <strong key={i}>{seg.text}</strong> : <span key={i}>{seg.text}</span>,
      )}
    </>
  );
}

/** Render the IPA sentence with tone letters attached to their marked words. */
function IpaSentence({ variation }: { variation: Variation }) {
  const { sentence, markers } = variation;
  if (!sentence || !markers || markers.length === 0) return <>{sentence}</>;

  // Walk the sentence, wrapping each marker word (in order) where it occurs.
  const parts: React.ReactNode[] = [];
  let rest = sentence;
  let key = 0;
  for (const marker of markers) {
    const idx = rest.indexOf(marker.word);
    if (idx === -1) continue;
    if (idx > 0) parts.push(<span key={key++}>{rest.slice(0, idx)}</span>);
    parts.push(
      <span key={key++} className="ipa-marker">
        {marker.word}
        <span className="tone-letters">{levelsToToneLetters(marker.levels)}</span>
      </span>,
    );
    rest = rest.slice(idx + marker.word.length);
  }
  if (rest) parts.push(<span key={key++}>{rest}</span>);
  return <>{parts}</>;
}

function VariationCard({
  variation,
  active,
  onSelect,
}: {
  variation: Variation;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`variation ${active ? 'active' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
    >
      <h3>{variation.intention}</h3>
      {variation.sentence && (
        <p className="ipa-sentence">
          <IpaSentence variation={variation} />
        </p>
      )}
      <dl>
        {variation.tobi && (
          <>
            <dt>ToBI</dt>
            <dd className="tobi">{variation.tobi}</dd>
          </>
        )}
        {variation.stress && (
          <>
            <dt>Stress</dt>
            <dd>
              <Bold text={variation.stress} />
            </dd>
          </>
        )}
        {variation.pauses && (
          <>
            <dt>Pauses</dt>
            <dd>
              <Bold text={variation.pauses} />
            </dd>
          </>
        )}
      </dl>
      {variation.note && <p className="note">{variation.note}</p>}
    </div>
  );
}

interface PracticeProps {
  exercise: Exercise;
  calibration: Calibration | null;
  onRequestCalibration: () => void;
}

export function PracticeView({ exercise, calibration, onRequestCalibration }: PracticeProps) {
  const [variationIdx, setVariationIdx] = useState(0);
  useEffect(() => setVariationIdx(0), [exercise.id]);

  const variation = exercise.variations[variationIdx] ?? null;

  return (
    <article className="practice">
      <header>
        <div className="crumb">
          {exercise.section ? `${exercise.section} · ` : ''}#{exercise.number}
        </div>
        <h2 className="sentence">“{exercise.text}”</h2>
        {exercise.variations.length > 1 && (
          <p className="hint">Pick a variation to practice, then record.</p>
        )}
      </header>
      <div className="variations">
        {exercise.variations.map((v, i) => (
          <VariationCard
            key={i}
            variation={v}
            active={i === variationIdx}
            onSelect={() => setVariationIdx(i)}
          />
        ))}
      </div>
      <RecorderPanel
        calibration={calibration}
        variation={variation}
        onRequestCalibration={onRequestCalibration}
      />
    </article>
  );
}
