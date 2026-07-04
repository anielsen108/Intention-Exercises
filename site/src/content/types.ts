/** Canonical content schema shared by the build script and the app. */

export type Approach = 'tobi' | 'ipa';

/** One tone-marked word: `[soon˥˩]` → { word: "soon", levels: [5, 1] } */
export interface IpaToneMarker {
  word: string;
  /** Pitch levels 1 (extra low) … 5 (extra high), in order of the contour. */
  levels: number[];
}

export interface Variation {
  /** Intention label, e.g. "Encouraging release" or "Firm command". */
  intention: string;
  /** ToBI tone string, e.g. "L* H* L-L%" (ToBI approach only). */
  tobi?: string;
  /** Stress line with **CAPS** markers, e.g. "Let it **GO**". */
  stress?: string;
  /** Pause line with , / // markers. */
  pauses?: string;
  /** Free-form performance note, e.g. "Breathy tone, slow fall." */
  note?: string;
  /** Sentence with tone-marked words removed of markup (IPA approach only). */
  sentence?: string;
  /** Tone-marked nuclear words in order (IPA approach only). */
  markers?: IpaToneMarker[];
}

export interface Exercise {
  /** Stable id, e.g. "tobi/01-general/003". */
  id: string;
  approach: Approach;
  /** Collection slug derived from filename, e.g. "01-general-exercises". */
  collection: string;
  /** Section heading within the file, if any. */
  section?: string;
  /** Exercise number as printed in the source file. */
  number: number;
  /** The exercise sentence. For IPA entries this is the cleaned sentence. */
  text: string;
  variations: Variation[];
}

/** A problem the parser could not resolve; surfaced in the validation report. */
export interface ParseIssue {
  file: string;
  line: number;
  message: string;
  /** The offending source text, truncated. */
  excerpt: string;
}

export interface ParseResult {
  exercises: Exercise[];
  issues: ParseIssue[];
}

export interface CollectionMeta {
  slug: string;
  approach: Approach;
  title: string;
  exerciseCount: number;
  file: string;
}
