import type { Exercise, Variation } from '../content/types';
import { levelsToToneLetters } from '../content/tones';
import { boldSegments } from './format';

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

function VariationCard({ variation }: { variation: Variation }) {
  return (
    <div className="variation">
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

export function PracticeView({ exercise }: { exercise: Exercise }) {
  return (
    <article className="practice">
      <header>
        <div className="crumb">
          {exercise.section ? `${exercise.section} · ` : ''}#{exercise.number}
        </div>
        <h2 className="sentence">“{exercise.text}”</h2>
      </header>
      <div className="variations">
        {exercise.variations.map((v, i) => (
          <VariationCard key={i} variation={v} />
        ))}
      </div>
      <footer className="coming-soon">
        <button disabled title="Live pitch analysis arrives in Phase 1">
          ● Record (coming soon)
        </button>
        <span>Live pitch trace + IPA/ToBI transcription of your voice lands in Phase 1–3.</span>
      </footer>
    </article>
  );
}
