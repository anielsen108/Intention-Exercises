import type { Calibration } from './calibration';
import { bandPosition } from './calibration';
import { transcribe } from './transcribe';
import { scorePerformance } from './performance';
import type { TrackPoint } from './track';
import { MIN_CONTOUR_SEC, hopSeconds, reliablePitch } from './timing';

export interface Feedback {
  title: string;
  cue: string;
  score: number | null;
  usable: boolean;
}

export function describeShape(levels: number[]): string {
  if (!levels.length) return 'Explore the delivery';
  const start = levels[0],
    end = levels[levels.length - 1];
  const min = Math.min(...levels),
    max = Math.max(...levels);
  if (max - min < 1) return 'Keep the pitch steady';
  if (min < start && min < end) return 'Fall, then rise';
  if (max > start && max > end) return 'Rise, then fall';
  return end > start ? 'Let the pitch rise' : 'Let the pitch fall';
}

/** Coach an isolated word/hum. Whole sentences receive listening prompts only. */
export function coachTake(
  track: TrackPoint[],
  cal: Calibration,
  levels?: number[],
): Feedback {
  const voiced = track.filter(reliablePitch);
  const hop = hopSeconds(track);
  if (voiced.length * hop < MIN_CONTOUR_SEC - 1e-8)
    return {
      title: 'We need a little more voice',
      cue: 'Too little clear pitch was detected to compare the shape. Try the vowel again at an easy pace, or move closer if the trace stays empty. A short natural delivery is fine.',
      score: null,
      usable: false,
    };
  if (track.filter((p) => p.rms > 0.45).length > track.length * 0.1)
    return {
      title: 'The input is very loud',
      cue: 'Move a little farther from the microphone and use your normal speaking volume. Then try again.',
      score: null,
      usable: false,
    };
  if (!levels?.length)
    return {
      title: 'Now listen for the intention',
      cue: 'Play the take back. Notice the stressed word, the ending, and the space you leave afterward. Choose one of those to change on your next take.',
      score: null,
      usable: true,
    };
  const outside = voiced.filter(
    (p) => p.hz! < cal.lowHz * 0.94 || p.hz! > cal.highHz * 1.06,
  ).length;
  if (outside > voiced.length * 0.3)
    return {
      title: 'Your voice is outside the saved range',
      cue: 'Use “Voice range” to sample your ordinary speech and comfortable low and high again, then repeat this shape.',
      score: null,
      usable: false,
    };
  const gated = track.map((p) => (reliablePitch(p) ? p : { ...p, hz: null }));
  const transcription = transcribe(gated, cal);
  if (transcription.runs.length !== 1)
    return {
      title: 'Try one connected sound',
      cue: 'Several voiced sounds were detected. Select the sound you meant to compare below the chart, or try the stressed vowel on its own.',
      score: null,
      usable: false,
    };
  const score =
    scorePerformance(gated, cal, [{ word: '', levels }])?.score ?? null;
  const positions = voiced.map((p) => bandPosition(p.hz!, cal));
  const edge = Math.max(1, Math.floor(positions.length * 0.15));
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const start = mean(positions.slice(0, edge)),
    end = mean(positions.slice(-edge));
  const targetStart = (levels[0] - 0.5) / 5,
    targetEnd = (levels[levels.length - 1] - 0.5) / 5;
  const movement = end - start,
    targetMovement = targetEnd - targetStart;
  if (targetMovement > 0.2 && movement < 0.08)
    return {
      title: 'Give the ending a lift',
      cue: 'Your ending stayed level or fell. Begin a little lower, then carry the vowel upward without getting louder.',
      score,
      usable: true,
    };
  if (targetMovement < -0.2 && movement > -0.08)
    return {
      title: 'Let the ending settle',
      cue: 'Your ending stayed level or rose. Begin a little higher, then let the vowel travel down to a comfortable low.',
      score,
      usable: true,
    };
  if (Math.abs(start - targetStart) > 0.22)
    return {
      title: 'Adjust where you begin',
      cue: `Begin ${start < targetStart ? 'a little higher' : 'a little lower'} in your comfortable range, then follow the guide. Change the starting pitch before changing your volume.`,
      score,
      usable: true,
    };
  if (Math.abs(end - targetEnd) > 0.22)
    return {
      title: 'Make the landing clearer',
      cue: `Finish ${end < targetEnd ? 'a little higher' : 'a little lower'}. Slow the vowel down so you can hear where it lands.`,
      score,
      usable: true,
    };
  if (score !== null && score >= 78)
    return {
      title: 'The shape is coming through',
      cue: 'Keep that movement and try the whole sentence. Listen for whether the pace and emphasis support your intention.',
      score,
      usable: true,
    };
  return {
    title: 'Give the movement more room',
    cue: `${describeShape(levels)} on a slow hum. Listen to the guide again and make the change of direction clear before adding the words.`,
    score,
    usable: true,
  };
}
