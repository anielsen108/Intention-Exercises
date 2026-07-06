import { useMemo } from 'react';
import type { Calibration } from '../../analysis/calibration';
import { ContourDemo } from './ContourDemo';
import { contourForPattern, makeQuizChoices } from './helpers';
import { Quiz, type QuizQuestion } from './Quiz';
import { TryContour } from './TryContour';

interface Props {
  calibration: Calibration | null;
  onRequestCalibration: () => void;
}

const ACCENTS = [
  {
    symbol: 'H*',
    levels: [3, 4, 4, 3],
    title: 'High pitch accent',
    description:
      'The stressed syllable sits on a high tone. The default “this word matters” accent of plain statements.',
  },
  {
    symbol: 'L*',
    levels: [3, 2, 2, 3],
    title: 'Low pitch accent',
    description:
      'Prominence on a low tone — common in yes/no questions and understatement, where the rise comes later.',
  },
  {
    symbol: 'L+H*',
    levels: [2, 2, 5, 4],
    title: 'Rising (scooped) accent',
    description:
      'A rise from low up onto the stressed syllable. Signals contrast or correction: “I said BLUE.”',
  },
  {
    symbol: 'H+L*',
    levels: [5, 4, 2, 2],
    title: 'Falling accent',
    description:
      'A fall from high onto an accented low — a downward step that lands with weight.',
  },
  {
    symbol: '!H*',
    levels: [4, 3, 3, 3],
    title: 'Downstepped high',
    description:
      'High, but stepped down from the previous peak. Chains of !H* give that “ticking off a list” terracing.',
  },
];

const BOUNDARIES = [
  {
    symbol: 'L-L%',
    levels: [3, 2, 1],
    title: 'Low phrase + low boundary',
    description: 'The full stop of intonation: a fall to the bottom. Finality, completion.',
  },
  {
    symbol: 'L-H%',
    levels: [3, 1, 3],
    title: 'Low phrase + high boundary',
    description:
      'Fall then a small rise: “…but”, reservation, continuation. The sound of an unfinished thought.',
  },
  {
    symbol: 'H-H%',
    levels: [3, 4, 5],
    title: 'High phrase + high boundary',
    description: 'A strong terminal rise — the classic yes/no question, appeal, disbelief.',
  },
  {
    symbol: 'H-L%',
    levels: [4, 4, 4],
    title: 'High phrase + low boundary',
    description:
      'A held high plateau that levels off — expectancy, “more coming”, the calling contour.',
  },
];

const TUNES = [
  {
    tokens: ['H*', 'L-L%'],
    title: 'Declarative fall',
    description: '“It’s done.” — accent high, drop to the floor. Settled fact.',
  },
  {
    tokens: ['L*', 'H-H%'],
    title: 'Yes/no question',
    description: '“You’re coming?” — low accent, then a big terminal rise.',
  },
  {
    tokens: ['L+H*', 'L-H%'],
    title: 'Contradiction / implication',
    description: '“It’s fine…” — scooped emphasis, fall, and an unresolved little rise.',
  },
  {
    tokens: ['H*', 'H-L%'],
    title: 'Continuation plateau',
    description: '“First we pack, …” — high and held; the list isn’t over.',
  },
];

const ACCENT_POOL = ['H*', 'L*', 'L+H*', 'H+L*', '!H*'];
const BOUNDARY_POOL = ['L-L%', 'L-H%', 'H-H%', 'H-L%'];

const QUIZ_ITEMS: { q: string; answer: string; pool: string[]; explain: string }[] = [
  {
    q: 'The stressed syllable is prominent on a high tone — plain emphasis in a statement.',
    answer: 'H*',
    pool: ACCENT_POOL,
    explain: 'The asterisk means “aligned with the stressed syllable”; H puts it high.',
  },
  {
    q: 'A rise from low up onto the stressed syllable — contrast or correction.',
    answer: 'L+H*',
    pool: ACCENT_POOL,
    explain: 'The L leads in from below, the starred H lands on the stress.',
  },
  {
    q: 'The utterance falls all the way to the bottom and stops — a finished statement.',
    answer: 'L-L%',
    pool: BOUNDARY_POOL,
    explain: 'Low phrase accent plus low boundary tone: the intonational full stop.',
  },
  {
    q: 'A strong rise at the very end — a yes/no question.',
    answer: 'H-H%',
    pool: BOUNDARY_POOL,
    explain: 'High phrase accent plus high boundary: everything points up.',
  },
  {
    q: 'A fall followed by a small final rise — “…but”, a thought left hanging.',
    answer: 'L-H%',
    pool: BOUNDARY_POOL,
    explain: 'The fall-rise combination reads as reservation or continuation.',
  },
];

