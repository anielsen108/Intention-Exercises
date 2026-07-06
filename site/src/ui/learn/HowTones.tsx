import { useState } from 'react';
import type { Calibration } from '../../analysis/calibration';
import { playContour } from '../../audio/synth';
import { ContourDemo } from './ContourDemo';

interface Props {
  calibration: Calibration | null;
  onNavigate: (view: 'learn' | 'practice') => void;
}

/** "I thought you'd say that." — one sentence, three deliveries (from the corpus). */
const THREE_WAYS = [
  {
    symbol: 'H* L* H+L* L-L%',
    levels: [4, 3, 3, 1],
    title: 'Authoritative',
    description:
      'Firm pace, narrow pitch, decisive fall on “that”. The melody closes the door: nothing left to discuss.',
  },
  {
    symbol: 'L* H* L+H* L-H%',
    levels: [2, 4, 3, 4],
    title: 'Inviting',
    description:
      'Lighter onset, a lift on “say”, soft rising landing. The melody leaves the door open: your turn.',
  },
  {
    symbol: 'L* H* L* L-L%',
    levels: [3, 3, 3, 2],
    title: 'Informative',
    description:
      'Even tempo, mid-level arc, gentle fall. No agenda — just the fact, plainly delivered.',
  },
];

/** The classic stress-shift demonstration. */
const STRESS_WORDS: { word: string; implication: string }[] = [
  { word: 'I', implication: '…someone else said she stole it.' },
  { word: 'never', implication: '…I absolutely deny ever saying it.' },
  { word: 'said', implication: '…I may have implied it, but I didn’t say it.' },
  { word: 'she', implication: '…someone stole it — just not her.' },
  { word: 'stole', implication: '…she did something with it, but not stealing.' },
  { word: 'it', implication: '…she stole something, but not that.' },
];

const INTENTION_MAP = [
  {
    levels: [5, 1],
    title: 'Command / certainty',
    description: 'A clean high fall. In ToBI terms: H* L-L%. “Stop.” “It’s decided.”',
  },
  {
    levels: [1, 5],
    title: 'Genuine question / appeal',
    description: 'A committed rise. ToBI: L* H-H%. “Really?” “You’re coming?”',
  },
  {
    levels: [3, 2],
    title: 'Reassurance / calm',
    description: 'A small, warm fall from mid — low effort, low stakes. “It’s fine. Breathe.”',
  },
  {
    levels: [5, 1, 5],
    title: 'Irony / reservation',
    description:
      'The fall–rise. ToBI: L+H* L-H%. The melody contradicts the words — “yeah, great…”',
  },
  {
    levels: [1, 3, 5],
    title: 'Urgency / pleading',
    description: 'A rise that keeps climbing. “Please — now!” Momentum without resolution.',
  },
  {
    levels: [1, 1],
    title: 'Resignation / flatness',
    description: 'No melody at all — and that absence is the message. “Whatever.”',
  },
];

