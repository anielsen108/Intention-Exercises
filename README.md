# Vocal Intentions

A practice studio for learning how pitch, emphasis, timing, and delivery change the intention a listener hears.

The app starts with four guided sessions: rises and falls, warmth and firmness, subtext, and transfer into everyday sentences. Each session contains three lines with two contrasting deliveries. Every delivery has a situation, a specific action to try, and a listening question.

## Practice

1. Hear a synthesized pitch guide at normal or slow speed.
2. Hum its shape or isolate a stressed vowel. Set a comfortable voice range to record and compare the pitch.
3. Try the whole sentence, then listen back. The last three takes for the current practice scope remain available for comparison.
4. Reflect on the delivery and continue. Progress is saved in this browser when storage is available.

The studio also includes a listening warm-up, an exercise library, an emphasis explorer, and IPA and ToBI notation lessons. Listening and self-assessment work without a microphone.

## What the feedback measures

Pitch similarity compares one connected voiced stretch with a selected guide in the user's calibrated range. Playback, plotting, and scoring use the same five band centers. The app withholds a score for silence, very short or unclear input, loud input, out-of-range pitch, or ambiguous segmentation. Whole sentences receive listening prompts instead of numerical intention scores.

The app does not recognize words or evaluate emotion, authenticity, stress placement, or a listener's interpretation. The target hums are pitch sketches, not human speech demonstrations. Intonation meanings vary with context, dialect, and voice quality.

Audio is processed locally with Web Audio, an AudioWorklet, YIN pitch detection, and MediaRecorder. No audio upload or account is required. Audio object URLs are released when takes are discarded or the practice view closes. The microphone is released when a take ends, setup fails, or the user leaves the view. A take stops automatically after 12 seconds.

## Content

The current content build produces **2,512 exercise entries across 39 collections**, in addition to the 24 guided studio deliveries. Counts refer to parsed entries across the two source approaches, not unique sentences. Some source files are partial collections despite their historical titles.

- [IPA source exercises](IPA-Approach/): five-level pitch notation and marked words.
- [ToBI source exercises](ToBI-approach/): intonation patterns, stress, pauses, and delivery notes.
- `site/src/content/sessions.ts`: the curated guided curriculum.
- `site/scripts/build-content.ts`: source parsing, collection inventory, and validation report.

The source collection includes pedagogical notation conventions that differ from core American English ToBI. The notation lessons identify that limitation. For references, see the [Ohio State ToBI guide](https://www.ling.ohio-state.edu/research/phonetics/E_ToBI/) and the [IPA chart](https://www.internationalphoneticassociation.org/content/ipa-chart).

## Development

The existing app uses React, TypeScript, and Vite. Use Node 22.

```sh
cd site
npm ci
npm run build
npm run dev
```

`npm run build` regenerates the library before compiling the production app. Open the local URL printed by Vite. Microphone access needs HTTPS or localhost in a browser with Web Audio support. To preview the compiled app, run `npm run preview`.

```sh
npm test
npm run lint
npm run build
```

Generated content, build output, and local browser artifacts are ignored by Git. Fonts are bundled locally. `netlify.toml` retains the existing deployment setup and builds `site/dist`.

See [DESIGN.md](DESIGN.md) for the audit and design decisions, and [PLAN.md](PLAN.md) for the remaining product work.
