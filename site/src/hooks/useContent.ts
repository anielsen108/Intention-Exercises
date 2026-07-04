import { useEffect, useState } from 'react';
import type { Approach, CollectionMeta, Exercise } from '../content/types';

const base = import.meta.env.BASE_URL;

export function useCollections(): CollectionMeta[] | null {
  const [collections, setCollections] = useState<CollectionMeta[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`${base}content/collections.json`)
      .then((r) => r.json())
      .then((data: CollectionMeta[]) => {
        if (!cancelled) setCollections(data);
      })
      .catch(() => {
        if (!cancelled) setCollections([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return collections;
}

export function useExercises(approach: Approach, slug: string | null): Exercise[] | null {
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  useEffect(() => {
    if (!slug) {
      setExercises(null);
      return;
    }
    let cancelled = false;
    setExercises(null);
    fetch(`${base}content/${approach}/${slug}.json`)
      .then((r) => r.json())
      .then((data: Exercise[]) => {
        if (!cancelled) setExercises(data);
      })
      .catch(() => {
        if (!cancelled) setExercises([]);
      });
    return () => {
      cancelled = true;
    };
  }, [approach, slug]);
  return exercises;
}
