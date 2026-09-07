import type { Exercise, Variation } from './types';

export interface CoachedVariation extends Variation {
  situation: string;
  action: string;
  listenFor: string;
}
export interface GuidedExercise extends Exercise {
  variations: CoachedVariation[];
}
export interface Session {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  skill: string;
  exercises: GuidedExercise[];
}

function variation(
  intention: string,
  word: string,
  levels: number[],
  situation: string,
  action: string,
  listenFor: string,
): CoachedVariation {
  return {
    intention,
    markers: [{ word, levels }],
    situation,
    action,
    listenFor,
  };
}
function exercise(
  session: string,
  number: number,
  text: string,
  variations: CoachedVariation[],
): GuidedExercise {
  return {
    id: `studio/${session}/${number}`,
    approach: 'ipa',
    collection: session,
    number,
    text,
    variations,
  };
}

export const SESSIONS: Session[] = [
  {
    id: 'open-close',
    title: 'Open a door. Close a thought.',
    subtitle: 'Rises & falls',
    skill: 'Direction',
    description: 'Turn a statement into an invitation by changing how it ends.',
    exercises: [
      exercise('open-close', 1, 'You’re coming.', [
        variation(
          'Make it settled',
          'coming',
          [4, 1],
          'Your friend has agreed. You’re confirming the plan.',
          'Start “coming” comfortably high and let it land low. Leave a beat of silence after it.',
          'Does the ending sound complete, or does it ask for an answer?',
        ),
        variation(
          'Ask for an answer',
          'coming',
          [2, 5],
          'You haven’t heard whether your friend can make it.',
          'Start “coming” low and lift through its stressed vowel. Keep the volume conversational.',
          'Does the lift give your friend room to answer?',
        ),
      ]),
      exercise('open-close', 2, 'Really.', [
        variation(
          'Confirm it',
          'Really',
          [4, 2],
          'Someone doubts your story. You mean every word.',
          'Let the vowel fall steadily. Keep your pace even.',
          'Does this sound like confirmation rather than surprise?',
        ),
        variation(
          'Show curiosity',
          'Really',
          [2, 4],
          'A friend has just told you something unexpected.',
          'Lift through the vowel as if inviting the rest of the story.',
          'Does your question sound interested rather than confrontational?',
        ),
      ]),
      exercise('open-close', 3, 'That’s the one.', [
        variation(
          'Choose it',
          'one',
          [4, 1],
          'You’ve found exactly what you were looking for.',
          'Give “one” a clear fall, then stop. Avoid a little rise at the end.',
          'Can you hear a decision?',
        ),
        variation(
          'Check your understanding',
          'one',
          [2, 4],
          'You’re pointing to an item and checking that you understood.',
          'Let “one” rise gently. Keep the rest of the sentence easy.',
          'Can you hear a request for confirmation?',
        ),
      ]),
    ],
  },
  {
    id: 'warm-firm',
    title: 'Be warm. Be firm.',
    subtitle: 'Range & delivery',
    skill: 'Intensity',
    description: 'Keep the words and change the pressure you put behind them.',
    exercises: [
      exercise('warm-firm', 1, 'Take your time.', [
        variation(
          'Offer reassurance',
          'time',
          [3, 2],
          'Someone is embarrassed about keeping you waiting.',
          'Use a small fall on “time”. Give the vowel a little space and soften the onset.',
          'Does your pace actually give them time?',
        ),
        variation(
          'Make the instruction clear',
          'time',
          [5, 1],
          'A colleague is rushing an important step. You need them to slow down.',
          'Use a wider, definite fall on “time”. Keep the volume steady.',
          'Is the instruction clear without becoming a shout?',
        ),
      ]),
      exercise('warm-firm', 2, 'It’s okay.', [
        variation(
          'Comfort someone',
          'okay',
          [3, 2],
          'A friend has made a small mistake and feels terrible.',
          'Keep the fall small and unhurried. Let the last vowel finish gently.',
          'Would this help your friend relax?',
        ),
        variation(
          'End the discussion',
          'okay',
          [4, 1],
          'You have accepted an apology and want to move on.',
          'Make a clean fall on the stressed part of “okay”. Finish without an extra lift.',
          'Does it sound resolved rather than dismissive?',
        ),
      ]),
      exercise('warm-firm', 3, 'Stay here.', [
        variation(
          'Invite closeness',
          'here',
          [3, 2],
          'Someone you care about is about to leave. You’d like a little more time.',
          'Use a gentle fall and a slightly longer “here”.',
          'Can you hear an invitation in the timing and softness?',
        ),
        variation(
          'Set a boundary',
          'here',
          [5, 1],
          'You need someone to wait in this spot while you check something.',
          'Let “here” fall decisively. Make the end clean and keep your throat easy.',
          'Is the boundary clear at a normal speaking volume?',
        ),
      ]),
    ],
  },
  {
    id: 'subtext',
    title: 'Let the subtext through.',
    subtitle: 'Turns & hesitation',
    skill: 'Nuance',
    description:
      'Explore the difference between a clean answer and a reservation.',
    exercises: [
      exercise('subtext', 1, 'Fine.', [
        variation(
          'Accept the plan',
          'Fine',
          [4, 2],
          'The proposed time works for you.',
          'Use a simple fall. Keep the vowel relaxed and finish cleanly.',
          'Does this sound like uncomplicated agreement?',
        ),
        variation(
          'Leave a reservation',
          'Fine',
          [4, 1, 3],
          'You can agree, but there’s one detail you still want to discuss.',
          'Let “fine” fall, then lift slightly before you finish. Stretch the vowel enough to hear both movements.',
          'Can you hear an unspoken “but”?',
        ),
      ]),
      exercise('subtext', 2, 'I see.', [
        variation(
          'Show understanding',
          'see',
          [3, 1],
          'An explanation has just made sense.',
          'Give “see” a steady fall and let it settle.',
          'Does the response acknowledge the explanation?',
        ),
        variation(
          'Hold something back',
          'see',
          [4, 2, 4],
          'You understand the explanation but aren’t convinced by it.',
          'Dip on “see”, then return upward. Keep the turn smooth.',
          'Does it leave space for a follow-up concern?',
        ),
      ]),
      exercise('subtext', 3, 'That’s interesting.', [
        variation(
          'Acknowledge the idea',
          'interesting',
          [4, 2],
          'Someone has offered an idea you want to consider.',
          'Fall gently on the stressed vowel. Keep the other syllables light.',
          'Do the pace and tone sound attentive?',
        ),
        variation(
          'Signal a question underneath',
          'interesting',
          [4, 1, 3],
          'The idea surprises you, and you want to ask how it would work.',
          'Practice the fall–rise on a hum first, then carry it into “interesting”.',
          'Can you hear curiosity mixed with a reservation?',
        ),
      ]),
    ],
  },
  {
    id: 'transfer',
    title: 'Make it sound like you.',
    subtitle: 'Everyday conversation',
    skill: 'Transfer',
    description: 'Use pitch, timing, and emphasis together in longer lines.',
    exercises: [
      exercise('transfer', 1, 'We can talk about it tomorrow.', [
        variation(
          'Give someone breathing room',
          'tomorrow',
          [3, 2],
          'A friend is overwhelmed. The conversation can wait.',
          'Let the sentence breathe. Use a small fall on the stressed vowel of “tomorrow”.',
          'Does tomorrow feel like relief?',
        ),
        variation(
          'Propose a time',
          'tomorrow',
          [2, 4],
          'You’re looking for a time that works for both of you.',
          'Keep the beginning matter-of-fact and lift on “tomorrow”.',
          'Does the other person have room to suggest a different time?',
        ),
      ]),
      exercise('transfer', 2, 'I need a little more time.', [
        variation(
          'State a boundary',
          'time',
          [4, 1],
          'You know the work needs another day.',
          'Slow down slightly before “time”, then land the word with a fall.',
          'Does it sound clear without sounding apologetic?',
        ),
        variation(
          'Make an appeal',
          'time',
          [2, 5],
          'You’re asking someone to extend a deadline.',
          'Lift on “time” while keeping the rest of the line grounded.',
          'Can you hear the request without adding extra words?',
        ),
      ]),
      exercise('transfer', 3, 'I thought you’d say that.', [
        variation(
          'Acknowledge a familiar response',
          'that',
          [3, 1],
          'Your friend’s answer is exactly what you expected.',
          'Let “that” fall. Use a relaxed, conversational rhythm.',
          'Does it sound like recognition rather than a put-down?',
        ),
        variation(
          'Invite them to explain',
          'that',
          [2, 4],
          'You anticipated the answer and want to understand the reason.',
          'Leave a gentle lift on “that”, then pause to give them the turn.',
          'Does the ending welcome more from them?',
        ),
      ]),
    ],
  },
];

export function practiceKey(exercise: Exercise, variation: number): string {
  return `${exercise.id}/${variation}`;
}

export function sessionSteps(session: Session) {
  return session.exercises.flatMap((ex, exerciseIndex) =>
    ex.variations.map((_, variationIndex) => ({
      exerciseIndex,
      variationIndex,
      key: practiceKey(ex, variationIndex),
    })),
  );
}