export function LearnTobi({ calibration, onRequestCalibration }: Props) {
  const questions: QuizQuestion[] = useMemo(
    () =>
      QUIZ_ITEMS.map((item) => ({
        prompt: <p>{item.q}</p>,
        choices: makeQuizChoices(item.answer, item.pool, 4),
        answer: item.answer,
        explain: item.explain,
      })),
    [],
  );

  return (
    <div className="learn-track">
      <h2>ToBI — Tones and Break Indices</h2>
      <p>
        Where IPA tone letters draw the pitch you hear, <strong>ToBI</strong> names the
        phonological <em>categories</em> behind it. English intonation is analyzed as a
        string of just two tones — H(igh) and L(ow) — attached at three kinds of places:{' '}
        <strong>pitch accents</strong> on stressed syllables (marked <code>*</code>),{' '}
        <strong>phrase accents</strong> after the last accent (<code>H-</code>/<code>L-</code>),
        and <strong>boundary tones</strong> at the edge (<code>H%</code>/<code>L%</code>).
        Break indices 1–4 rate how strong each word boundary is. The demos below are
        stylized sketches so you can hear each category — real realizations vary.
      </p>

      <h3>Pitch accents — what happens on the stressed syllable</h3>
      <div className="demo-grid">
        {ACCENTS.map((a) => (
          <ContourDemo
            key={a.symbol}
            levels={a.levels}
            symbol={a.symbol}
            mono
            title={a.title}
            description={a.description}
            calibration={calibration}
          />
        ))}
      </div>

      <h3>Phrase accents & boundary tones — how the phrase ends</h3>
      <div className="demo-grid">
        {BOUNDARIES.map((b) => (
          <ContourDemo
            key={b.symbol}
            levels={b.levels}
            symbol={b.symbol}
            mono
            title={b.title}
            description={b.description}
            calibration={calibration}
          />
        ))}
      </div>

      <h3>Break indices & the exercise notation</h3>
      <ul>
        <li>
          <strong>Break indices</strong> rate boundary strength 1–4. In the exercises they
          appear as punctuation: <code>,</code> = slight hesitation (BI 2), <code>/</code> =
          minor break (BI 3), <code>//</code> = major break (BI 4).
        </li>
        <li>
          <strong>CAPS</strong> mark the primary stress (<code>Let it **GO**</code>) — that's
          the syllable the starred tone attaches to.
        </li>
        <li>
          A ToBI line like <code>H* L* L-L%</code> reads left to right through the sentence:
          accents in order, then how the phrase ends.
        </li>
      </ul>

      <h3>Putting it together — four classic tunes</h3>
      <div className="demo-grid">
        {TUNES.map((t) => (
          <ContourDemo
            key={t.title}
            levels={contourForPattern(t.tokens)}
            symbol={t.tokens.join(' ')}
            mono
            title={t.title}
            description={t.description}
            calibration={calibration}
          />
        ))}
      </div>

      <h3>Try it</h3>
      <p>
        Produce each tune; the analyzer scores your pitch shape against the sketch (70+
        passes).
      </p>
      <TryContour
        target={contourForPattern(['H*', 'L-L%'])}
        prompt="Say “it's done” as a settled statement (H* L-L%):"
        calibration={calibration}
        onRequestCalibration={onRequestCalibration}
      />
      <TryContour
        target={contourForPattern(['L*', 'H-H%'])}
        prompt="Say “you're coming?” as a yes/no question (L* H-H%):"
        calibration={calibration}
        onRequestCalibration={onRequestCalibration}
      />
      <TryContour
        target={contourForPattern(['L+H*', 'L-H%'])}
        prompt="Say “it's fine…” so nobody believes you (L+H* L-H%):"
        calibration={calibration}
        onRequestCalibration={onRequestCalibration}
      />

      <h3>Check yourself</h3>
      <Quiz title="Match the description to the symbol" questions={questions} />

      <p className="learn-footnote">
        Note: this site's live ToBI readout is heuristic — boundary tones and breaks from
        pitch and pauses are fairly reliable, but accent labels without word timing are
        approximate. Treat them as a study aid, not ground truth.
      </p>
    </div>
  );
}
