# Vocal Intentions — Interactive Web Site Plan

> **Status (2026-07-04):** Phases 0–3 implemented in `site/`.
> Phase 0: content pipeline (2,512 exercises) + browser UI. Phase 1: mic capture,
> YIN pitch tracking, live band-scaled pitch canvas, voice calibration.
> Phase 2: nucleus detection, IPA tone transcription, DTW contour scoring.
> Phase 3: F0-only approximate ToBI (boundary tones, break indices, heuristic
> accents) — ASR word alignment for true pitch-accent placement still open.
> Remaining: Phase 3b (whisper.cpp alignment), Phase 4 polish (CREPE, three-takes
> blind mode, progress tracking, PWA, iOS testing).

Convert the exercise repository into an interactive practice site where the user picks an exercise, records themselves, and sees a live pitch trace plus an automatic transcription of what they actually produced in IPA tone letters (and an approximate ToBI labeling), compared against the exercise's target notation.

---

## 1. Product vision

**Core loop:** Browse exercise → see target notation (ToBI + IPA + stress + pauses) → press record and speak → watch your live pitch contour draw in real time → get back "what you said" as IPA tones (e.g. `[˥˩]` on the nuclear syllable) and heuristic ToBI labels (e.g. `H* L-L%`) → compare against the target → retry.

**Key insight about feasibility:** IPA five-level tone transcription is directly computable from a pitch track (quantize speaker-normalized F0 into 5 bands). ToBI labeling is a research-grade problem (pitch *accents* require knowing which words are prominent and where syllables are), so it ships later and is always presented as "approximate." The plan phases accordingly.

---

## 2. Architecture

**Client-only static site. No backend.**

- All audio capture and analysis happens in the browser (Web Audio API + AudioWorklet + WASM). Nothing is uploaded — important for a practice tool people use with their real voice, and it makes hosting free (GitHub Pages / Netlify / Cloudflare Pages).
- Exercise content is compiled from the markdown at build time into structured JSON.
- Progress/recordings stored locally in IndexedDB (with export/import).

