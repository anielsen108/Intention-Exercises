import { useMemo, useState } from 'react';
import type { Calibration } from './analysis/calibration';
import type { Approach, Exercise } from './content/types';
import { useCollections, useExercises } from './hooks/useContent';
import { CalibrationModal, loadCalibration } from './ui/Calibration';
import { HowTones } from './ui/learn/HowTones';
import { LearnView } from './ui/learn/LearnView';
import { PracticeView } from './ui/PracticeView';
import './App.css';

type View = 'learn' | 'how' | 'practice';

const VIEWS: { key: View; label: string }[] = [
  { key: 'how', label: 'How Tones Convey Intention' },
  { key: 'learn', label: 'Introduction to Vocal Tones' },
  { key: 'practice', label: 'Practicing Vocal Intentions' },
];

function collectionLabel(slug: string): string {
  return slug
    .replace(/^\d+(-\d+)?-/, '')
    .replace(/^SUPPLEMENT-/, '⊕ ')
    .replace(/-/g, ' ');
}

const NAV_GROUPS = ['Foundation', 'Aspects 4–15', 'Aspects 16–30'] as const;

function navGroupOf(slug: string): (typeof NAV_GROUPS)[number] {
  const n = parseInt(slug, 10);
  if (Number.isNaN(n) || n <= 3) return 'Foundation'; // 01-03 + ADVANCED
  if (n <= 15) return 'Aspects 4–15';
  return 'Aspects 16–30';
}

const INTRO_KEY = 'vi.introSeen';

export default function App() {
  const collections = useCollections();
  const [approach, setApproach] = useState<Approach>('ipa');
  const [slug, setSlug] = useState<string | null>('01-general-exercises');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [calibration, setCalibration] = useState<Calibration | null>(() => loadCalibration());
  const [calibrating, setCalibrating] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [introSeen, setIntroSeen] = useState(() => localStorage.getItem(INTRO_KEY) === '1');
  const [view, setView] = useState<View>('how');

  const exercises = useExercises(approach, slug);

  const visible = useMemo(() => {
    if (!exercises) return null;
    const q = query.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter(
      (ex) =>
        ex.text.toLowerCase().includes(q) ||
        ex.variations.some((v) => v.intention.toLowerCase().includes(q)),
    );
  }, [exercises, query]);

  const selected: Exercise | null =
    (visible?.find((e) => e.id === selectedId) ?? visible?.[0]) || null;

  const forApproach = collections?.filter((c) => c.approach === approach) ?? [];

  function dismissIntro() {
    localStorage.setItem(INTRO_KEY, '1');
    setIntroSeen(true);
  }

  const navContent = (
    <>
      {collections === null && <p className="muted">Loading…</p>}
      {NAV_GROUPS.map((group) => {
        const members = forApproach.filter((c) => navGroupOf(c.slug) === group);
        if (members.length === 0) return null;
        return (
          <div key={group}>
            <h3 className="nav-group-title">{group}</h3>
            {members.map((c) => (
              <button
                key={c.slug}
                className={c.slug === slug ? 'active' : ''}
                onClick={() => {
                  setSlug(c.slug);
                  setSelectedId(null);
                }}
              >
                <span>{collectionLabel(c.slug)}</span>
                <span className="count">{c.exerciseCount}</span>
              </button>
            ))}
          </div>
        );
      })}
    </>
  );

  const listContent = (
    <>
      <input
        type="search"
        placeholder="Search text or intention…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {visible === null && <p className="muted">Loading…</p>}
      {visible?.length === 0 && <p className="muted">No matches.</p>}
      <ul>
        {visible?.map((ex) => (
          <li key={ex.id}>
            <button
              className={selected?.id === ex.id ? 'active' : ''}
              onClick={() => {
                setSelectedId(ex.id);
                setDrawerOpen(false);
              }}
            >
              <span className="num">{ex.number}</span>
              <span className="text">{ex.text}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );

  return (
    <div className="app">
      <header className="topbar">
        {view === 'practice' && (
          <button
            className="browse-btn"
            aria-label="Browse exercises"
            onClick={() => setDrawerOpen(true)}
          >
            ☰
          </button>
        )}
        <h1>
          <button className="home-link" onClick={() => setView('how')}>
            Vocal Intentions
          </button>
        </h1>
        <nav className="view-nav" aria-label="Section">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              className={view === v.key ? 'active' : ''}
              onClick={() => setView(v.key)}
            >
              {v.label}
            </button>
          ))}
        </nav>
        <button className="calibrate-btn" onClick={() => setCalibrating(true)}>
          {calibration
            ? `Range ${calibration.lowHz.toFixed(0)}–${calibration.highHz.toFixed(0)} Hz`
            : 'Calibrate voice'}
        </button>
        {view === 'practice' && (
        <div className="approach-toggle" role="tablist">
          {(['ipa', 'tobi'] as const).map((a) => (
            <button
              key={a}
              role="tab"
              aria-selected={approach === a}
              className={approach === a ? 'active' : ''}
              onClick={() => {
                setApproach(a);
                setSelectedId(null);
              }}
            >
              {a === 'ipa' ? 'IPA tones' : 'ToBI'}
            </button>
          ))}
        </div>
        )}
      </header>

      {view === 'learn' && (
        <LearnView
          calibration={calibration}
          onRequestCalibration={() => setCalibrating(true)}
        />
      )}
      {view === 'how' && (
        <main className="learn-pane">
          <HowTones calibration={calibration} onNavigate={setView} />
        </main>
      )}
      {view === 'practice' && (
      <div className="columns">
        <nav className="collections">{navContent}</nav>
        <section className="exercise-list">{listContent}</section>

        <main className="practice-pane">
          {!introSeen && (
            <div className="intro-card">
              <h2>How it works</h2>
              <ol>
                <li>
                  <strong>Pick an intention</strong> — the same sentence, three different
                  deliveries.
                </li>
                <li>
                  <strong>Record yourself</strong> (or press Space) and watch your pitch draw
                  live.
                </li>
                <li>
                  <strong>Compare</strong> — your take comes back in IPA tones and approximate
                  ToBI, scored against the target.
                </li>
              </ol>
              <div className="intro-actions">
                {!calibration && (
                  <button className="record-btn" onClick={() => setCalibrating(true)}>
                    Calibrate voice
                  </button>
                )}
                <button className="ghost-btn" onClick={dismissIntro}>
                  Got it
                </button>
              </div>
            </div>
          )}
          {selected ? (
            <PracticeView
              exercise={selected}
              calibration={calibration}
              onRequestCalibration={() => setCalibrating(true)}
            />
          ) : (
            <p className="muted">Pick an exercise.</p>
          )}
        </main>
      </div>
      )}

      {drawerOpen && view === 'practice' && (
        <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <nav className="collections">{navContent}</nav>
            <section className="exercise-list">{listContent}</section>
          </div>
        </div>
      )}

      {calibrating && (
        <CalibrationModal
          onComplete={(cal) => {
            setCalibration(cal);
            setCalibrating(false);
          }}
          onClose={() => setCalibrating(false)}
        />
      )}
    </div>
  );
}
