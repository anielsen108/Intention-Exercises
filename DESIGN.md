# Vocal Intentions — Look & Feel Plan

The site works, but it currently reads as a generic admin panel: system fonts, flat
white/indigo, three equal-weight columns, bare numbers for feedback. The material
deserves better — this is a *rehearsal room*, and the exercise sentence is a line of
script the user is about to perform. Every design decision below serves that framing.

**Design concept: "rehearsal room."** Quiet, warm, focused surfaces; one piece of
text treated theatrically; the pitch canvas as the stage where your voice becomes
visible. Not playful-gamified, not clinical-linguistic — somewhere between a score
and a script.

---

## 1. Typography (highest impact per hour)

- **The sentence is the hero.** Set exercise text in a warm, characterful serif —
  *Fraunces* (variable, OFL) or *Source Serif 4* — at ~2.4rem with real quotation
  marks and generous leading. Everything else stays quiet around it.
- **UI text**: *Inter* (or stay with system-ui — acceptable), with a deliberate
  scale: 0.75 / 0.85 / 1.0 / 1.2 / 2.4rem and letterspaced small-cap labels for
  things like STRESS, PAUSES, TOBI.
- **Tone letters**: bundle a subset of *Charis SIL* (OFL) so ˩˧˥ renders and
  ligates identically on every OS — this kills the corpus's own font-rendering
  workaround for good. Subset to tone letters + IPA block (~10 KB woff2 via
  glyphhanger/pyftsubset).
- All fonts self-hosted in `site/public/fonts` (no CDN → works offline, no CSP/
  privacy concerns, Netlify-friendly).

## 2. Color system

- Replace the default-indigo-on-white with a paper-and-ink palette:
  - **Light**: warm off-white paper (#faf8f4-ish), near-black ink, muted warm grays.
  - **Dark**: deep warm charcoal "stage" (#17151a-ish), soft ivory text.
- **One accent** (keep an indigo/violet family for interactive elements) plus the
  existing amber for tone letters.
- **Five band hues** — the signature move: give pitch bands 1→5 a consistent
  perceptual ramp (deep indigo → violet → magenta → orange → amber; check both
  themes for AA contrast). Use it *everywhere pitch height appears*: canvas band
  tints, the ˥˦˧˨˩ axis labels, optionally per-letter coloring of tone marks, and
  the target ribbon. Height-as-hue becomes a legend the user internalizes.

## 3. Layout & navigation

- **Three columns → focused stage.** Keep the collection/exercise rails but demote
  them visually (narrower, quieter, smaller text); give the practice pane a max
  content width (~44rem) and real whitespace so the sentence and canvas dominate.
- **Collections sidebar**: group into collapsible sections — *Foundation* (01–03,
  ADVANCED), *Aspects 4–15*, *Aspects 16–30* — with the file numbers as small
  badges and cleaned-up titles ("⊕ supplements" merged under their parents).
- **Variations: cards → tabs/chips.** Three equal cards compete for attention.
  Replace with a segmented chip row (intention names); the selected variation's
  full notation lives in ONE panel below, next to a small static preview of its
  target contour. Faster to scan, states the "pick one, then record" flow visually.
- **Mobile**: rails become a slide-over drawer; canvas keeps a fixed aspect ratio;
  variation chips scroll horizontally. (Recording on iOS Safari needs its own
  testing pass — Phase 4 item, unchanged.)

## 4. The pitch canvas as centerpiece

Currently a 180px strip with dashed target line. Make it the stage:

- Taller (~240px), soft rounded corners, faint horizontal rules at band edges,
  **˥ ˦ ˧ ˨ ˩ labels on the left axis** in their band hues.
- Target contour as a **soft translucent ribbon** (a few semitones thick) rather
  than a dashed line — communicates "land anywhere in here" honestly, since the
  scoring is tolerant.
- Live trace: slightly glowing stroke in the accent color, round caps, a bright
  dot riding the current pitch; Catmull-Rom smoothing on draw only (analysis
  untouched).
- **Recording state**: pulsing red dot + elapsed time in the canvas corner; brief
  3-2-1 fade-in on the trace so the start doesn't jump.
- **After stop**: the take replays as a quick draw-on animation, then the produced
  contour stays overlaid on the target ribbon — the comparison IS the picture.

## 5. Feedback & microinteractions

- **Score as a ring gauge** (SVG, animated count-up ~600ms) color-stepped by the
  existing s0–s4 classes, with per-clause chips beside it for multi-marker
  exercises. A bare "78" becomes a satisfying reveal.
- **Record button**: large circular FAB below the canvas, pulse animation while
  live, `Space` keyboard shortcut, disabled-with-reason when uncalibrated.
- **Custom tooltips** replacing native `title` on tone marks (pure-CSS popover or
  Floating UI): styled, instant, and **works on touch** (tap to toggle). Native
  titles stay as fallback for screen readers.
- **Transitions**: 150ms fade/slide on exercise change and result reveal;
  everything behind `prefers-reduced-motion`.

## 6. First-run & empty states

- A compact hero on first visit (no exercise selected): the loop illustrated in
  three steps — *pick a variation → record → compare* — plus a "Calibrate your
  voice" card explaining the 6-second setup, replacing today's bare button.
- Friendly mic-permission-denied state with browser-specific hint.
- Calibration modal gets a live mini pitch bar so users see the hum registering.

## 7. Accessibility pass

- Visible focus rings (accent, 2px offset) on all interactive elements — several
  currently rely on default or none.
- Canvas gets an `aria-label` summarizing the result in words ("falling contour,
  extra-high to low"), sourced from the existing `ipaGloss`.
- Contrast-check both themes to WCAG AA (the muted grays and band tints are the
  risk areas); larger touch targets (min 44px) on chips and list rows.

---

## Implementation phases (each: small commit, tests+build green)

| Phase | Scope | Effort |
|---|---|---|
| **D1** | Design tokens (CSS custom properties for type scale, palette, band hues), bundled fonts (Fraunces + Charis SIL subset), hero typography | Small |
| **D2** | Practice-view restructure: variation chips, single notation panel, focused stage layout, sidebar grouping | Medium |
| **D3** | Canvas upgrade: axis labels, target ribbon, glow trace, replay animation, record states; score ring | Medium |
| **D4** | Custom tooltips (touch-capable), first-run hero, empty states, a11y pass, mobile drawer | Medium |

Notes: no new runtime dependencies except possibly Floating UI (~3 KB) in D4;
all analysis code untouched; D1 alone transforms the perceived quality and is the
right first commit.