**Stack:** Vite + TypeScript + React (or Svelte), Canvas/WebGL for the pitch trace, Vitest for tests, Playwright for the record-and-analyze E2E flow (using prerecorded fixture audio piped through `AudioContext.decodeAudioData` so tests don't need a real microphone).

```
site/
├── scripts/
│   └── build-content.ts      # markdown → exercises.json (runs at build)
├── public/content/           # generated JSON, chunked per file
├── src/
│   ├── audio/                # capture, worklet, pitch tracking
│   ├── analysis/             # F0 post-processing, IPA tones, ToBI heuristics, scoring
│   ├── ui/                   # exercise browser, practice view, pitch canvas
│   └── state/                # progress store (IndexedDB)
└── tests/fixtures/audio/     # WAVs with known contours for analysis tests
```

---

## 3. Content pipeline (markdown → JSON)

A build script parses both approach folders into one canonical schema, since the two approaches cover the same sentences with different notation:

```ts
interface Exercise {
  id: string;                 // "tobi/01/003" etc.
  collection: string;         // "general", "two-clause", "emotional-range", ...
  text: string;               // "Excuse me?"
  variations: Variation[];
}
interface Variation {
  intention: string;          // "Flirtatious"
  tobi?: string;              // "L+H* L+H* H-H%"
  stress?: string;            // "Excuse **ME**"
  pauses?: string;            // "Excuse , **me**?"
  performanceNote?: string;   // "Extended rise, breathy onset."
  ipaTones?: IpaTone[];       // [{syllable: "me", contour: [1,5]}]
}
```

Parsing notes discovered from the source files:
- ToBI files use a `## N. "Sentence"` + bulleted variation format; IPA files use one-line `**Intention** — [word˥˩]. [˥ ˩ => ˥˩]` format. Two parsers, one output schema.
- IPA tone letters `˥˦˧˨˩` map to levels 5–1; the `[˥ ˩ => ˥˩]` legends are redundant and can be dropped after validation.
- The parser must be strict and **report** every line it can't parse (the corpus is LLM-generated at scale; expect format drift, especially in the 16-20 and 21-30 aggregate files). A validation report is part of the build.
- Where the same sentence exists in both approaches, cross-link so the practice view can show both notations at once.

---

## 4. Voice analysis engine (the heart of the site)

### 4.1 Capture and pitch tracking (real-time)
- `getUserMedia` → `AudioWorklet` ring buffer → pitch estimator running per ~10 ms hop.
- Estimator: **YIN / McLeod (via the `pitchy` library or a small WASM port)** for real-time. Optionally re-run the finished take through **CREPE-tiny (ONNX Runtime Web)** for a cleaner post-hoc track. Start with YIN only; CREPE is an accuracy upgrade later.
- Post-processing: voicing gate (confidence + energy), median filter, octave-jump repair, convert Hz → semitones.

### 4.2 Speaker calibration (one-time, ~20 seconds)
Five-level tones only make sense relative to *your* range. Calibration flow: user reads two prompts (lowest comfortable pitch, highest comfortable), we fit their speaking range in semitones and split it into 5 bands (with hysteresis at band edges to prevent flicker). Stored locally; re-runnable.

### 4.3 IPA tone transcription (MVP deliverable)
1. Segment the take into voiced stretches; find the **nuclear region** = the voiced stretch with the largest pitch excursion × energy (matches how the corpus marks one nuclear syllable per clause).
2. Within it, resample the normalized contour, collapse to turning points (piecewise-linear fit), quantize each anchor to a band → emit tone letters: level 5→1 fall becomes `˥˩`, 1→3→5 becomes `˩˧˥`, etc.
3. Display: the sentence with `[word˥˩]`-style annotation on the detected nucleus, plus the raw contour drawn over the 5 calibrated bands.

### 4.4 ToBI approximation (Phase 3, labeled "approximate")
Heuristics over the F0 track + word timings:
- **Boundary tones** (easiest, quite reliable): final 200–300 ms contour → `L-L%` (fall to bottom), `L-H%` (fall-rise / low rise), `H-H%` (high rise), `H-L%` (high plateau).
- **Break indices**: silence gaps → `//` (BI 4), `/` (BI 3), lengthening + small gap → `,` (BI 2).
- **Pitch accents**: needs word/syllable alignment. Use in-browser ASR for word timings — **whisper.cpp WASM (tiny.en)** or Vosk WASM — then classify accented words by prominence (pitch excursion + duration + energy) as `H*`, `L*`, `L+H*` (steep rise into peak), `H+L*` (fall onto stress), `!H*` (downstepped peak).
- Reference AuToBI's published feature set for the classifiers; ship rule-based first, tune against hand-labeled samples.

### 4.5 Target rendering and comparison scoring
- Every variation's **target** contour gets rendered as a stylized curve (from IPA tone levels directly; from ToBI via standard interpolation rules) so the user sees what to aim for before recording.
- Score a take with **DTW distance** between produced and target normalized contours, plus discrete checks: nucleus on the right word? Final boundary direction correct? Pauses in the marked places? Show per-component feedback, not just a number.

---

## 5. UX / pages

1. **Home / curriculum**: the README's progression (foundation → two-clause → three-clause → 30 aspects) as a visual course map with per-collection progress rings.
2. **Exercise browser**: filter by collection, aspect, intention keyword; full-text search.
3. **Practice view** (the main screen):
   - Sentence large; toggle ToBI / IPA / both notation; stress and pause marks rendered inline (already in the source data).
   - Target contour strip; record button; **live pitch trace drawing over the 5 calibrated bands** while speaking.
   - After stop: produced IPA tones + approximate ToBI under the target, diff-highlighted; playback of your take; A/B replay against previous takes.
   - "Three takes" mode matching the methodology: record the three intention variations back-to-back, then blind-shuffle playback and ask you to label your own takes — the self-test the INSTRUCTIONS prescribe.
4. **Calibration & settings**: pitch range setup, mic selection, notation preference.
5. **Progress**: streaks, per-aspect completion, saved recordings (IndexedDB, exportable).

Accessibility/rendering: bundle a font known to render tone letters and ligate contours correctly (e.g. Gentium Plus or Charis SIL) — the corpus's own INSTRUCTIONS note that font ligation of `˩˧˥` is unreliable; bundling kills that problem.

---

## 6. Phased roadmap

**Phase 0 — Foundations (1–2 sessions)**
- `git init`, scaffold Vite app, CI running tests.
- Content build script + parsers with a validation report over all 40+ files. *Tests first: parser fixtures from real excerpts of each file format.*
- Static exercise browser + practice view showing target notation (no audio yet). → Already a useful reading companion.

**Phase 1 — Hear yourself (MVP of "live")**
- Mic capture, real-time YIN pitch trace on canvas, calibration flow, take playback/storage.
- *Tests: pitch tracker against synthesized glides/tones fixtures; calibration band math.*

**Phase 2 — IPA tone transcription**
- Nucleus detection, contour quantization, tone-letter output, target-vs-produced comparison + DTW score.
- *Tests: fixture WAVs with known contours (synthesized + a few recorded) must transcribe to expected tone strings.*

**Phase 3 — ToBI approximation**
- Boundary tones + break indices first (F0-only, no ASR). Then whisper.cpp WASM word alignment → pitch accent labels. Clearly badged "approximate."

**Phase 4 — Polish**
- CREPE post-hoc refinement, three-takes blind self-test mode, progress/streaks, PWA offline support, mobile audio hardening (iOS Safari AudioWorklet quirks).

---

## 7. Risks and mitigations

| Risk | Mitigation |
|---|---|
| ToBI auto-labeling accuracy (genuinely hard) | Phase it last; boundary tones first (reliable); always label output "approximate"; never block the core loop on it |
| Corpus format drift breaks parsing | Strict parser + build-time validation report; fix source files as found |
| Octave errors / creaky voice wreck F0 tracks | Median filtering, octave repair, voicing confidence gate; CREPE upgrade path |
| iOS Safari audio quirks (sample rates, worklet, autoplay) | Test early on device; fallback to ScriptProcessor if needed |
| Tone letters render badly | Bundle Gentium Plus / Charis SIL |
| Speaker range varies day to day | Quick re-calibration button; per-take auto range fit as sanity check |

---

## 8. Open decisions (defaults chosen, easy to change)

- **Framework:** React default; Svelte fine if preferred.
- **Hosting:** GitHub Pages default (repo isn't under git yet — Phase 0 includes `git init`; will ask before any push).
- **ASR for alignment:** whisper.cpp WASM default over Vosk (better accuracy, ~40 MB model download, cached).
- **Scope of Phase 3:** could substitute a cloud alignment service for better ToBI, at the cost of the no-upload privacy story. Default: stay fully client-side.
