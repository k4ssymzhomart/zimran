/**
 * A lesson for every day of the plan: one idea, three sentences to say today, and one small task.
 * Days 1 to 28 follow the titles in lib/progress/plan.ts one for one; days after 28 follow its seven-day cycle.
 * The content is data and is true to the engine: days.test.ts runs every sentence through the real classifier.
 * Everything here is child-directed play: following, describing, reflecting and praising. Nothing about
 * discipline or giving commands is taught.
 */
import { codeTurn } from '../coding/classify';
import { SAFETY_NOTE } from '../coding/safety';
import { BUCKET, type Code } from '../types';

export interface DayTask {
  /** The small situation, ending with what the parent is asked to do. */
  setup: string;
  /** What Mia just said, when the answer may say her words back. */
  miaSays: string | null;
  /** The skill the answer has to land on; 'any_target' is any of the three. */
  want: 'specific_praise' | 'reflection' | 'description' | 'any_target';
  /** A gentle nudge. It starts with a verb, so it also reads after "That read as a question;". */
  hint: string;
  /** One answer that passes. */
  example: string;
}

export interface DayLesson {
  day: number;
  /** The day's one idea, in one or two plain sentences. */
  idea: string;
  /** Three sentences a parent can say today. */
  say: [string, string, string];
  /**
   * Present on days that practice saying her words back: Mia's line that each `say` sentence answers,
   * in the same order, or null where the sentence stands on its own.
   */
  afterMia?: [string | null, string | null, string | null];
  task: DayTask;
}

type Say = [string, string, string];
type AfterMia = NonNullable<DayLesson['afterMia']>;
const DESCRIBE = 'description';
const REFLECT = 'reflection';
const PRAISE = 'specific_praise';
const ANY = 'any_target';

const lesson = (idea: string, say: Say, task: DayTask, afterMia?: AfterMia): Omit<DayLesson, 'day'> =>
  afterMia ? { idea, say, afterMia, task } : { idea, say, task };
const task = (setup: string, miaSays: string | null, want: DayTask['want'], example: string, hint: string): DayTask => ({
  setup, miaSays, want, hint, example,
});

const THREE_SKILLS_HINT = 'Describe what she is doing, say her words back, or praise one exact thing.';

