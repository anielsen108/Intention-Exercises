import { useEffect, useMemo, useState } from 'react';
import type { Calibration } from './analysis/calibration';
import type { Approach, Exercise } from './content/types';
import { SESSIONS, practiceKey, sessionSteps } from './content/sessions';
import { useCollections, useExercises } from './hooks/useContent';
import { isStringArray, readStored, writeStored } from './hooks/storage';
import { CalibrationModal } from './ui/Calibration';
import { loadCalibration, saveCalibration } from './analysis/savedCalibration';
import { HowTones } from './ui/learn/HowTones';
import { LearnView } from './ui/learn/LearnView';
import { PracticeView } from './ui/PracticeView';
import { ContourPlayer } from './ui/ContourPlayer';
import { EarTraining } from './ui/EarTraining';
import { stopContour } from './audio/synth';
import './App.css';

const EXAMPLE = [
  {
    label: 'Make it settled',
    levels: [4, 1],
    cue: 'A fall gives this version a definite ending.',
  },
  {
    label: 'Ask a question',
    levels: [2, 5],
    cue: 'A rise turns this version toward an answer.',
  },
  {
    label: 'Leave a reservation',
    levels: [4, 1, 3],
    cue: 'A fall–rise leaves something unsaid.',
  },
];
const PROGRESS_KEY = 'vi.practice.v2';
const ROUTES = ['studio', 'library', 'how', 'notation'];
function readRoute() {
  const value = window.location.hash.slice(1);
  return ROUTES.includes(value) ? value : 'studio';
}
function collectionLabel(slug: string) {
  return slug
    .replace(/^\d+(-\d+)?-/, '')
    .replace(/^SUPPLEMENT-/, 'Supplement · ')
    .replace(/-/g, ' ')
    .replace(/^ADVANCED/, 'Advanced');
}

