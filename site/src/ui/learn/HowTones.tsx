import { useState } from 'react';
import type { Calibration } from '../../analysis/calibration';
import { ContourPlayer } from '../ContourPlayer';

const WORDS = [
  { word: 'I', meaning: 'Someone else may have said it; I didn’t.' },
  { word: 'never', meaning: 'I deny saying it at any time.' },
  { word: 'said', meaning: 'I may have implied it, but I didn’t say it.' },
  { word: 'she', meaning: 'I may have said someone else stole it.' },
  { word: 'stole', meaning: 'I may have said she borrowed it.' },
  { word: 'it', meaning: 'I may have said she stole something else.' },
];
export function HowTones({
  calibration,
  onNavigate,
}: {
  calibration: Calibration | null;
  onNavigate: (view: 'learn' | 'practice') => void;
}) {
  const [stress, setStress] = useState(0);
  const [shape, setShape] = useState(0);
  const shapes = [
    { name: 'A settled ending', levels: [4, 1] },
    { name: 'An open question', levels: [2, 5] },
    { name: 'A reservation', levels: [4, 1, 3] },
  ];
  return (
    <div className="how-page">
      <header className="how-header">
        <div className="eyebrow">HOW THE PRACTICE WORKS</div>
        <h1>
          Give the same words
          <br />
          <em>a different job.</em>
        </h1>
        <p>
          “You’re coming” can confirm a plan, ask a question, or carry a
          reservation. Your voice helps a listener decide which one you mean.
        </p>
      </header>
      <section className="how-section">
        <div className="how-number">01</div>
        <div>
          <h2>Start with a situation.</h2>
          <p>
            Who are you speaking to? What do you want them to understand or do?
            Each guided exercise gives you a situation so that your delivery has
            a purpose.
          </p>
          <div className="situation-pair">
            <div>
              <span className="eyebrow">CONFIRMING A PLAN</span>
              <p>
                Your friend already agreed.
                <br />
                <b>“You’re coming.”</b>
              </p>
            </div>
            <div>
              <span className="eyebrow">CHECKING THE PLAN</span>
              <p>
                You’re still waiting for an answer.
                <br />
                <b>“You’re coming?”</b>
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="how-section">
        <div className="how-number">02</div>
        <div>
          <h2>Change one thing you can hear.</h2>
          <p>
            Begin with the direction of the pitch. Listen to these sketches, hum
            along, then speak the line. The sounds illustrate pitch movement;
            they are not recordings of a person delivering the sentence.
          </p>
          <div className="variation-chips">
            {shapes.map((s, i) => (
              <button
                key={s.name}
                className={`chip ${shape === i ? 'active' : ''}`}
                aria-pressed={shape === i}
                onClick={() => setShape(i)}
              >
                {s.name}
              </button>
            ))}
          </div>
          <ContourPlayer
            key={shape}
            levels={shapes[shape].levels}
            calibration={calibration}
          />
          <p>
            In these examples, a fall can help settle the thought, a rise can
            invite an answer, and a fall–rise can suggest a reservation. These
            are possibilities to explore. Context and accent can change how a
            listener interprets them.
          </p>
        </div>
      </section>
      <section className="how-section">
        <div className="how-number">03</div>
        <div>
          <h2>Move the emphasis.</h2>
          <p>
            Choose a word to emphasize, then say the sentence. The line beneath
            it gives one possible implication.
          </p>
          <div className="stress-widget">
            <div className="stress-words">
              {WORDS.map((w, i) => (
                <button
                  key={w.word}
                  aria-pressed={stress === i}
                  className={stress === i ? 'active' : ''}
                  onClick={() => setStress(i)}
                >
                  {w.word}
                </button>
              ))}
            </div>
            <p aria-live="polite">{WORDS[stress].meaning}</p>
          </div>
          <p>
            Give the important word a little more duration or pitch movement.
            You don’t need to make the whole sentence louder.
          </p>
        </div>
      </section>
      <section className="how-section">
        <div className="how-number">04</div>
        <div>
          <h2>Listen beyond the pitch line.</h2>
          <div className="levers-grid">
            <div>
              <h3>Timing</h3>
              <p>
                A pause before “now” adds attention to it. A pause after a
                question makes space for a reply.
              </p>
            </div>
            <div>
              <h3>Voice quality</h3>
              <p>
                A gentle onset and an easy pace can soften a falling line. A
                clipped ending can make the same line feel firmer.
              </p>
            </div>
          </div>
          <p>
            Record the two intentions and compare the takes. Pick one thing to
            adjust, then try again. Aim for a delivery you could use in
            conversation.
          </p>
        </div>
      </section>
      <section className="measurement-note">
        <h2>What the feedback can tell you</h2>
        <p>
          The graph shows detected pitch over time. In “Isolate the shape”, a
          similarity score compares a single voiced stretch with a pitch guide
          fitted to your range. Short, unclear, or ambiguous recordings receive
          a retry cue instead of a score.
        </p>
        <p>
          The app does not recognize your words or judge your emotion,
          authenticity, stress placement, or success with a listener. Whole
          sentences are for playback and self-assessment. Your recordings stay
          in this browser tab; practice progress and voice range are saved
          locally when browser storage is available.
        </p>
        <p>
          For the notation behind the guides, see the{' '}
          <a
            href="https://www.ling.ohio-state.edu/research/phonetics/E_ToBI/"
            target="_blank"
            rel="noreferrer"
          >
            Ohio State ToBI labelling guide
          </a>{' '}
          and the{' '}
          <a
            href="https://www.internationalphoneticassociation.org/content/ipa-chart"
            target="_blank"
            rel="noreferrer"
          >
            International Phonetic Association chart
          </a>
          . The studio’s five pitch bands are a teaching convention relative to
          your voice.
        </p>
      </section>
      <div className="how-cta">
        <h2>Try the contrast yourself.</h2>
        <button
          className="primary-button"
          onClick={() => onNavigate('practice')}
        >
          Go to the practice studio →
        </button>
        <button className="text-button" onClick={() => onNavigate('learn')}>
          Explore the notation
        </button>
      </div>
    </div>
  );
}
