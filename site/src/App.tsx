import { useMemo, useState } from 'react';
import type { Approach, Exercise } from './content/types';
import { useCollections, useExercises } from './hooks/useContent';
import { PracticeView } from './ui/PracticeView';
import './App.css';

function collectionLabel(slug: string): string {
  return slug
    .replace(/^\d+-/, '')
    .replace(/^SUPPLEMENT-/, '⊕ ')
    .replace(/-/g, ' ');
}

export default function App() {
  const collections = useCollections();
  const [approach, setApproach] = useState<Approach>('ipa');
  const [slug, setSlug] = useState<string | null>('01-general-exercises');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  return (
    <div className="app">
      <header className="topbar">
        <h1>Vocal Intentions</h1>
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
      </header>

      <div className="columns">
        <nav className="collections">
          {collections === null && <p className="muted">Loading…</p>}
          {forApproach.map((c) => (
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
        </nav>

        <section className="exercise-list">
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
                  onClick={() => setSelectedId(ex.id)}
                >
                  <span className="num">{ex.number}</span>
                  <span className="text">{ex.text}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <main className="practice-pane">
          {selected ? (
            <PracticeView exercise={selected} />
          ) : (
            <p className="muted">Pick an exercise.</p>
          )}
        </main>
      </div>
    </div>
  );
}