/** Days 1 to 28, in the order of PLAN. */
const DAYS: Omit<DayLesson, 'day'>[] = [
  // ----- week 1: Follow. Each task turns a question or an order into a statement. -----
  // 1 Follow her lead
  lesson(
    'For these five minutes she picks the game and you follow. Say what you see her doing, and save questions and directions for the rest of the day.',
    ["You're stacking the blocks.", 'You picked the red one.', "You're building it your way."],
    task(
      'Mia lines up three green blocks. Turn “What are you making?” into a statement about what you see.',
      null, DESCRIBE, "You're lining up the green blocks.",
      "Start with “You're …” and name what her hands are doing.",
    ),
  ),
  // 2 Questions into statements
  lesson(
    "Any question can become a statement: drop the question word and say what you see. “What are you drawing?” becomes “You're drawing a house.”",
    ["You're drawing a house.", 'You drew a dog next to it.', 'You picked the blue crayon.'],
    task(
      'Mia draws a yellow sun in the corner. Turn “Is that the sun?” into a statement.',
      null, DESCRIBE, "You're drawing a yellow sun.",
      "Drop the question and say what she is drawing: “You're drawing …”.",
    ),
  ),
  // 3 Curious without asking
  lesson(
    'When you are curious, describe what she is doing and then pause. She often fills in the rest on her own, and the play stays hers.',
    ["You're adding something next to the house.", "You're coloring the roof red.", 'You chose a lot of green.'],
    task(
      'Mia adds a small shape next to the house and you wonder what it is. Turn “What is that?” into a statement about what she is doing.',
      null, DESCRIBE, "You're adding something next to the house.",
      "Say what she is doing and leave the rest to her: “You're adding …”.",
    ),
  ),
  // 4 Let her choose the game
  lesson(
    'She chooses what to play and how to play it. When she switches toys, name what she chose instead of offering a better idea.',
    ['You chose the cars.', "You're making them go under the bridge.", 'You picked a new game.'],
    task(
      "Mia pushes the blocks aside and takes out the cars. Turn “Let's finish the tower first.” into a statement about what she chose.",
      null, DESCRIBE, 'You chose the cars.',
      'Name what she chose: “You chose …”.',
    ),
  ),
  // 5 Copy what she does: the wordless move, then a description
  lesson(
    'Copying her play says “I like your idea” without a word. Do what she does with your own toy, then say what she is doing.',
    ["You're rolling the block.", "You're stacking two at a time.", 'You put yours on top.'],
    task(
      'Mia rolls a block across the rug. You roll one too, without a word. Now add one sentence about what she is doing.',
      null, DESCRIBE, "You're rolling the block across the rug.",
      "Start with “You're …” and name her move.",
    ),
  ),
  // 6 Wait quietly: she whines, the parent waits, she does one calm thing, the parent praises or describes it
  lesson(
    'During minor whining, stay close and stay quiet. The moment she does one calm thing, praise it or describe it.',
    ['You picked the block back up.', "You're trying again.", 'Thank you for using a calm voice.'],
    task(
      'Mia whines and flops onto the rug. You stay close and quiet. Then she sits up and sets one block on the tower. Praise or describe that calm thing.',
      null, ANY, 'You put the block on the tower.',
      'Name the calm thing she just did: “You put …” or “Thank you for …”.',
    ),
  ),
  // 7 A minute of pure following
  lesson(
    'Try one full minute of only following: statements about what she does, no questions and no directions. It gets easier every time you do it.',
    ["You're lining up the cars.", 'You made a long row.', "You're driving the red one first."],
    task(
      'Mia tips the cars out and lines them up by color. Turn “Put the red ones together.” into a statement about what she is doing.',
      null, DESCRIBE, "You're lining up the cars by color.",
      "Say what she is already doing: “You're lining up …”.",
    ),
  ),

  // ----- week 2: Describe -----
  // 8 Be her sportscaster
  lesson(
    'Describe her play like a sportscaster calling a game: what she is doing, as she does it. It tells her you are watching, and she stays in charge.',
    ["You're stacking the blocks.", "You're putting the blue one on top.", 'You built a tall tower.'],
    task(
      'Mia sets a red block on top of her tower. Call the play: say what she is doing.',
      null, DESCRIBE, "You're putting the red block on top.",
      "Start with “You're …” and name what she is doing right now.",
    ),
  ),
  // 9 Describe her hands
  lesson(
    "Watch her hands, not the toy. “That's a tower” is about the toy, and “You're stacking the blocks” is about her.",
    ["You're holding the crayon.", "You're pressing the lid down.", 'You turned the page.'],
    task(
      'Mia holds a block in both hands and sets it down slowly. Say what her hands are doing.',
      null, DESCRIBE, "You're setting the block down slowly.",
      "Start with “You're …” and name what her hands are doing.",
    ),
  ),
  // 10 Start with "You are"
  lesson(
    'Two words start almost every description: “You are.” Add what she is doing right now and the sentence is done.',
    ['You are drawing a circle.', 'You are coloring it green.', 'You are making a long line.'],
    task(
      'Mia draws a long green line across the page. Start with “You are” and finish the sentence.',
      null, DESCRIBE, 'You are drawing a long green line.',
      'Start with “You are” and add what she is drawing.',
    ),
  ),
  // 11 Describe the calm moments
  lesson(
    'Quiet, steady play is easy to miss. Describe it while it lasts, so the calm moments get your attention too.',
    ["You're coloring slowly inside the circle.", "You're sitting and building.", "You're working on the roof."],
    task(
      'Mia sits and colors slowly inside the circle, humming. Describe this calm moment.',
      null, DESCRIBE, "You're coloring inside the circle.",
      "Say what she is doing while it is calm: “You're coloring …”.",
    ),
  ),
  // 12 Describe when things wobble
  lesson(
    'When the tower falls, there is nothing to fix and nothing to explain. Describe what she does next, in your everyday voice.',
    ["You're picking the blocks up.", "You're starting again.", 'You put the big one on the bottom.'],
    task(
      'The tower falls. Mia frowns, then picks up two blocks and starts over. Describe what she is doing now.',
      null, DESCRIBE, "You're starting the tower again.",
      "Leave the fall alone and say what she is doing now: “You're …”.",
    ),
  ),
  // 13 Descriptions back to back
  lesson(
    'Two descriptions in a row tell her you are staying with her. Describe one thing, wait a beat, then describe the next.',
    ["You're drawing a house.", "You're adding a red door.", 'You drew a window on top.'],
    task(
      'Mia draws a house, then adds a red door. Type two descriptions, one for each thing.',
      null, DESCRIBE, "You're drawing a house. You're adding a red door.",
      "Write one “You're …” sentence for each thing she does.",
    ),
  ),
  // 14 Ten descriptions
  lesson(
    'The clinic pace is ten descriptions in five minutes, about one every thirty seconds. Short ones count: “You picked blue” is a full description.',
    ['You picked blue.', "You're pouring the juice.", 'You set the cup down.'],
    task(
      'Mia pours pretend juice into two cups. Say one short description.',
      null, DESCRIBE, "You're pouring the juice.",
      "Keep it short: “You're pouring …”.",
    ),
  ),

  // ----- week 3: Reflect -----
  // 15 Say her words back
  lesson(
    'When she speaks, say her words back. She says “I made a tower!” and you say “You made a tower!” so she hears that you listened.',
    ['You made a tower!', 'The dog is hungry.', "It's a train."],
    task(
      'Mia holds up her paper and says: “I drew a cat!” Say her words back.',
      'I drew a cat!', REFLECT, 'You drew a cat!',
      'Use her own words: “You drew …”.',
    ),
    ['I made a tower!', 'The dog is hungry.', 'It is a train.'],
  ),
  // 16 Reflect a single word
  lesson(
    'One word is enough to reflect. She says “Boom!” and you say “Boom!” back, and she knows you heard it.',
    ['Boom!', 'A train!', 'The sun.'],
    task(
      'Mia points at her drawing and says: “Rainbow!” Reflect that one word.',
      'Rainbow!', REFLECT, 'A rainbow!',
      'Say her one word back: “A …”.',
    ),
    ['Boom!', 'Train!', 'Sun.'],
  ),
  // 17 Reflect and add a little
  lesson(
    "Say her words back and add one small word of your own. “It is a train” becomes “It's a long train” and her idea stays in front.",
    ["It's a long train.", "That's the green grass.", 'The sun is very hot.'],
    task(
      'Mia lines up three green blocks and says: “It is a train.” Say it back and add one small word.',
      'It is a train.', REFLECT, "It's a long train.",
      "Keep her words and add one of yours: “It's a … train.”",
    ),
    ['It is a train.', 'This is the grass.', 'The sun is hot.'],
  ),
  // 18 Reflect big feelings: she says "This is too hard!", the parent says it back
  lesson(
    'When she is upset, her words still deserve to be heard. She says “This is too hard!” and you say “This is too hard.” with no fixing and no pep talk.',
    ['This is too hard.', 'It keeps falling.', 'Your juice is all gone.'],
    task(
      'Mia drops her block, crosses her arms and says: “This is too hard!” Say her words back.',
      'This is too hard!', REFLECT, 'This is too hard.',
      'Use her words in a calm voice: “This is too …”.',
    ),
    ['This is too hard!', 'It keeps falling!', 'My juice is all gone.'],
  ),
  // 19 Reflect, no question mark
  lesson(
    'A reflection ends with your voice going down. “You made a tower?” asks her to answer, and “You made a tower.” tells her you heard.',
    ['You made a tower.', 'That is your house.', 'The cars go under there.'],
    task(
      'Mia sets a block on top and says: “I made a tower!” Reflect it as a statement, with a period at the end.',
      'I made a tower!', REFLECT, 'You made a tower.',
      'End with a period, not a question mark: “You made a tower.”',
    ),
    ['I made a tower!', 'This is our house.', 'The cars go under here.'],
  ),
  // 20 Reflect, then describe
  lesson(
    'Pair two skills: say her words back, then describe what she does next. She is heard and watched in the same breath.',
    ['The dog is hungry.', "You're drawing a bowl for him.", 'You gave the dog some food.'],
    task(
      'Mia adds a dog to her picture and says: “The dog is hungry.” Then she draws a bowl. Say her words back, then describe what she is doing.',
      'The dog is hungry.', REFLECT, "The dog is hungry. You're drawing a bowl.",
      "Say her words first, then add “You're drawing …”.",
    ),
    ['The dog is hungry.', null, null],
  ),
  // 21 Ten reflections
  lesson(
    'The clinic pace is ten reflections in five minutes. Each time she speaks is a chance, so say it back before anything else.',
    ["You're making soup.", 'The tea is hot.', 'Carrots go in the soup.'],
    task(
      "Mia stirs the pot and says: “I'm making soup.” Say her words back.",
      "I'm making soup.", REFLECT, "You're making soup.",
      "Turn her “I'm” into “You're”: “You're making …”.",
    ),
    ["I'm making soup.", 'The tea is hot.', 'Carrots go in the soup.'],
  ),

  // ----- week 4: Praise -----
  // 22 Name what you liked
  lesson(
    '“Good job” is warm, but she cannot tell what earned it. Add the what, as in “Good job stacking so gently” and she knows what to do again.',
    ['Good job stacking so gently.', 'I like how you lined up the cars.', 'Thank you for putting the blocks back.'],
    task(
      'Mia sets a block on the tower very gently. Turn “Good job!” into praise that names what you liked.',
      null, PRAISE, 'Good job stacking so gently.',
      'Add what you liked: “Good job stacking …”.',
    ),
  ),
  // 23 Praise gentle hands
  lesson(
    'Praise the behavior you want more of, the moment you see it. Gentle hands are a good first pick: “I love how gently you set that down.”',
    ['I love how gently you set that down.', 'Nice job holding the crayon so carefully.', 'Thank you for being gentle with the doll.'],
    task(
      'Mia lays the doll in the bin very gently. Praise her gentle hands.',
      null, PRAISE, 'I love how gently you laid the doll down.',
      'Start with “I love how gently you …”.',
    ),
  ),
  // 24 Praise sharing
  lesson(
    'When she hands you something, that is sharing. Catch it right then and name it: “Thank you for sharing the orange crayon.”',
    ['Thank you for sharing the orange crayon.', 'I like how you gave me a turn.', 'Great job sharing your blocks with me.'],
    task(
      'Mia slides the orange crayon over to you. Praise the sharing.',
      null, PRAISE, 'Thank you for sharing the orange crayon.',
      'Name the sharing: “Thank you for sharing …”.',
    ),
  ),
  // 25 Praise waiting
  lesson(
    'Waiting is hard work for a four-year-old. When she waits even a few seconds, name it: “Nice job waiting for your turn.”',
    ['Nice job waiting for your turn.', 'I like how patiently you waited.', 'Thank you for waiting while I finished.'],
    task(
      'Mia holds her crayon up and waits for you to finish. Praise the waiting.',
      null, PRAISE, 'Nice job waiting for your turn.',
      'Name the waiting: “Nice job waiting …”.',
    ),
  ),
  // 26 Praise the opposite
  lesson(
    'Think of the thing that wears you out, then watch for its opposite. If it is banging blocks, praise gentle stacking the moment you see it.',
    ["I love how gently you're stacking now.", 'Thank you for using your quiet voice.', 'Great job keeping the crayons on the paper.'],
    task(
      'Mia was banging blocks a minute ago. Now she sets one down softly. Let the banging pass and praise the opposite.',
      null, PRAISE, 'I love how gently you set that block down.',
      'Praise the gentle part: “I love how gently you …”.',
    ),
  ),
  // 27 Dress rehearsal
  lesson(
    'Today all three skills share the five minutes: describe what she does, say her words back, praise one exact thing. Tomorrow is the skill check.',
    ["You're building a bridge.", 'The cars go under the bridge.', 'I love how carefully you built that.'],
    task(
      'Mia builds a little bridge and says: “The cars go under here.” Use any one of the three skills.',
      'The cars go under here.', ANY, 'The cars go under the bridge.',
      THREE_SKILLS_HINT,
    ),
    [null, 'The cars go under here.', null],
  ),
  // 28 Skill check
  lesson(
    'A full five minutes against the clinic pace: ten of each skill, and three or fewer questions, commands and corrections. It is a snapshot, not a grade.',
    ["You're drawing a house.", "That's our house.", 'Great job coloring inside the line.'],
    task(
      'Mia draws a small house with a red door and says: “This is our house.” Answer with any of the three skills.',
      'This is our house.', ANY, "You're drawing a house with a red door.",
      THREE_SKILLS_HINT,
    ),
    [null, 'This is our house.', null],
  ),
];

