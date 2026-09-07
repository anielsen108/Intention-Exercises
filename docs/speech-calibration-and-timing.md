# Speaking calibration and short-contour timing

This revision addresses two mismatches: the old medium level was the midpoint of two hummed notes, and a short spoken sound could occupy only a small part of a long recording chart. The 1.15-second default guide and 250 ms minimum voiced duration also encouraged unnecessarily long deliveries.

## Research and interpretation

| Evidence | Consequence for this app |
| --- | --- |
| Yi Xu, [Articulatory constraints and tonal alignment (2002)](https://www.isca-archive.org/speechprosody_2002/xu02_speechprosody.pdf), pp. 92 and 95, gives a rough average of 143–200 ms per syllable at 5–7 syllables per second. Reported minimum pitch-shift times vary with excursion: about 124 ms for four semitones, and 170–194 ms for an octave. | Hundreds of milliseconds are a useful scale for an isolated movement. These are population/task results, not a required tempo for every English word, accent or phrase. Larger or reversing contours can need more time. |
| [Praat: Time step settings](https://www.fon.hum.uva.nl/praat/manual/Time_step_settings___.html) explains overlapping pitch measurements and a three-period analysis window: 60 ms at a 50 Hz floor. Its example uses 15 ms steps. | Separate the analysis window from the duration of the practiced sound. The app uses a 60 ms YIN frame with a 10 ms hop, giving a 150 ms sound multiple overlapping measurements. Overlap does not make those measurements statistically independent or give 10 ms boundary accuracy. This app uses YIN, not Praat's algorithm. |
| Céline De Looze and Daniel Hirst, [The OMe (Octave-Median) scale (2014)](https://www.isca-archive.org/speechprosody_2014/looze14_speechprosody.html), proposes a logarithmic pitch scale centered on a speaker's median. | Use the median of an ordinary-speech sample as the medium anchor, with logarithmic distances. The five-band interpolation below is our interface design, not a validated implementation of the paper's range model. |

## Personal calibration

1. Read an everyday passage for up to eight seconds, with at least 2.5 seconds of clear voiced speech. The median detected pitch becomes **medium**. Silence, low-energy frames and low-confidence estimates are excluded.
2. Record three seconds in a comfortable low speaking register, then three seconds in a comfortable high register. Speaking or humming is allowed. Each needs at least 700 ms of clear voice and a median at least two semitones away from the ordinary baseline on the appropriate side. This spacing is an engineering quality gate.
3. Preview all five reference pitches. Repeat an individual endpoint if needed, or resample ordinary speech to start over. The old saved calibration remains in place until the new one is accepted.

The measured low and high become the centers of **very low** and **very high**. **Low** and **high** lie halfway in semitones between those endpoints and medium. The graph interpolates each side separately, allowing asymmetric ranges. Its outer boundaries extend a quarter of each center-to-endpoint distance beyond the measured endpoints so the reference sounds sit inside the outer bands. Playback, plotting, transcription and scoring use the same mapping.

Profiles carry a version and a measured middle frequency. Legacy two-note profiles still load and get an invitation to refine them. A short passage estimates today's speaking baseline; it cannot establish a person's complete habitual range across contexts. Stable pitch-tracker octave errors and non-modal voice remain limitations. The five categories are practice references, not universal perceptual boundaries.

## Timing and comparison

- Guide presets are **200 ms**, **350 ms** (default) and **700 ms**, plus **Match my sound** after a focused recording. These are convenient practice choices, not normative durations.
- Audio is analyzed in a 16 kHz Web Audio context, with **60 ms frames / 10 ms hops** and a 50–800 Hz search interval. Frame times refer to frame centers. Browser resampling keeps the computation modest; the recorded playback retains the MediaRecorder stream.
- A short comparison needs **120 ms of reliable voiced measurements**. Below that the graph and playback remain available, but the app withholds a score. This is a reliability heuristic, not a physiological minimum.
- The same selected sound interval controls the chart and target ribbon. Millisecond labels expose the actual duration; no automatic animation implies that the learner should speak more slowly. The live display starts near voice onset rather than reserving twelve seconds of empty width.
- Detection bridges gaps up to **60 ms** and discards regions shorter than **80 ms**. These rules can join brief consonant gaps or discard tracker artifacts; they do not identify words or syllables.
- If one region dominates by duration, it can be focused automatically. A second region at least one quarter as long prevents automatic selection. The learner can choose among multiple sounds. Selection never depends on which region scores best.
- **Show full recording** restores elapsed recording time, including silence. The target remains over the focused interval. Take labels distinguish the sound duration from the recording duration.
- Isolated-shape recording optionally ends after **650 ms of quiet**, with the existing 12-second cap. Whole-sentence recording retains manual stop and the cap. The quiet interval is a UI convenience, not a definition of a linguistic boundary.

The pitch score compares shape independently of overall duration. It cannot validate accent timing within a sentence, recognize the focus word, assess rhythm, or judge the intention a listener hears. Time normalization preserves gaps on the chart; the existing contour scorer resamples voiced pitch values. Use whole-sentence playback for rhythm and context.

## Validation

Regression coverage includes asymmetric calibration, median robustness, invalid saved profiles, short contours, long leading/trailing silence, interrupted voicing, ambiguous sound selection, and the streaming recorder's timestamps and bounded buffer. Browser checks exercise calibration, short synthetic audio through the real AudioWorklet/YIN/MediaRecorder pipeline, chart focus, guide duration controls, microphone cleanup and mobile layout. Synthetic tests establish software behavior; real speakers and physical microphones remain necessary for perceptual validation.
