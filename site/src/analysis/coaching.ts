import type { Calibration } from './calibration';
import { bandPosition } from './calibration';
import { transcribe } from './transcribe';
import { scorePerformance } from './performance';
import type { TrackPoint } from './track';

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
  const voiced = track.filter(
    (p) => p.hz !== null && p.clarity >= 0.6 && p.rms >= 0.003,
  );
  const hop = track.length > 1 ? track[1].t - track[0].t : 0.02;
  if (voiced.length * hop < 0.25)
    return {
      title: 'We need a little more voice',
      cue: 'Try a comfortable hum for about a second. Move closer to the microphone if the trace stays empty.',
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
      cue: 'Use “Voice range” to set a comfortable low and high again, then repeat this shape.',
      score: null,
      usable: false,
    };
  const transcription = transcribe(track, cal);
  if (transcription.runs.length !== 1)
    return {
      title: 'Try one connected sound',
      cue: 'Several separate voiced stretches were detected. Hum the shape or lengthen the stressed vowel on its own so the comparison has one clear target.',
      score: null,
      usable: false,
    };
  const score =
    scorePerformance(track, cal, [{ word: '', levels }])?.score ?? null;
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