export default function App() {
  const [view, setView] = useState(readRoute);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [example, setExample] = useState(0);
  const [completed, setCompleted] = useState(() =>
    readStored(PROGRESS_KEY, [], isStringArray),
  );
  const [storageOK, setStorageOK] = useState(true);
  const [calibration, setCalibration] = useState<Calibration | null>(
    loadCalibration,
  );
  const [calibrating, setCalibrating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [approach, setApproach] = useState<Approach>('ipa');
  const [slug, setSlug] = useState('01-general-exercises');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const collections = useCollections();
  const exercises = useExercises(approach, view === 'library' ? slug : null);
  const available = collections?.filter((c) => c.approach === approach) ?? [];
  const visible = useMemo(
    () =>
      exercises?.filter((ex) => {
        const q = query.trim().toLowerCase();
        return (
          !q ||
          ex.text.toLowerCase().includes(q) ||
          ex.variations.some((v) => v.intention.toLowerCase().includes(q))
        );
      }) ?? [],
    [exercises, query],
  );
  const selected =
    exercises?.find((ex) => ex.id === selectedId) ?? visible[0] ?? null;
  const session = SESSIONS.find((s) => s.id === sessionId);
  const steps = session ? sessionSteps(session) : [];
  const step = steps[stepIndex];
  const exercise =
    session && step ? session.exercises[step.exerciseIndex] : null;
  const completedCount = SESSIONS.flatMap((s) => sessionSteps(s)).filter((s) =>
    completed.includes(s.key),
  ).length;
  const libraryCount = collections?.reduce(
    (sum, c) => sum + c.exerciseCount,
    0,
  );

  useEffect(() => {
    function change() {
      stopContour();
      setView(readRoute());
      setBusy(false);
    }
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }, [view, sessionId, stepIndex, sessionFinished, selectedId]);
  useEffect(() => {
    document.title = `${view === 'library' ? 'Exercise library' : view === 'how' ? 'How intention works' : view === 'notation' ? 'Pitch notation' : session ? session.title : 'Practice studio'} · Vocal Intentions`;
  }, [view, session]);

  function startSession(id: string, restart = false) {
    const value = SESSIONS.find((s) => s.id === id)!;
    const first = sessionSteps(value).findIndex(
      (s) => !completed.includes(s.key),
    );
    setStepIndex(restart || first < 0 ? 0 : first);
    setSessionId(id);
    setSessionFinished(false);
    stopContour();
    window.location.hash = 'studio';
  }
  function mark(ex: Exercise, variation: number) {
    const next = [...new Set([...completed, practiceKey(ex, variation)])];
    setCompleted(next);
    setStorageOK(writeStored(PROGRESS_KEY, next));
  }
  function finishStep(variation: number) {
    if (!exercise || !session) return;
    mark(exercise, variation);
    const current = steps.findIndex(
      (s) =>
        s.exerciseIndex === step.exerciseIndex &&
        s.variationIndex === variation,
    );
    if (current + 1 >= steps.length) setSessionFinished(true);
    else setStepIndex(current + 1);
  }
  const navigate = (target: string) => {
    window.location.hash = target;
  };

  return (
    <div className="app">
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="topbar">
        <a
          className="brand"
          href="#studio"
          onClick={() => {
            setSessionId(null);
            stopContour();
          }}
          aria-label="Vocal Intentions home"
        >
          <svg viewBox="0 0 36 36" aria-hidden="true">
            <path d="M4 19h4l4-10 7 20 6-24 5 14h3" />
          </svg>
          <span>
            Vocal Intentions
            <span className="brand-subtitle">
              A PRACTICE STUDIO FOR YOUR VOICE
            </span>
          </span>
        </a>
        <nav className="view-nav" aria-label="Main navigation">
          {[
            { id: 'studio', label: 'Studio' },
            { id: 'library', label: 'Exercise library' },
            { id: 'how', label: 'How it works' },
            { id: 'notation', label: 'Notation' },
          ].map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              aria-current={view === item.id ? 'page' : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <button
          className="range-button"
          disabled={busy}
          onClick={() => setCalibrating(true)}
        >
          <span className={calibration ? 'range-dot set' : 'range-dot'} />
          {calibration ? 'Voice range set' : 'Voice range'}
        </button>
      </header>
      <main id="main-content" tabIndex={-1}>
        {view === 'studio' && !session && (
          <div className="studio-home">
            <section className="hero">
              <div className="hero-copy">
                <div className="eyebrow">
                  <span className="tiny-line" /> SPEAK WITH INTENTION
                </div>
                <h1>
                  Same words.
                  <br />A different <em>intention.</em>
                </h1>
                <p>
                  Practice how your voice changes what people hear. Listen, try
                  a delivery, and make the next take more deliberate.
                </p>
                <div className="hero-actions">
                  <button
                    className="primary-button"
                    onClick={() =>
                      startSession(
                        (
                          SESSIONS.find((s) =>
                            sessionSteps(s).some(
                              (step) => !completed.includes(step.key),
                            ),
                          ) ?? SESSIONS[0]
                        ).id,
                      )
                    }
                  >
                    {completedCount
                      ? 'Continue practicing'
                      : 'Start your first session'}{' '}
                    <span aria-hidden="true">↗</span>
                  </button>
                  <a href="#how" className="text-button">
                    See how it works →
                  </a>
                </div>
                <div className="hero-footnote">
                  <span>5–8 minutes a session</span>
                  <span>No notation needed</span>
                  <span>Practice at your own pace</span>
                </div>
              </div>
              <div className="hero-demo">
                <div className="section-label">
                  <span>ONE LINE, THREE DELIVERIES</span>
                  <span className="demo-live-dot">●</span>
                </div>
                <div className="demo-quote">“You’re coming.”</div>
                <div
                  className="demo-intentions"
                  aria-label="Try a different ending"
                >
                  {EXAMPLE.map((item, i) => (
                    <button
                      key={item.label}
                      aria-pressed={i === example}
                      className={i === example ? 'active' : ''}
                      onClick={() => setExample(i)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <ContourPlayer
                  key={example}
                  levels={EXAMPLE[example].levels}
                  calibration={calibration}
                  compact
                />
                <p className="demo-cue" aria-live="polite">
                  {EXAMPLE[example].cue}
                </p>
                <div className="demo-footer">
                  Listen to the hum. Then try the line yourself.
                </div>
              </div>
            </section>
            <section className="session-section">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">SHORT SESSIONS. CLEAR FOCUS.</div>
                  <h2>What do you want to work on?</h2>
                </div>
                <span className="progress-caption">
                  {completedCount
                    ? `${completedCount} of 24 deliveries practiced`
                    : 'Start with session 01'}
                </span>
              </div>
              <div className="session-grid">
                {SESSIONS.map((item, i) => {
                  const count = sessionSteps(item).filter((s) =>
                    completed.includes(s.key),
                  ).length;
                  return (
                    <button
                      className="session-card"
                      key={item.id}
                      onClick={() => startSession(item.id)}
                    >
                      <div className="session-card-top">
                        <span className="session-number">0{i + 1}</span>
                        <span className="session-skill">{item.skill}</span>
                      </div>
                      <svg viewBox="0 0 240 56" aria-hidden="true">
                        <path
                          d={
                            [
                              'M4 46 Q50 40 95 8 M125 8 Q177 20 234 46',
                              'M4 24 Q52 26 100 36 M126 5 Q178 26 234 51',
                              'M4 7 Q75 77 136 26 T234 24',
                              'M4 35 Q36 35 57 14 T113 27 T174 13 T234 35',
                            ][i]
                          }
                        />
                      </svg>
                      <div className="eyebrow">{item.subtitle}</div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                      <div className="session-card-bottom">
                        <span>
                          {count
                            ? `${count} / 6 practiced`
                            : '3 lines · 6 deliveries'}
                        </span>
                        <span aria-hidden="true">↗</span>
                      </div>
                      {count > 0 && (
                        <progress
                          value={count}
                          max={6}
                          aria-label={`${item.title}: ${count} of 6 practiced`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
            <EarTraining calibration={calibration} />
            <section className="library-banner">
              <div>
                <span className="eyebrow">GO FURTHER</span>
                <h2>A whole library of ways to say it.</h2>
                <p>
                  Explore {libraryCount?.toLocaleString() ?? 'the'} exercise
                  entries in IPA and ToBI, from short phrases to layered scenes.
                </p>
              </div>
              <a className="outline-button" href="#library">
                Explore the library ↗
              </a>
            </section>
            {completedCount > 0 && (
              <p className="storage-note">
                Practice progress is saved in this browser.{' '}
                <button
                  className="text-button"
                  onClick={() => {
                    setCompleted([]);
                    setStorageOK(writeStored(PROGRESS_KEY, []));
                  }}
                >
                  Reset practice progress
                </button>
              </p>
            )}
          </div>
        )}
        {view === 'studio' && session && (
          <div className="session-workspace">
            <div className="workspace-top">
              <button
                className="text-button"
                onClick={() => {
                  setSessionId(null);
                  stopContour();
                }}
              >
                ← All sessions
              </button>
              <span>
                {session.subtitle} · Session {SESSIONS.indexOf(session) + 1} of
                4
              </span>
            </div>
            {sessionFinished ? (
              <section className="session-finish">
                <span className="finish-mark" aria-hidden="true">
                  ✓
                </span>
                <div className="eyebrow">SESSION REVIEW</div>
                <h1>You’ve explored {session.skill.toLowerCase()}.</h1>
                <p>
                  {steps.filter((s) => completed.includes(s.key)).length} of 6
                  deliveries marked practiced. Try one of these lines in a real
                  conversation and notice how the other person responds.
                </p>
                <div className="finish-list">
                  {session.exercises.map((ex) => (
                    <div key={ex.id}>
                      <b>“{ex.text}”</b>
                      <span>
                        {ex.variations.map((v) => v.intention).join(' / ')}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="hero-actions">
                  <button
                    className="primary-button"
                    onClick={() => {
                      const index = SESSIONS.indexOf(session);
                      if (index + 1 < SESSIONS.length)
                        startSession(SESSIONS[index + 1].id);
                      else setSessionId(null);
                    }}
                  >
                    {SESSIONS.indexOf(session) + 1 < SESSIONS.length
                      ? 'Try the next session'
                      : 'Back to the studio'}{' '}
                    →
                  </button>
                  <button
                    className="text-button"
                    onClick={() => startSession(session.id, true)}
                  >
                    Repeat this session
                  </button>
                </div>
                <p className="microcopy">
                  “Practiced” records your reflection. It is not a measure of
                  mastery.
                </p>
              </section>
            ) : (
              <>
                <div className="session-heading">
                  <div>
                    <span className="eyebrow">GUIDED PRACTICE</span>
                    <h1>{session.title}</h1>
                  </div>
                  <div className="session-progress">
                    <span>
                      Delivery {stepIndex + 1} of {steps.length}
                    </span>
                    <div className="step-dots">
                      {steps.map((s, i) => (
                        <button
                          key={s.key}
                          disabled={busy}
                          className={`${i === stepIndex ? 'current' : ''} ${completed.includes(s.key) ? 'done' : ''}`}
                          aria-label={`Go to delivery ${i + 1}`}
                          aria-current={i === stepIndex ? 'step' : undefined}
                          onClick={() => setStepIndex(i)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {exercise && (
                  <PracticeView
                    key={`${exercise.id}/${stepIndex}`}
                    exercise={exercise}
                    calibration={calibration}
                    initialVariation={step.variationIndex}
                    onVariationChange={(i) =>
                      setStepIndex(
                        steps.findIndex(
                          (s) =>
                            s.exerciseIndex === step.exerciseIndex &&
                            s.variationIndex === i,
                        ),
                      )
                    }
                    completed={completed}
                    onComplete={finishStep}
                    onBusy={setBusy}
                    onRequestCalibration={() => setCalibrating(true)}
                    nextLabel={
                      stepIndex === steps.length - 1
                        ? 'Finish & review session'
                        : 'Continue to the next line'
                    }
                  />
                )}
              </>
            )}
          </div>
        )}
        {view === 'library' && (
          <div className="library-workspace">
            <div className="section-heading">
              <div>
                <span className="eyebrow">EXPLORE AT YOUR OWN PACE</span>
                <h1>Exercise library</h1>
              </div>
              <button
                className="outline-button"
                onClick={() => setLibraryOpen(!libraryOpen)}
                aria-expanded={libraryOpen}
              >
                {libraryOpen ? 'Focus on this exercise' : 'Browse exercises'}
              </button>
            </div>
            <div className={`library-layout ${libraryOpen ? 'browsing' : ''}`}>
              {libraryOpen && (
                <aside className="library-browser">
                  <label htmlFor="approach">Notation collection</label>
                  <select
                    id="approach"
                    value={approach}
                    onChange={(e) => {
                      setApproach(e.target.value as Approach);
                      setSlug('01-general-exercises');
                      setSelectedId(null);
                      setQuery('');
                    }}
                  >
                    <option value="ipa">IPA · pitch levels</option>
                    <option value="tobi">ToBI · intonation patterns</option>
                  </select>
                  <label htmlFor="collection">Collection</label>
                  <select
                    id="collection"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value);
                      setSelectedId(null);
                      setQuery('');
                    }}
                  >
                    {available.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {collectionLabel(c.slug)} ({c.exerciseCount})
                      </option>
                    ))}
                  </select>
                  <label htmlFor="exercise-search">
                    Find a line or intention
                  </label>
                  <input
                    id="exercise-search"
                    type="search"
                    placeholder="Try “curiosity” or “ready”…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <div className="library-count" role="status">
                    {exercises === null
                      ? 'Loading exercises…'
                      : `${visible.length} matching entries`}
                  </div>
                  {collections?.length === 0 && (
                    <p role="alert">
                      The collection list couldn’t load.{' '}
                      <button onClick={() => window.location.reload()}>
                        Reload
                      </button>
                    </p>
                  )}
                  <ul>
                    {visible.map((ex) => (
                      <li key={ex.id}>
                        <button
                          aria-pressed={ex.id === selected?.id}
                          className={ex.id === selected?.id ? 'active' : ''}
                          onClick={() => {
                            setSelectedId(ex.id);
                            if (window.innerWidth < 800) setLibraryOpen(false);
                          }}
                        >
                          <span className="exercise-number">{ex.number}</span>
                          <span>
                            {ex.text}
                            <small>
                              {ex.variations
                                .map((v) => v.intention)
                                .join(' · ')}
                            </small>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {exercises !== null && !visible.length && (
                    <div className="empty-state">
                      <p>
                        {query
                          ? 'No lines match that search in this collection.'
                          : 'This collection couldn’t be loaded or has no entries.'}
                      </p>
                      <button
                        className="text-button"
                        onClick={() => {
                          setQuery('');
                          if (!query) window.location.reload();
                        }}
                      >
                        {query ? 'Clear search' : 'Reload the library'}
                      </button>
                    </div>
                  )}
                </aside>
              )}
              <div className="library-practice">
                {selected ? (
                  <PracticeView
                    key={selected.id}
                    exercise={selected}
                    calibration={calibration}
                    completed={completed}
                    onBusy={setBusy}
                    onRequestCalibration={() => setCalibrating(true)}
                    onComplete={(variation) => {
                      mark(selected, variation);
                      if (variation === selected.variations.length - 1) {
                        const i = visible.findIndex(
                          (ex) => ex.id === selected.id,
                        );
                        if (i >= 0 && i + 1 < visible.length)
                          setSelectedId(visible[i + 1].id);
                      }
                    }}
                    nextLabel={
                      visible.at(-1)?.id === selected.id
                        ? 'Mark this delivery practiced'
                        : 'Practice the next exercise'
                    }
                  />
                ) : (
                  <div className="empty-state">
                    <h2>
                      {exercises === null
                        ? 'Loading the library…'
                        : 'Choose an exercise to begin.'}
                    </h2>
                    <p>
                      Search within a collection or switch the notation
                      collection above.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {view === 'how' && (
          <HowTones
            calibration={calibration}
            onNavigate={(target) =>
              navigate(target === 'learn' ? 'notation' : 'studio')
            }
          />
        )}
        {view === 'notation' && (
          <LearnView
            calibration={calibration}
            onRequestCalibration={() => setCalibrating(true)}
          />
        )}
        {!storageOK && (
          <p role="status" className="storage-note">
            Browser storage is unavailable. Your progress will last for this
            visit.
          </p>
        )}
      </main>
      <footer className="site-footer">
        <span>
          Vocal Intentions <span className="footer-divider">/</span> Find the
          intention. Make it heard.
        </span>
        <div>
          <a href="#how">About the practice</a>
          <a
            href="https://github.com/anielsen108/Intention-Exercises"
            target="_blank"
            rel="noreferrer"
          >
            Source ↗
          </a>
        </div>
      </footer>
      {calibrating && (
        <CalibrationModal
          onComplete={(cal) => {
            setStorageOK(saveCalibration(cal));
            setCalibration(cal);
            setCalibrating(false);
          }}
          onClose={() => setCalibrating(false)}
        />
      )}
    </div>
  );
}