/** The seven days after day 28, repeated, in the order of the cycle in plan.ts. The same skills, harder places. */
const CYCLE: Omit<DayLesson, 'day'>[] = [
  // Hard moment: clean-up time
  lesson(
    'Clean-up is where directions pile up. Mia puts toys away slowly and her own way today, so follow anyway: describe each toy she puts away and praise it.',
    ["You're putting the cars in the bin.", 'Thank you for putting the books away.', 'You carried the bear to the shelf.'],
    task(
      'Toys cover the rug. Mia drops one car in the bin, slowly. Turn “Hurry up and get the rest.” into a description or a praise.',
      null, ANY, 'You put the car in the bin.',
      'Name the one thing she did: “You put …” or “Thank you for putting …”.',
    ),
  ),
  // Live: five minutes with your child
  lesson(
    'Today is five minutes with your own child, their choice of toy. Describe what their hands do and praise one exact thing; reflections are not counted live.',
    ["You're building a tall tower.", 'You picked the green one.', "I love how carefully you're stacking."],
    task(
      'Your child picks a toy and starts to play. Type one thing you could say in the first ten seconds.',
      null, ANY, 'You picked the blocks.',
      "Say what your child is doing: “You picked …” or “You're …”.",
    ),
  ),
  // Mixed skills: one of each, twice
  lesson(
    "Today's set is one description, one reflection and one specific praise, then the same three again. Mixing them keeps the five minutes sounding like you.",
    ["You're stirring the soup.", 'The tea is hot.', 'Thank you for pouring me a cup.'],
    task(
      'Mia carries a cup to the table and says: “The tea is hot.” Answer with any one of the three skills.',
      'The tea is hot.', ANY, 'The tea is hot.',
      THREE_SKILLS_HINT,
    ),
    [null, 'The tea is hot.', null],
  ),
  // Hard moment: she says no
  lesson(
    'When she says no during play, there is nothing to win. Let it pass, stay close, and praise or describe the next calm thing she does.',
    ["You're holding your bear.", 'You put one car in the bin.', 'Thank you for helping with the cars.'],
    task(
      'Mia hugs her bear and says “No!” to the toy bin. You wait, close and quiet. Then she drops one car in. Praise or describe that.',
      null, ANY, 'Thank you for putting the car in the bin.',
      'Leave the “No!” alone and name what she did next: “Thank you for putting …”.',
    ),
  ),
  // Live: praise the opposite
  lesson(
    'With your own child today, pick one thing that wears you out and watch for its opposite. The moment it shows up, name it out loud.',
    ['Thank you for using a quiet voice.', "I love how gently you're playing.", 'Great job keeping the blocks on the rug.'],
    task(
      'Your child has been grabbing toys. Now they hand one to you. Praise the opposite.',
      null, PRAISE, 'Thank you for handing me the car.',
      'Name what you liked: “Thank you for handing …”.',
    ),
  ),
  // Your weak spot
  lesson(
    'Today goes to the skill your own numbers show furthest from the pace. One skill for five minutes, and nothing else to think about.',
    ["You're drawing a long line.", "That's the grass.", 'I like how you shared the crayon.'],
    task(
      'Mia draws a long green line and says: “This is the grass.” Answer with the skill you want to practice today.',
      'This is the grass.', ANY, "That's the grass.",
      THREE_SKILLS_HINT,
    ),
    [null, 'This is the grass.', null],
  ),
  // Weekly skill check
  lesson(
    'Once a week, a full five minutes against the clinic pace: ten of each skill, three or fewer questions, commands and corrections. Compare it with last week, not with perfect.',
    ["You're stacking them one by one.", 'It is wobbly.', 'Nice job waiting for the tower.'],
    task(
      'Mia waits while the tower stops wobbling and says: “It is wobbly.” Answer with any of the three skills.',
      'It is wobbly.', ANY, 'It is wobbly.',
      THREE_SKILLS_HINT,
    ),
    [null, 'It is wobbly.', null],
  ),
];

