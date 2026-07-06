import { useState, type ReactNode } from 'react';

export interface QuizQuestion {
  prompt: ReactNode;
  choices: string[];
  answer: string;
  /** Shown after answering. */
  explain?: string;
}

/** Multiple-choice quiz with per-question feedback and a final tally. */
export function Quiz({ title, questions }: { title: string; questions: QuizQuestion[] }) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  const q = questions[idx];

  function pick(choice: string) {
    if (picked !== null) return;
    setPicked(choice);
    if (choice === q.answer) setCorrect((c) => c + 1);
  }

  function next() {
    if (idx + 1 >= questions.length) {
      setDone(true);
    } else {
      setIdx(idx + 1);
      setPicked(null);
    }
  }

  function restart() {
    setIdx(0);
    setPicked(null);
    setCorrect(0);
    setDone(false);
  }

  if (done) {
    return (
      <div className="quiz-card">
        <h4>{title}</h4>
        <p className="quiz-tally">
          {correct} / {questions.length} correct
          {correct === questions.length ? ' — perfect!' : ''}
        </p>
        <button className="ghost-btn" onClick={restart}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="quiz-card">
      <h4>
        {title}{' '}
        <span className="quiz-progress">
          {idx + 1}/{questions.length}
        </span>
      </h4>
      <div className="quiz-prompt">{q.prompt}</div>
      <div className="quiz-choices">
        {q.choices.map((choice) => {
          let cls = 'quiz-choice';
          if (picked !== null) {
            if (choice === q.answer) cls += ' right';
            else if (choice === picked) cls += ' wrong';
          }
          return (
            <button key={choice} className={cls} onClick={() => pick(choice)}>
              {choice}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="quiz-feedback">
          <p>
            {picked === q.answer ? 'Correct.' : `Not quite — it's ${q.answer}.`}{' '}
            {q.explain ?? ''}
          </p>
          <button className="ghost-btn" onClick={next}>
            {idx + 1 >= questions.length ? 'Finish' : 'Next'}
          </button>
        </div>
      )}
    </div>
  );
}
