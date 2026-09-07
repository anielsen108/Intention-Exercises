import { useState } from 'react';
import type { Calibration } from '../analysis/calibration';
import { describeShape } from '../analysis/coaching';
import type { Exercise, Variation } from '../content/types';
import type { CoachedVariation } from '../content/sessions';
import { contourForPattern } from './learn/helpers';
import { boldSegments } from './format';
import { RecorderPanel } from './RecorderPanel';
import { ContourPlayer } from './ContourPlayer';
import { TobiNotation, ToneLetters } from './ToneMarks';

function Bold({ text }: { text: string }) {
  return (
    <>
      {boldSegments(text).map((seg, i) =>
        seg.bold ? (
          <strong key={i}>{seg.text}</strong>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}
function isCoached(v: Variation): v is CoachedVariation {
  return 'situation' in v;
}

interface Props {
  exercise: Exercise;
  calibration: Calibration | null;
  onRequestCalibration: () => void;
  initialVariation?: number;
  completed: string[];
  onComplete: (variation: number) => void;
  onBusy?: (busy: boolean) => void;
  onVariationChange?: (index: number) => void;
  nextLabel?: string;
}

export function PracticeView({
  exercise,
  calibration,
  onRequestCalibration,
  initialVariation = 0,
  completed,
  onComplete,
  onBusy,
  onVariationChange,
  nextLabel = 'Mark practiced & continue',
}: Props) {
  const [variationIdx, setVariationIdx] = useState(initialVariation);
  const [markerIdx, setMarkerIdx] = useState(0);
  const [mode, setMode] = useState<'shape' | 'sentence'>('shape');
  const [busy, setBusy] = useState(false);
  const [reflection, setReflection] = useState<string | null>(null);
  const variation = exercise.variations[variationIdx];
  if (!variation)
    return <p>This exercise has no delivery notes. Choose another exercise.</p>;
  const coached = isCoached(variation) ? variation : null;
  const markers = variation.markers ?? [];
  const marker = markers[markerIdx] ?? markers[0];
  const preview =
    marker?.levels ?? contourForPattern((variation.tobi ?? '').split(/\s+/));
  const canScore = !!marker && mode === 'shape';
  const practiced = completed.includes(`${exercise.id}/${variationIdx}`);
  const sentence = variation.sentence || exercise.text;
  const wordAt = marker
    ? sentence.toLowerCase().indexOf(marker.word.toLowerCase())
    : -1;
  function selectVariation(i: number) {
    setVariationIdx(i);
    setMarkerIdx(0);
    setReflection(null);
    onVariationChange?.(i);
  }
  function handleBusy(value: boolean) {
    setBusy(value);
    onBusy?.(value);
  }
  return (
    <article className="practice">
      <div className="practice-layout">
        <div className="practice-main">
          <header className="script-card">
            <div className="section-label">
              <span>SAME WORDS. A DIFFERENT INTENTION.</span>
              {practiced && (
                <span className="practiced-label">✓ Practiced</span>
              )}
            </div>
            <h2 className="sentence">
              “
              {wordAt >= 0 ? (
                <>
                  {sentence.slice(0, wordAt)}
                  <em>{sentence.slice(wordAt, wordAt + marker.word.length)}</em>
                  {sentence.slice(wordAt + marker.word.length)}
                </>
              ) : (
                sentence
              )}
              ”
            </h2>
            <div className="intention-switch" aria-label="Choose a delivery">
              {exercise.variations.map((v, i) => (
                <button
                  key={i}
                  disabled={busy}
                  aria-pressed={i === variationIdx}
                  className={i === variationIdx ? 'active' : ''}
                  onClick={() => selectVariation(i)}
                >
                  <span className="intention-letter">
                    {String.fromCharCode(65 + i)}
                  </span>
                  {v.intention}
                  {completed.includes(`${exercise.id}/${i}`) && (
                    <span className="intention-check" aria-label="Practiced">
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
            {coached && (
              <div className="mobile-direction">
                <p>{coached.situation}</p>
                <details>
                  <summary>Delivery direction</summary>
                  <p>{coached.action}</p>
                </details>
              </div>
            )}
          </header>
          <section className="guide-panel">
            <div className="section-label">
              <span>01 / HEAR THE MOVEMENT</span>
              <span>
                {marker ? describeShape(preview) : 'Approximate pitch sketch'}
              </span>
            </div>
            {markers.length > 1 && (
              <div className="marker-picker">
                <span>Focus word</span>
                {markers.map((m, i) => (
                  <button
                    key={i}
                    disabled={busy}
                    aria-pressed={markerIdx === i}
                    className={markerIdx === i ? 'active' : ''}
                    onClick={() => setMarkerIdx(i)}
                  >
                    {m.word}
                  </button>
                ))}
              </div>
            )}
            {preview.length > 0 ? (
              <ContourPlayer
                key={`${variationIdx}/${markerIdx}`}
                levels={preview}
                calibration={calibration}
                disabled={busy}
              />
            ) : (
              <p>
                Use the delivery notes and compare two spoken takes. This
                exercise has no pitch guide.
              </p>
            )}
            {marker && (
              <div className="practice-mode" aria-label="Practice scope">
                <button
                  disabled={busy}
                  aria-pressed={mode === 'shape'}
                  className={mode === 'shape' ? 'active' : ''}
                  onClick={() => setMode('shape')}
                >
                  Isolate the shape
                </button>
                <button
                  disabled={busy}
                  aria-pressed={mode === 'sentence'}
                  className={mode === 'sentence' ? 'active' : ''}
                  onClick={() => setMode('sentence')}
                >
                  Use the whole sentence
                </button>
              </div>
            )}
          </section>
          <RecorderPanel
            key={`${variationIdx}/${markerIdx}/${mode}/${calibration?.lowHz}/${calibration?.highHz}`}
            calibration={calibration}
            targetLevels={canScore ? marker.levels : undefined}
            prompt={
              canScore
                ? `Hum the shape, or stretch the stressed vowel in “${marker.word}”.`
                : `Say the whole line: ${variation.intention.toLowerCase()}.`
            }
            onRequestCalibration={onRequestCalibration}
            onBusy={handleBusy}
          />
          <section className="reflection-panel">
            <div className="section-label">
              <span>04 / MAKE IT INTENTIONAL</span>
              <span>Your assessment</span>
            </div>
            <h3>
              {coached?.listenFor ??
                'Did the delivery communicate the intention you chose?'}
            </h3>
            <div className="reflection-choices">
              {[
                'Yes, I can hear it',
                'I want another try',
                'I’m still exploring',
              ].map((value) => (
                <button
                  key={value}
                  disabled={busy}
                  aria-pressed={reflection === value}
                  className={reflection === value ? 'active' : ''}
                  onClick={() => setReflection(value)}
                >
                  {value}
                </button>
              ))}
            </div>
            <div role="status" className="reflection-note">
              {reflection === 'I want another try'
                ? 'Change one thing: the starting pitch, the ending, or the pace. Record again and compare the takes.'
                : reflection === 'I’m still exploring'
                  ? 'Exaggerate the contrast once. Then make it smaller until the delivery feels conversational.'
                  : reflection === 'Yes, I can hear it'
                    ? 'Try it once more at a natural pace. Keep the intention as you make the pitch movement smaller.'
                    : 'After speaking or listening back, choose what you noticed.'}
            </div>
            <button
              className="primary-button continue-button"
              disabled={!reflection || busy}
              onClick={() => {
                onComplete(variationIdx);
                setReflection(null);
                if (variationIdx + 1 < exercise.variations.length)
                  selectVariation(variationIdx + 1);
              }}
            >
              {variationIdx + 1 < exercise.variations.length
                ? 'Practice the next intention'
                : nextLabel}{' '}
              <span aria-hidden="true">→</span>
            </button>
          </section>
        </div>
        <aside className="coach-sidebar">
          <div className="coach-note">
            <div className="eyebrow">YOUR DIRECTION</div>
            <h3>{variation.intention}</h3>
            {coached && (
              <>
                <span className="note-label">The situation</span>
                <p>{coached.situation}</p>
              </>
            )}
            <span className="note-label">Try this</span>
            <p>
              {coached?.action ??
                variation.note ??
                (marker
                  ? `${describeShape(marker.levels)} on “${marker.word}”. Keep the rest of the phrase conversational, then compare a different delivery.`
                  : 'Use the stress and pause notes below. Record at a comfortable speaking volume, then listen for the effect of the ending.')}
            </p>
            <span className="note-label">Listen for</span>
            <p>
              {coached?.listenFor ??
                'What changes when you try a different intention on the same words?'}
            </p>
          </div>
          <div className="practice-recipe">
            <span className="eyebrow">A USEFUL REPETITION</span>
            <ol>
              <li>
                <b>Hear it.</b> Follow the direction.
              </li>
              <li>
                <b>Hum it.</b> Find the movement.
              </li>
              <li>
                <b>Speak it.</b> Give it a situation.
              </li>
              <li>
                <b>Compare it.</b> Change one thing.
              </li>
            </ol>
          </div>
          <details className="notation-notes">
            <summary>Notation & delivery notes</summary>
            {markers.map((m, i) => (
              <p key={i}>
                {m.word} <ToneLetters levels={m.levels} />
              </p>
            ))}
            {variation.tobi && (
              <p>
                <TobiNotation value={variation.tobi} />
              </p>
            )}
            {variation.stress && (
              <p>
                <b>Stress:</b> <Bold text={variation.stress} />
              </p>
            )}
            {variation.pauses && (
              <p>
                <b>Pauses:</b> <Bold text={variation.pauses} />
              </p>
            )}
            {variation.note && <p>{variation.note}</p>}
            <a href="#notation">Learn to read the symbols ↗</a>
          </details>
          <p className="scope-note">
            Pitch is one part of delivery. These shapes are practice
            suggestions; meaning also depends on context, accent, timing, and
            voice quality.
          </p>
        </aside>
      </div>
    </article>
  );
}
