import { useEffect, useRef, useState } from 'react';
import { playContour, stopContour } from '../audio/synth';
import type { Calibration } from '../analysis/calibration';

const QUESTIONS = [
  {
    levels: [4, 1],
    answer: 'A fall',
    explanation:
      'The pitch starts high and settles low. Try the same movement on “yes”.',
  },
  {
    levels: [2, 5],
    answer: 'A rise',
    explanation: 'The ending is higher than the beginning. Try it on “really?”',
  },
  {
    levels: [4, 1, 3],
    answer: 'A fall–rise',
    explanation:
      'The pitch dips, then turns upward. Try it on “fine” with a reservation.',
  },
];
const CHOICES = ['A rise', 'A fall', 'A fall–rise'];
export function EarTraining({
  calibration,
}: {
  calibration: Calibration | null;
}) {
  const [round, setRound] = useState(0);
  const [played, setPlayed] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [error, setError] = useState('');
  const locked = useRef(false);
  useEffect(() => () => stopContour(), []);
  const q = QUESTIONS[round];
  function reset() {
    setRound(0);
    setCorrect(0);
    setPicked(null);
    setPlayed(false);
    locked.current = false;
  }
  return (
    <section className="ear-training">
      <div>
        <span className="eyebrow">A 30-SECOND LISTENING WARM-UP</span>
        <h3>Can you hear the difference?</h3>
        <p>
          Listen without a graph. Name the movement before you try to make it.
        </p>
      </div>
      <div className="ear-challenge">
        {q ? (
          <>
            <div className="section-label">
              <span>QUESTION {round + 1} OF 3</span>
              <span>Headphones optional</span>
            </div>
            <button
              className="listen-button"
              onClick={() => {
                try {
                  playContour(q.levels, calibration ?? undefined, 1.25);
                  setPlayed(true);
                  setError('');
                } catch {
                  setError(
                    'Audio could not start. Try playing the sound again.',
                  );
                }
              }}
            >
              ▶ {played ? 'Play again' : 'Play the sound'}
            </button>
            <div className="ear-choices">
              {CHOICES.map((choice) => (
                <button
                  key={choice}
                  disabled={!played || picked !== null}
                  className={
                    picked && choice === q.answer
                      ? 'correct'
                      : picked === choice
                        ? 'incorrect'
                        : ''
                  }
                  onClick={() => {
                    if (locked.current) return;
                    locked.current = true;
                    setPicked(choice);
                    if (choice === q.answer) setCorrect((c) => c + 1);
                  }}
                >
                  {choice}
                </button>
              ))}
            </div>
            {!played && (
              <p className="microcopy">Play the sound to unlock the choices.</p>
            )}
            {error && <p role="alert">{error}</p>}
            {picked && (
              <div className="ear-answer" role="status">
                <p>
                  <b>
                    {picked === q.answer
                      ? 'You heard it.'
                      : `That was ${q.answer.toLowerCase()}.`}
                  </b>{' '}
                  {q.explanation}
                </p>
                <button
                  className="text-button"
                  onClick={() => {
                    stopContour();
                    setRound((r) => r + 1);
                    setPicked(null);
                    setPlayed(false);
                    locked.current = false;
                  }}
                >
                  {round === 2 ? 'See results' : 'Next sound'} →
                </button>
              </div>
            )}
          </>
        ) : (
          <div role="status">
            <h4>{correct} of 3 movements identified</h4>
            <p>Try a guided session to put the shapes into words.</p>
            <button className="text-button" onClick={reset}>
              Listen again ↻
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
