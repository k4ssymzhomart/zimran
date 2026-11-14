/**
 * The thirty-second lesson between round 1 and round 2: one idea, a few worked examples, two tries.
 * The content is data and is true to the engine: lesson.test.ts runs every example, model answer and
 * "instead of" sentence through the real classifier.
 */
import { codeTurn } from '../coding/classify';
import type { Code, CodedSentence, Lever } from '../types';

export interface LessonTask {
  id: string;
  /** What Mia is doing, one short sentence. */
  situation: string;
  /** What she just said, when the task is about reflecting. */
  childSaid: string | null;
  /** The sentence most parents would say. */
  insteadOf: string;
  /** Codes that count as a good answer. */
  accept: Code[];
  /** One good answer, shown after two tries. */
  modelAnswer: string;
  /** Gentle nudge when the answer is not there yet. */
  hint: string;
}

export interface LessonPair {
  insteadOf: string;
  say: string;
  /** What Mia said just before; present only where the example is a reflection. */
  childSaid?: string;
}

export interface Lesson {
  lever: Lever;
  title: string;
  /** One sentence on what this skill does for the child. */
  why: string;
  pairs: LessonPair[];
  /** Exactly two. */
  tasks: LessonTask[];
}

interface LessonContent {
  title: string;
  why: string;
  pairs: LessonPair[];
  accept: Code[];
  /** [situation, childSaid, insteadOf, modelAnswer, hint] */
  tasks: [string, string | null, string, string, string][];
}