const LAST_DAY = DAYS.length;

/** The lesson for a plan day. Before day 1 is day 1; after day 28 the seven-day cycle repeats, like planDay. */
export function dayLesson(day: number): DayLesson {
  const n = Number.isFinite(day) ? Math.max(1, Math.floor(day)) : 1;
  const content = n <= LAST_DAY ? DAYS[n - 1] : CYCLE[(n - LAST_DAY - 1) % CYCLE.length];
  // Copies, so a screen that edits its lesson cannot change the content for the next one.
  return {
    day: n,
    idea: content.idea,
    say: [...content.say],
    ...(content.afterMia ? { afterMia: [...content.afterMia] } : {}),
    task: { ...content.task },
  };
}

/** What the answer was read as, for the reply to an answer that is not there yet. */
const HEARD: Record<Code, string> = {
  question: 'That read as a question',
  command: 'That read as a command',
  criticism: 'That read as a correction',
  general_praise: 'That read as general praise',
  neutral: 'That read as neutral talk',
  specific_praise: 'That read as specific praise',
  reflection: 'That read as a reflection',
  description: 'That read as a description',
  unknown: 'That one could not be read',
};

const PASSED: Partial<Record<Code, string>> = {
  description: 'That is a description: she keeps the lead and knows you are watching.',
  reflection: 'That is a reflection: she hears that you listened.',
  specific_praise: 'That is specific praise: she knows exactly what you liked.',
};

