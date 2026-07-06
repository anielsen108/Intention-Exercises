import { useMemo } from 'react';
import type { Calibration } from '../../analysis/calibration';
import { playContour } from '../../audio/synth';
import { TONE_LETTERS } from '../../content/tones';
import { ContourDemo } from './ContourDemo';
import { ContourGraph } from './ContourGraph';
import { makeQuizChoices } from './helpers';
import { Quiz, type QuizQuestion } from './Quiz';
import { TryContour } from './TryContour';

interface Props {
  calibration: Calibration | null;
  onRequestCalibration: () => void;
}

const LEVEL_INFO = [
  { level: 1, name: 'Extra low', hint: 'the floor of your range — resignation, gravity' },
  { level: 2, name: 'Low', hint: 'relaxed low voice — calm statements' },
  { level: 3, name: 'Mid', hint: 'your neutral speaking pitch' },
  { level: 4, name: 'High', hint: 'raised pitch — interest, energy' },
  { level: 5, name: 'Extra high', hint: 'the top of your range — excitement, appeal' },
];

const CONTOURS = [
  {
    levels: [5, 1],
    title: 'High fall',
    description: 'Finality, certainty, commands. The workhorse of firm statements: “Stop.”',
  },
  {
    levels: [1, 5],
    title: 'Low rise',
    description: 'Questions, invitations, politeness. Open-ended, hands the turn over: “Really?”',
  },
  {
    levels: [2, 4],
    title: 'Mid rise',
    description: 'Continuation, listing, mild uncertainty. Signals “I’m not done yet.”',
  },
  {
    levels: [1, 5, 1],
    title: 'Rise–fall',
    description: 'Emphasis, contrast, correction. Peaks and resolves: “WOW.”',
  },
  {
    levels: [5, 1, 5],
    title: 'Fall–rise',
    description: 'Reservation, implicature, irony. Says one thing, means “…but”.',
  },
  {
    levels: [1, 3, 5],
    title: 'Complex rise',
    description: 'Urgency, pleading, excitement — a rise that keeps climbing.',
  },
  {
    levels: [5, 5],
    title: 'Level high',
    description: 'Suspension, non-finality. Held high, waiting to resolve.',
  },
  {
    levels: [1, 1],
    title: 'Level low',
    description: 'Flatness, resignation, boredom. No melody on purpose.',
  },
];

const QUIZ_POOL = ['˥˩', '˩˥', '˩˧˥', '˥˩˥', '˩˥˩', '˨˦', '˥˥', '˩˩'];
const QUIZ_ITEMS: { levels: number[]; answer: string; explain: string }[] = [
  { levels: [5, 1], answer: '˥˩', explain: 'A straight drop from the top: high fall.' },
  { levels: [1, 5], answer: '˩˥', explain: 'Bottom to top in one move: low rise.' },
  { levels: [1, 5, 1], answer: '˩˥˩', explain: 'Up then down again: rise–fall.' },
  { levels: [5, 1, 5], answer: '˥˩˥', explain: 'Down then back up: fall–rise.' },
  { levels: [1, 3, 5], answer: '˩˧˥', explain: 'Three stations upward: complex rise.' },
];

export function LearnIpa({ calibration, onRequestCalibration }: Props) {
  const questions: QuizQuestion[] = useMemo(
    () =>
      QUIZ_ITEMS.map((item) => ({
        prompt: (
          <>
            <p>Which notation matches this contour?</p>
            <ContourGraph levels={item.levels} />
          </>
        ),
        choices: makeQuizChoices(item.answer, QUIZ_POOL, 4),
        answer: item.answer,
        explain: item.explain,
      })),
    [],
  );

  return (
    <div className="learn-track">
      <h2>IPA tone letters</h2>
      <p>
        The tone letters <span className="tone-letters">˥ ˦ ˧ ˨ ˩</span> (invented by the
        linguist Yuen Ren Chao) draw pitch directly: each letter is a level on a five-step
        staff, read left to right. A sequence like{' '}
        <span className="tone-letters">˥˩</span> fuses into a single falling stroke — the
        notation <em>is</em> the melody. Crucially, the five levels are relative to{' '}
        <strong>your</strong> voice, not to absolute notes; that's what calibration sets up.
      </p>

      <h3>The five levels</h3>
      <p>Tap ▶ on each card to hear the level in your calibrated range.</p>
      <div className="demo-grid">
        {LEVEL_INFO.map((info) => (
          <ContourDemo
            key={info.level}
            levels={[info.level, info.level]}
            symbol={TONE_LETTERS[info.level - 1]}
            title={`${info.name} (${info.level})`}
            description={info.hint}
            calibration={calibration}
          />
        ))}
      </div>

      <h3>Contours</h3>
      <p>
        Real speech moves. Combining levels gives contour tones — these eight cover nearly
        everything in the exercises. Listen to each, then hum along with it.
      </p>
      <div className="demo-grid">
        {CONTOURS.map((c) => (
          <ContourDemo key={c.title} {...c} calibration={calibration} />
        ))}
      </div>

      <h3>Reading the exercise notation</h3>
      <p>
        Each exercise marks its <strong>nuclear syllable</strong> — the one carrying the
        pitch action — in brackets, with the tone letters attached directly:
      </p>
      <p className="notation-example">
        <strong>Firm command</strong> — I said [stop<span className="tone-letters">˥˩</span>].
      </p>
      <ul>
        <li>
          <code>[stop˥˩]</code> — say “stop” with a high fall. Everything outside the
          brackets stays close to your neutral mid.
        </li>
        <li>
          The trailing legend <code>[˥ ˩ =&gt; ˥˩]</code> in the source files just shows the
          spaced and fused forms of the same contour — some fonts ligate them, some don't.
          This site's font always fuses them.
        </li>
        <li>
          Brackets can split a word — <code>be[lieve˥˩]</code> means the fall lands on the
          stressed syllable “-lieve”.
        </li>
        <li>
          Multi-clause exercises carry one marked nucleus per clause:{' '}
          <code>Ask [now˩˧˥], but finish [then˥˩].</code>
        </li>
      </ul>
      <p>
        <button className="ghost-btn" onClick={() => playContour([1, 3, 5], calibration ?? undefined)}>
          ▶ [now˩˧˥]
        </button>{' '}
        <button className="ghost-btn" onClick={() => playContour([5, 1], calibration ?? undefined)}>
          ▶ [then˥˩]
        </button>
      </p>

      <h3>Try it</h3>
      <p>
        Hum first, words second — the analyzer only listens to pitch. A score of 70+ passes.
      </p>
      <TryContour
        target={[5, 1]}
        prompt="Say “no” as a firm, final command — one clean fall:"
        calibration={calibration}
        onRequestCalibration={onRequestCalibration}
      />
      <TryContour
        target={[1, 4]}
        prompt="Say “really?” as a genuine question — rise from low:"
        calibration={calibration}
        onRequestCalibration={onRequestCalibration}
      />
      <TryContour
        target={[1, 5, 1]}
        prompt="Say “wow” with big emphasis — up and over the top:"
        calibration={calibration}
        onRequestCalibration={onRequestCalibration}
      />
      <TryContour
        target={[3, 3]}
        prompt="Say “fine” totally flat — dead-level resignation:"
        calibration={calibration}
        onRequestCalibration={onRequestCalibration}
      />

      <h3>Check yourself</h3>
      <Quiz title="Name that contour" questions={questions} />
    </div>
  );
}