const CONTENT: Record<Lever, LessonContent> = {
  question: {
    title: 'Turn the question into a statement',
    why: 'A question asks her to stop and answer you; a statement lets her keep leading the play.',
    pairs: [
      { insteadOf: 'What are you building?', say: "You're building a tall tower." },
      { insteadOf: 'Is that a dog?', say: 'You drew a dog next to the house.' },
      { insteadOf: 'What color is that?', say: 'You picked the blue block.' },
    ],
    accept: ['description', 'reflection'],
    tasks: [
      [
        'Mia stacks a red block on the tower.',
        null,
        'What are you making?',
        "You're stacking the red block on the tower.",
        'Say what you see her hands doing, starting with “You\'re …”.',
      ],
      [
        'Mia draws a yellow sun in the corner.',
        'The sun is hot.',
        'Is that the sun?',
        'The sun is hot.',
        'Say her words back, or say what she is drawing: “You\'re drawing …”.',
      ],
      [
        'Mia lines up three green blocks in a row.',
        null,
        'How many blocks do you have?',
        'You lined up three green blocks.',
        'Say what she did with the blocks: “You lined up …”.',
      ],
      [
        'Mia draws a small house with a red door.',
        'This is our house.',
        'Who lives in that house?',
        "You're drawing a house with a red door.",
        'Say what you see on the page, starting with “You\'re drawing …”.',
      ],
    ],
  },

  command: {
    title: 'Let her lead',
    why: 'Describing what she chose keeps her in charge of the play.',
    pairs: [
      { insteadOf: 'Put the blue one on top.', say: 'You chose the red block.' },
      { insteadOf: "Let's draw a house.", say: "You're drawing a long green line." },
      { insteadOf: 'Can you make it taller?', say: "You're building a bridge." },
    ],
    accept: ['description'],
    tasks: [
      [
        'Mia lines up three green blocks in a row.',
        null,
        'Stack them up instead.',
        "You're lining up the green blocks.",
        'Say what she chose to do, starting with “You\'re …”.',
      ],
      [
        'Mia draws a long green line across the page.',
        null,
        'Draw a sun up here.',
        'You drew a long green line.',
        'Say what she chose to draw: “You drew …”.',
      ],
      [
        'Mia balances a small block on a big one.',
        null,
        'Try the big one first.',
        'You balanced the small block on the big one.',
        'Say what she did with the blocks, starting with “You …”.',
      ],
      [
        'Mia adds a dog next to the house.',
        null,
        "Let's color the house now.",
        'You added a dog next to the house.',
        'Say what she added to her picture: “You added …”.',
      ],
    ],
  },

  criticism: {
    title: 'Praise the opposite',
    why: 'Let the small thing pass, and praise the opposite the moment you see it.',
    pairs: [
      { insteadOf: 'Stop banging the blocks.', say: 'I love how gently you put that block down.' },
      { insteadOf: "That's not how you hold a crayon.", say: 'Nice job coloring so carefully.' },
      { insteadOf: "You're being too rough.", say: 'Thank you for handing me the block so gently.' },
    ],
    accept: ['specific_praise'],
    tasks: [
      [
        'After knocking the tower over, Mia sets a block down very gently.',
        null,
        "Don't knock it over again.",
        'I love how gently you set that block down.',
        'Let the crash pass and praise the gentle hands: “I love how gently you …”.',
      ],
      [
        'After scribbling over the picture, Mia colors slowly inside the circle.',
        null,
        "That's too messy.",
        'Great job coloring inside the line.',
        'Let the scribble pass and praise the careful coloring: “Great job coloring …”.',
      ],
      [
        'After snapping a crayon, Mia puts the crayons back in the box.',
        null,
        'No, crayons are not for breaking.',
        'Thank you for putting the crayons back in the box.',
        'Let the broken crayon pass and praise the tidying: “Thank you for putting …”.',
      ],
      [
        'After banging two blocks together, Mia waits while the tower stops wobbling.',
        null,
        'Stop banging, it is too loud.',
        'Nice waiting so patiently for the tower.',
        'Let the noise pass and praise the waiting: “Nice waiting so …”.',
      ],
    ],
  },

  specific_praise: {
    title: 'Say exactly what you liked',
    why: 'Naming exactly what you liked tells her what you were pleased about.',
    pairs: [
      { insteadOf: 'Good job!', say: 'Good job stacking so gently.' },
      { insteadOf: 'Nice!', say: 'I like how you shared the orange crayon.' },
      { insteadOf: "That's great.", say: 'Thank you for putting the blocks back in the box.' },
    ],
    accept: ['specific_praise'],
    tasks: [
      [
        'Mia hands you a yellow block.',
        null,
        'Good job!',
        'Thank you for sharing your block with me.',
        'Add what exactly you liked: “Thank you for sharing …”.',
      ],
      [
        'Mia colors slowly inside the circle.',
        null,
        "That's beautiful.",
        "I love how carefully you're coloring inside the circle.",
        'Add what exactly you liked: “I love how carefully you …”.',
      ],
      [
        'Mia puts the spare blocks back in the box.',
        null,
        'Nice work.',
        'Great job putting the blocks back in the box.',
        'Add what exactly you liked: “Great job putting …”.',
      ],
      [
        'Mia holds her crayon up and waits for you to finish.',
        null,
        'Good girl.',
        'I like how patiently you waited for your turn.',
        'Add what exactly you liked: “I like how patiently you …”.',
      ],
    ],
  },

  reflection: {
    title: 'Say her words back',
    why: 'Saying her words back tells her you are listening.',
    pairs: [
      { childSaid: 'I made a tower!', insteadOf: 'Uh-huh.', say: 'You made a tower!' },
      { childSaid: 'The dog is hungry.', insteadOf: 'Okay.', say: 'The dog is hungry.' },
      { childSaid: 'It is a train.', insteadOf: 'I see.', say: "It's a train." },
    ],
    accept: ['reflection'],
    tasks: [
      [
        'Mia builds a little bridge between two towers.',
        'The cars go under here.',
        'Mm-hm.',
        'The cars go under the bridge.',
        'Say her words back, almost the same: “The cars go under …”.',
      ],
      [
        'Mia draws a long green line across the page.',
        'This is the grass.',
        'Okay.',
        "That's the grass.",
        'Say her words back, almost the same: “That\'s the …”.',
      ],
      [
        'Mia waits while the tower stops wobbling.',
        'It is wobbly.',
        'I see.',
        'The tower is wobbly.',
        'Say her words back, almost the same: “The tower is …”.',
      ],
      [
        'Mia puts the crayons back in the box, tips up.',
        'They go to bed.',
        'Uh-huh.',
        'The crayons go to bed.',
        'Say her words back, almost the same: “The crayons go …”.',
      ],
    ],
  },

  description: {
    title: 'Describe what she is doing',
    why: 'Describing her play shows her you are interested in what she chose.',
    pairs: [
      { insteadOf: "That's a tower.", say: "You're stacking the blocks." },
      { insteadOf: 'The sun is yellow.', say: 'You drew a yellow sun.' },
      { insteadOf: 'Blocks are fun.', say: 'You put the red block on top.' },
    ],
    accept: ['description'],
    tasks: [
      [
        'Mia stacks a red block on the tower.',
        null,
        'That tower is tall.',
        "You're putting the red block on top.",
        'Start with “You\'re …” and name what her hands are doing.',
      ],
      [
        'Mia draws a yellow sun in the corner.',
        null,
        'The sun is yellow.',
        "You're drawing a yellow sun in the corner.",
        'Start with “You\'re drawing …” and name what appears on the page.',
      ],
      [
        'Mia builds a little bridge between two towers.',
        null,
        'I see a bridge.',
        'You built a bridge between the towers.',
        'Start with “You built …” and name what she made.',
      ],
      [
        'Mia colors slowly inside the circle.',
        null,
        'Circles are round.',
        "You're coloring inside the circle.",
        'Start with “You\'re coloring …” and name where.',
      ],
    ],
  },
};