const lowerFirst = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);

/**
 * Check a typed answer to the day's task. Every sentence is coded with Mia's line as what she last said.
 * It passes when one sentence lands on the wanted skill and none is a question, command or correction:
 * a good sentence followed by "What is it?" is not there yet. `code` is what the reply talks about:
 * the to-swap sentence if there is one, else the sentence that passed, else the first one that was read.
 * The reply is one calm sentence; on a miss it names what was heard and goes on with the task's hint.
 */
export function checkDayTask(day: number, answer: string): { ok: boolean; code: Code; feedback: string } {
  const { task: asked } = dayLesson(day);
  const coded = codeTurn(answer, { childLastSaid: asked.miaSays });
  // Not play talk: no code and no hint about it, only where support is.
  if (coded.some((s) => s.rule === 'safety')) return { ok: false, code: 'unknown', feedback: SAFETY_NOTE.body };

  const swap = coded.find((s) => BUCKET[s.code] === 'avoid');
  const hit = coded.find((s) => (asked.want === ANY ? BUCKET[s.code] === 'target' : s.code === asked.want));
  if (!swap && hit) return { ok: true, code: hit.code, feedback: PASSED[hit.code] ?? '' };
  const code = (swap ?? coded.find((s) => s.code !== 'unknown'))?.code ?? 'unknown';
  return { ok: false, code, feedback: `${HEARD[code]}; ${lowerFirst(asked.hint)}` };
}
