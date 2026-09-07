# Site audit and redesign

## Intended outcome

Help a speaker deliberately change the intention of a line by controlling pitch, emphasis, timing, and voice quality. The exercise succeeds when the speaker can hear a useful contrast and reproduce it in a plausible situation.

## What weakened the original attempt

| Finding | Why it matters | Implemented change |
| --- | --- | --- |
| A long explanation was the landing page; practice began with notation choices and a large collection list. | A new learner had to design their own lesson before trying a delivery. | A studio landing page, an audible contrast, and four guided sessions with a clear starting point. |
| Most IPA entries had one intention, while the interface promised three variations of the same sentence. | Browsing individual entries did not train deliberate contrasts. | Twelve curated lines with two different situations and deliveries each; the original library remains available. |
| The practice screen lacked an audible target. | A learner unfamiliar with pitch notation could not easily turn the symbols into an action. | Audible hums, a moving visual trace, slower playback, and plain-language shape labels. |
| Recording produced notation and a match number without a useful next step. | The learner could not tell what to change. | Retry cues for direction, starting pitch, landing, signal quality, and range; a distinct full-sentence listening mode. |
| A partial multi-marker take was matched against the easiest target. | The score could reward an incomplete performance. | Ambiguous alignment returns no score. The studio isolates one selected word or hum for comparison. |
| Synthesized frequencies used band centers while scoring targets used the extreme edges of the range. | The app could disagree with its own demonstration. | One band-center mapping for audio, graphs, and scoring, with a regression test. |
| A new take replaced the old one. | There was no practical way to compare attempts. | The last three takes in the current scope, selectable playback, and a same-scope score change when both takes are usable. |
| Calibration was a barrier, and missing microphone access stopped practice. | Listening and self-directed repetition were unnecessarily blocked. | Playback and practice-by-ear without calibration; clear microphone recovery instructions. |
| Recording and calibration had fragile cancellation and resource cleanup. | Navigating away or closing a permission prompt could leave work running. | Cancellable initialization, idempotent stop, a single microphone owner, disposed timers and audio URLs, and regression coverage. |
| The global Space shortcut intercepted controls and could activate multiple lesson recorders. | Keyboard interaction could trigger unexpected recording. | Shortcuts ignore interactive elements and dialogs; reference-lesson recorders use their own controls. |
| Copy treated pitch as a fixed dictionary of social meaning. | That overstated what prosody and automatic analysis can establish. | Situational examples and explicit limits; reflection assesses intention, while the algorithm compares pitch. |
| The README claimed 6,000+ exercises and complete parallel corpora. | The actual content build did not support those claims. | A verified inventory of 2,512 parsed entries across 39 collections and transparent descriptions of partial sources. |

## Design

The page uses warm paper, dark green, a locally bundled serif for spoken lines, and a restrained set of functional controls. The line and intention lead the practice area; the situation and direction sit alongside it. Notation is available as a secondary reference. The layout adapts to phone widths and respects reduced-motion settings.

The training loop is **hear → isolate → speak → compare → reflect**. Progress records an explicit self-assessment, not a claimed level of mastery. Learners can repeat a delivery, jump within a session, resume unfinished work, or use the corpus independently.

## Speaking calibration and short deliveries

Medium now comes from the median of an ordinary-speech sample. Comfortable low and high samples set the outer reference levels, and learners can hear all five levels before saving. Existing two-note profiles remain usable and receive a refinement prompt.

Guide durations are 200, 350 and 700 ms, with a recorded-duration option. Comparison charts focus on the detected sound, show milliseconds and offer the full recording timeline. Multiple substantial sounds require a focus choice. The analysis uses 60 ms frames at 10 ms intervals and accepts clear voiced contours from 120 ms. Isolated takes can stop after a quiet gap. See [the research and timing notes](docs/speech-calibration-and-timing.md) for evidence and limits.

## Verification

The test suite covers the parsers, pitch detection, transcription, scoring, signal-quality feedback, guided curriculum, storage fallbacks, and microphone cancellation. The content build reports its inventory and parsing issues. Browser verification covers the guided sequence, persistence, library filtering, notation navigation, keyboard interaction, calibration, playback, and responsive layouts. Synthetic audio is used for repeatable recorder checks; that does not substitute for checking a physical microphone or every mobile browser.

The completed redesign was checked with 116 passing tests, a clean lint run, a successful production build, and zero content parsing issues. Headless Edge checks covered a full guided session, persistence and resume, library search, the listening quiz, notation navigation, 320/390/768/1280-pixel layouts, and dialog focus. Synthetic input exercised the real AudioWorklet/YIN/MediaRecorder path, calibrated 110/220 Hz, compared opposite contours, played recorded audio, withheld scores for silence and whole sentences, and verified automatic stopping, canceled permissions, calibration cancellation, and microphone cleanup.

A sustained-recording check also exposed growing buffer copies in the original audio capture. The recorder now retains only the unconsumed sample overlap and batches worklet messages. A regression test verifies bounded sample memory and continuous timestamps through more than 13 seconds of input.