/** Every candidate task for a lever, in a fixed order. lessonFor picks two of these. */
export function candidateTasks(lever: Lever): LessonTask[] {
  const { accept, tasks } = CONTENT[lever];
  return tasks.map(([situation, childSaid, insteadOf, modelAnswer, hint], i) => ({
    id: `${lever}-${i + 1}`,
    situation,
    childSaid,
    insteadOf,
    accept: [...accept],
    modelAnswer,
    hint,
  }));
}

/** Same lever and seed give the same lesson. The two tasks are always different. */
export function lessonFor(lever: Lever, seed = 1): Lesson {
  const { title, why, pairs } = CONTENT[lever];
  const all = candidateTasks(lever);
  const n = Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) : 1;
  const first = n % all.length;
  // Step 1..length-1 from the first, so the second can never land on it.
  const second = (first + 1 + (Math.floor(n / all.length) % (all.length - 1))) % all.length;
  // Copies, so a screen that edits its lesson cannot change the content for the next one.
  return { lever, title, why, pairs: pairs.map((p) => ({ ...p })), tasks: [all[first], all[second]] };
}

const WELL_DONE: Partial<Record<Code, string>> = {
  description: 'You named exactly what she is doing, so she keeps leading the play.',
  reflection: 'You said her own words back, so she knows you heard her.',
  specific_praise: 'You told her exactly what you liked, so she knows what to do again.',
};

const STILL: Partial<Record<Code, string>> = {
  question: 'That one is still a question.',
  command: 'That one is still a command.',
  criticism: 'That one still points at the thing to let pass.',
};

/** Good when at least one sentence has an accepted code and none of them is a question, command or criticism. */
export function checkAnswer(
  task: LessonTask,
  answer: string,
): { ok: boolean; coded: CodedSentence[]; feedback: string } {
  const coded = codeTurn(answer, { childLastSaid: task.childSaid });
  const avoid = coded.find((s) => s.bucket === 'avoid');
  const hit = coded.find((s) => task.accept.includes(s.code));

  if (avoid) return { ok: false, coded, feedback: `${STILL[avoid.code]} ${task.hint}` };
  if (!hit) return { ok: false, coded, feedback: task.hint };
  return { ok: true, coded, feedback: WELL_DONE[hit.code] ?? 'That is the skill, right there.' };
}