export function HowTones({ calibration, onNavigate }: Props) {
  const [stressIdx, setStressIdx] = useState<number | null>(null);
  const cal = calibration ?? undefined;

  return (
    <div className="learn-track">
      <h2>How tones convey intention</h2>
      <p>
        Words carry the <em>content</em> of a message; melody, stress, and timing carry the{' '}
        <em>intention</em> — who's in charge, whether the door is open, whether you mean it.
        Listeners decode this layer instantly and involuntarily. Speakers, though, usually
        control it by instinct alone. Making that layer conscious and controllable is the
        whole point of this site.
      </p>

      <h3>One sentence, three messages</h3>
      <p>
        Take the corpus's own example: <strong>“I thought you'd say that.”</strong> Same six
        words — three entirely different social moves. Play each melody.
      </p>
      <div className="demo-grid">
        {THREE_WAYS.map((w) => (
          <ContourDemo key={w.title} {...w} mono calibration={calibration} />
        ))}
      </div>

      <h3>The four levers</h3>

      <h4>1. Contour — direction is stance</h4>
      <p>
        Falls close; rises open; fall–rises hedge. A fall says the utterance is complete and
        yours to accept; a rise hands the turn to the listener; a fall–rise says “…but”.
      </p>
      <p>
        <button className="ghost-btn" onClick={() => playContour([5, 1], cal)}>
          ▶ closing fall
        </button>{' '}
        <button className="ghost-btn" onClick={() => playContour([1, 5], cal)}>
          ▶ opening rise
        </button>{' '}
        <button className="ghost-btn" onClick={() => playContour([5, 1, 5], cal)}>
          ▶ hedging fall–rise
        </button>
      </p>

      <h4>2. Stress — where the meaning lands</h4>
      <p>
        Moving the stressed word re-aims the whole sentence. Click a word in{' '}
        <em>“I never said she stole it”</em> to see what stressing it implies:
      </p>
      <div className="stress-widget">
        <div className="variation-chips">
          {STRESS_WORDS.map((s, i) => (
            <button
              key={s.word}
              className={`chip ${stressIdx === i ? 'active' : ''}`}
              onClick={() => setStressIdx(i)}
            >
              {s.word}
            </button>
          ))}
        </div>
        <p className="stress-implication">
          {stressIdx === null ? (
            <span className="muted">— six words, six different accusations —</span>
          ) : (
            <>
              “I never said she stole it” <strong>{STRESS_WORDS[stressIdx].implication}</strong>
            </>
          )}
        </p>
      </div>
      <p>
        In the exercises, stress is marked with <strong>CAPS</strong> (<code>Let it **GO**</code>);
        in ToBI it's where the starred tone attaches.
      </p>

      <h4>3. Breaks — grouping is meaning</h4>
      <p>
        Pauses parcel words into thought-units, and regrouping changes the thought —{' '}
        <em>“Let's eat, Grandma”</em> versus <em>“Let's eat Grandma”</em>. The exercises mark
        three grades: <code>,</code> a slight hesitation, <code>/</code> a minor break,{' '}
        <code>//</code> a full stop of breath. A pause before a word also spotlights it: “I
        need it… <em>now</em>.”
      </p>

      <h4>4. Color — everything that isn't pitch</h4>
      <p>
        Tempo, breathiness, tension, the smile you can hear. The exercises' performance notes
        (“breathy tone, slow fall”, “clipped tempo”, “smiling resonance”) live on this lever.
        The analyzer can't score it yet — but your recordings capture it, so listen back.
      </p>

      <h3>A field guide: intention → melody</h3>
      <p>
        Six recurring intention families and their signature melodies. These are the shapes
        you'll meet over and over in the 2,500 exercises.
      </p>
      <div className="demo-grid">
        {INTENTION_MAP.map((m) => (
          <ContourDemo key={m.title} {...m} calibration={calibration} />
        ))}
      </div>

      <h3>Subtext: when melody and words disagree</h3>
      <p>
        Sincerity is alignment — positive words on a settling fall. Irony is deliberate
        mismatch: positive words on a fall–rise, and the melody wins. Every listener trusts
        the tone over the text. That's why the same “yeah, great” can be praise{' '}
        <button className="ghost-btn" onClick={() => playContour([4, 2], cal)}>
          ▶ sincere
        </button>{' '}
        or an eye-roll{' '}
        <button className="ghost-btn" onClick={() => playContour([5, 1, 5], cal)}>
          ▶ sarcastic
        </button>
        .
      </p>

      <h3>Where to go from here</h3>
      <p>
        If the symbols above are new, start with the notation courses. If you can read them,
        go straight to the exercises: every one gives you a sentence, three intentions, and a
        microphone.
      </p>
      <div className="intro-actions">
        <button className="ghost-btn" onClick={() => onNavigate('learn')}>
          ← Introduction to vocal tones
        </button>
        <button className="record-btn" onClick={() => onNavigate('practice')}>
          Practice vocal intentions →
        </button>
      </div>
    </div>
  );
}
