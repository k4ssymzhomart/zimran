import { describe, expect, it } from 'vitest';
import type { Bucket, Code } from '../types';
import { codeSentence, codeTurn } from './classify';
import { isSafetyConcern } from './safety';
import { isBaseVerb, isEnglishWord, isPlayWord, VOCABULARY } from './vocabulary';

/**
 * The seven tables a break-it tester and a judge left after scoring the build.
 * Each row is one sentence a parent may type or say; the tables are kept here word for word.
 */

const code = (text: string, childLastSaid: string | null = null): Code => codeSentence(text, { childLastSaid }).code;
const bucket = (text: string): Bucket => codeSentence(text).bucket;
const codes = (turn: string): Code[] => codeTurn(turn).map((c) => c.code);

describe('table 1: hostile talk is always criticism, whatever frame it comes in', () => {
  const HOSTILE = [
    "You're wasting my time",
    "You're making me angry",
    "You're getting on my nerves",
    "You're acting like a baby",
    'You are giving me a headache.',
    'You are whining again.',
    'You are crying like a baby.',
    'I love how you ruin everything.',
    'Great job being a pain.',
    'Nice mess.',
    'I love that you are so clumsy.',
    'nice going genius',
    'cute but useless',
    'I like when you shut your mouth',
    'you suck',
    'you are useless',
    'you are pathetic',
    'what a loser',
    'you are such a baby',
    'you are being a jerk',
    'i am sick of you',
    'You always make a mess',
    'Now shut up.',
    "You're driving me crazy",
    'You are so slow',
    "You're being difficult",
    "That's a dumb idea",
  ];
  it.each(HOSTILE)('criticism: %s', (text) => {
    expect(codeSentence(text)).toMatchObject({ code: 'criticism', bucket: 'avoid' });
    // The same words in a pasted turn or a spoken run-on stay in the tray.
    expect(codes(text)).toContain('criticism');
  });

  const KEEP: [string, Code][] = [
    ["You're cleaning up the mess.", 'description'],
    ["You're making a cake.", 'description'],
    ["You're being so gentle.", 'specific_praise'],
    ['I love how gently you stack.', 'specific_praise'],
    ["You're stacking the blocks.", 'description'],
    ['Good job stacking so gently.', 'specific_praise'],
    ['Nice tower.', 'specific_praise'],
    ['Good job!', 'general_praise'],
    ['Thank you for sharing.', 'specific_praise'],
    ['Not bad!', 'general_praise'],
    ["That's a lot of blocks.", 'neutral'],
  ];
  it.each(KEEP)('guard: %s -> %s', (text, expected) => {
    expect(code(text)).toBe(expected);
  });
  it('guard: "This is too much fun!" is not a criticism', () => {
    expect(code('This is too much fun!')).not.toBe('criticism');
  });
  it('guard: "You\'re not giving up." fills a ring', () => {
    expect(bucket("You're not giving up.")).toBe('target');
  });
});

describe('table 2: an order or a prohibition anywhere in the sentence wins over praise and description', () => {
  const ORDERS = [
    'Great job stacking now give me the red one',
    'Nice stacking put it on top',
    'I love how you stack so hurry up',
    'Thank you for sharing but you need to be quiet',
    'I like it when you listen to me and stop whining',
    'You are stacking the blocks so stop it',
    'You are stacking the blocks and you should stop now',
    'You made a tower, put it away',
    'good job put it here',
    'I think you should use the red',
    'Maybe put that one there',
  ];
  it.each(ORDERS)('command: %s', (text) => {
    expect(code(text)).toBe('command');
    // codeTurn may split a run-on, but the order is never lost and never turns into a filled ring alone.
    expect(codes(text)).toContain('command');
  });

  const TRAY = ['If you throw that again we are done', "We don't throw toys", 'Toys are not for throwing'];
  it.each(TRAY)('bucket avoid: %s', (text) => {
    expect(bucket(text)).toBe('avoid');
    expect(codeTurn(text).map((c) => c.bucket)).toEqual(['avoid']);
  });

  const KEEP: [string, Code][] = [
    ['I love how you put it on top.', 'specific_praise'],
    ["You're trying to put it on top.", 'description'],
    ['You picked it up, put it on top.', 'description'],
    ['You put the red one on top.', 'description'],
    ['Play time is fun', 'neutral'],
    ['Look at you go!', 'general_praise'],
    ["You're going to put it there.", 'neutral'],
  ];
  it.each(KEEP)('guard, not a command: %s -> %s', (text, expected) => {
    expect(code(text)).toBe(expected);
    expect(codes(text)).toEqual([expected]);
  });
  it('guard: "Wait, you made a bridge!" fills a ring', () => {
    expect(bucket('Wait, you made a bridge!')).toBe('target');
  });
  it('guard: "Go Mia go!" is cheering, bucket neutral', () => {
    expect(bucket('Go Mia go!')).toBe('neutral');
  });
});

describe('table 3: sentences the 28-day plan itself teaches must count', () => {
  const SAID_BACK: [string, string, Code][] = [
    ['A tower!', 'I made a tower!', 'reflection'],
    ['Tower!', 'I made a tower!', 'reflection'],
    ['You made a tower!', 'I made a tower!', 'reflection'],
    ['look it stays', 'Look, it stays!', 'reflection'],
    ['It stays!', 'Look, it stays!', 'reflection'],
    // Her bare "No!" said back is never a criticism and never a reflection.
    ['No!', 'No!', 'neutral'],
  ];
  it.each(SAID_BACK)('%s after she said "%s" -> %s', (text, child, expected) => {
    expect(code(text, child)).toBe(expected);
    expect(codeTurn(text, { childLastSaid: child }).map((c) => c.code)).toEqual([expected]);
  });

  it('"You waited so patiently." is specific praise that names patience', () => {
    expect(codeSentence('You waited so patiently.')).toMatchObject({ code: 'specific_praise', namedBehavior: 'patient' });
  });

  const NO_CONTEXT: [string, Code][] = [
    ['I noticed you waited.', 'description'],
    ['You worked so hard on that.', 'specific_praise'],
    ['You stopped and waited.', 'description'],
    ['Thank you for using your calm voice.', 'specific_praise'],
  ];
  it.each(NO_CONTEXT)('%s -> %s', (text, expected) => {
    expect(code(text)).toBe(expected);
  });

  it.each(['You kept trying.', "You're using your calm voice."])('fills a ring: %s', (text) => {
    expect(bucket(text)).toBe('target');
  });
});

describe('table 4: made-up words do not fill a ring', () => {
  const MADE_UP: [string, Code, string][] = [
    ['you are blahing xx', 'neutral', 'unclear_action'],
    ['you are zzzzing', 'neutral', 'unclear_action'],
    ["You're blahing the foo", 'neutral', 'unclear_action'],
    ['nice yy', 'general_praise', 'unclear_praise'],
    ['good x', 'general_praise', 'unclear_praise'],
    ['Good xyzzy', 'general_praise', 'unclear_praise'],
  ];
  it.each(MADE_UP)('%s -> %s (%s)', (text, expected, rule) => {
    expect(codeSentence(text)).toMatchObject({ code: expected, rule });
  });
  it('"i like blah" stays in the neutral bucket', () => {
    expect(bucket('i like blah')).toBe('neutral');
  });
  it('"I like orange" is a preference, not praise of her', () => {
    expect(code('I like orange')).toBe('neutral');
  });

  const KEEP: [string, Code][] = [
    ["You're balancing the block.", 'description'],
    // unknown verb, known play thing
    ["You're wiggling the car.", 'description'],
    ["You're concentrating.", 'description'],
    ['Nice zooming.', 'specific_praise'],
    ['I like your tower.', 'specific_praise'],
    ['I love the colors you picked.', 'specific_praise'],
    ["You're humming.", 'description'],
    ['You are thinking hard.', 'description'],
  ];
  it.each(KEEP)('guard: %s -> %s', (text, expected) => {
    const coded = codeSentence(text);
    expect(coded.code).toBe(expected);
    expect(coded.rule.startsWith('unclear_')).toBe(false);
  });

  it('a verb the vocabulary does not have still counts next to a known play thing', () => {
    expect(isPlayWord('quibbling')).toBe(false);
    expect(code("You're quibbling the car.")).toBe('description');
    expect(codeSentence("You're quibbling the foo.").rule).toBe('unclear_action');
  });
});

describe('table 5: other languages typed in Latin letters are not coded', () => {
  it.each(['muy bien', 'du baust einen turm', 'ty molodec', 'tu es super'])('unknown: %s', (text) => {
    expect(codeSentence(text)).toMatchObject({ code: 'unknown', bucket: 'none', rule: 'no_english_words' });
  });

  it.each(['Zoom zoom!', 'Vroom!'])('guard, play sounds are coded: %s', (text) => {
    expect(code(text)).not.toBe('unknown');
  });
  it('guard: an unknown name inside English is fine', () => {
    expect(code('Aiden, nice stacking.')).toBe('specific_praise');
  });
  it('guard: one unknown word alone is a name', () => {
    expect(code('Aiden!')).toBe('neutral');
  });
  it('guard: the English part of a mixed sentence is coded', () => {
    expect(code('хорошо you are stacking')).toBe('description');
  });
});

describe('table 6: the support filter', () => {
  const CAUGHT = ['I am going to beat you', 'I could strangle you', 'mommy is going to hurt you', 'i will whoop you', 'do you want me to spank you'];
  it.each(CAUGHT)('caught: %s', (text) => {
    expect(isSafetyConcern(text)).toBe(true);
    expect(codeSentence(text)).toMatchObject({ code: 'unknown', bucket: 'none', rule: 'safety' });
  });

  const QUIET = [
    'did I hurt you?',
    'Did that hurt?',
    'You hurt your knee.',
    'I hit you with the pillow haha',
    "I'm going to get you!",
    "I'm going to tickle you",
    'The dragon is going to kill you!',
  ];
  it.each(QUIET)('quiet: %s', (text) => {
    expect(isSafetyConcern(text)).toBe(false);
    expect(codeSentence(text).rule).not.toBe('safety');
  });
});

describe('table 7: run-ons are split at clause starts', () => {
  it('three descriptions said in one breath are three descriptions', () => {
    expect(codes('you are stacking the blocks you are building a tower you put the red one on top')).toEqual(['description', 'description', 'description']);
  });

  it('a description, one praise and an order at the end, with nothing lost', () => {
    const turn = 'you are stacking the blocks i love how gently you do it you made a tower put that down';
    const coded = codeTurn(turn);
    const got = coded.map((c) => c.code);
    expect(got.length).toBeGreaterThanOrEqual(3);
    expect(got[0]).toBe('description');
    expect(got.filter((c) => c === 'specific_praise')).toHaveLength(1);
    expect(got.indexOf('specific_praise')).toBeGreaterThan(0);
    expect(got[got.length - 1]).toBe('command');
    expect(coded.map((c) => c.text).join(' ')).toBe(turn);
  });

  it('a praise and then a request', () => {
    expect(codes('good job with the stacking sweetie can you hand me the blue one')).toEqual(['specific_praise', 'command']);
  });

  const ONE: [string, Code][] = [
    ['I love how you are stacking the blocks', 'specific_praise'],
    ['I like that you are sharing with me', 'specific_praise'],
    ['you are putting the block where you want it', 'description'],
    ['I see you are building', 'description'],
    ['thank you for showing me what you made', 'specific_praise'],
  ];
  it.each(ONE)('guard, stays one sentence: %s -> %s', (text, expected) => {
    expect(codes(text)).toEqual([expected]);
  });

  it('"thats so cool what is that" stays two sentences as today', () => {
    expect(codes('thats so cool what is that')).toEqual(['general_praise', 'question']);
  });
});

/**
 * A probe written after the tables: 40 everyday sentences that are in none of them, labeled before the
 * coder saw them. First run 37 of 40. The three misses ("You snapped the two pieces together.",
 * "You shared your snack with the bear, that was kind.", "You figured it out!") led to generic fixes,
 * so the set now only guards against regressions.
 */
describe('probe: 40 fresh everyday sentences', () => {
  const PROBE: [string, Code][] = [
    ["You're zipping up the teddy's jacket.", 'description'],
    ['I love how you waited for your turn.', 'specific_praise'],
    ['Oh, the giraffe is taking a nap.', 'neutral'],
    ['You snapped the two pieces together.', 'description'],
    ['Thanks for handing me the purple marker.', 'specific_praise'],
    ['What should the bunny eat?', 'question'],
    ['Hand me the glue.', 'command'],
    ["You're being so patient with that puzzle.", 'specific_praise'],
    ["That doesn't go in your mouth.", 'criticism'],
    ['Wow, a rocket ship!', 'neutral'],
    ['You chose the sparkly stickers.', 'description'],
    ['Can we make it taller?', 'question'],
    ['Great idea to put the roof on last.', 'specific_praise'],
    ["You're humming while you draw.", 'description'],
    ['Sit still please.', 'command'],
    ["I'm going to make a snake too.", 'neutral'],
    ['Super job cleaning up the crayons.', 'specific_praise'],
    ['Is the baby hungry?', 'question'],
    ['You tucked the doll in.', 'description'],
    ['Nice and gentle with the kitty.', 'specific_praise'],
    ['Quit kicking the table.', 'criticism'],
    ['The train is going through the tunnel.', 'neutral'],
    ['You look so happy.', 'neutral'],
    ['Let me see.', 'command'],
    ['You stirred it round and round.', 'description'],
    ["That's a silly hat!", 'neutral'],
    ['You shared your snack with the bear, that was kind.', 'specific_praise'],
    ['Why is he crying?', 'question'],
    ["You're squeezing the playdough.", 'description'],
    ['Good listening.', 'specific_praise'],
    ['Mmm, yummy soup.', 'neutral'],
    ['You put all the animals in the barn.', 'description'],
    ["Don't touch that.", 'criticism'],
    ["You're such a good helper.", 'specific_praise'],
    ['Which color do you want next?', 'question'],
    ["You're coloring the roof purple.", 'description'],
    ['Push the car down the ramp.', 'command'],
    ["I like how quietly you're playing.", 'specific_praise'],
    ['You figured it out!', 'general_praise'],
    ['You fixed the wheel.', 'description'],
  ];
  it('has 40 sentences', () => {
    expect(PROBE).toHaveLength(40);
  });
  it.each(PROBE)('%s -> %s', (text, expected) => {
    expect(codes(text)).toEqual([expected]);
  });
});

describe('beyond the tables: what a second break-it pass found', () => {
  const HOSTILE = [
    'good job breaking it',
    'thanks for nothing',
    'way to go, you spilled it',
    "good job, now it's broken",
    'wonderful, another mess',
    "I can't stand you",
    'nobody likes you',
    "you're the worst",
    'shame on you',
    "I'm disappointed in you",
    'you are ignoring me',
    'not so good',
    "that wasn't nice",
    'cool it',
    'noooo',
  ];
  it.each(HOSTILE)('criticism: %s', (text) => {
    expect(codes(text)).toEqual(['criticism']);
  });

  const ORDERS = ['good girl sit down', 'nice job now do it again', 'wow cool tower now clean it up', "I like your tower let's knock it down", 'You give me that', 'You stop it right now', 'Just give it to me'];
  it.each(ORDERS)('command: %s', (text) => {
    expect(code(text)).toBe('command');
  });

  const HONEST: [string, Code][] = [
    ['Thank you for cleaning up the mess.', 'specific_praise'],
    ['Thank you for not giving up.', 'specific_praise'],
    ["You're rocking the baby.", 'description'],
    ['The baby is sleeping like a baby.', 'neutral'],
    ['You are the baby and I am the mommy.', 'neutral'],
    ["You're going slow and steady.", 'description'],
    ['Good job helping daddy put it away.', 'specific_praise'],
    ['You made the bear hold the cup.', 'description'],
    ['You picked it up and put it on top.', 'description'],
    ['I like how you sit and listen.', 'specific_praise'],
    ['The bear says sit down.', 'neutral'],
    ['Clean up time is over.', 'neutral'],
    ['You must be so proud.', 'general_praise'],
    ['Then you added a window.', 'description'],
    ['You are doing it too!', 'description'],
    ['Good job, Aiden!', 'general_praise'],
    ['Good grief', 'neutral'],
    ['Absolutely gorgeous', 'general_praise'],
    ['Disagree?', 'question'],
    ['I love pizza', 'neutral'],
  ];
  it.each(HONEST)('honest talk keeps its code: %s -> %s', (text, expected) => {
    const coded = codeTurn(text);
    expect(coded.map((c) => c.code)).toEqual([expected]);
    expect(coded[0].rule.startsWith('unclear_')).toBe(false);
  });

  it('made-up words alone are listed as neutral talk with an unclear_ rule', () => {
    expect(codeSentence('blorp gleep snorp')).toMatchObject({ code: 'neutral', rule: 'unclear_words' });
    expect(codeSentence('the foo is blah')).toMatchObject({ code: 'neutral', rule: 'unclear_words' });
  });

  it('more languages, with and without accents', () => {
    for (const text of ['très bien', 'ochen horosho', 'sehr gut', 'privet kak dela', 'gracias', 'zhaksy']) {
      expect(codeSentence(text), text).toMatchObject({ code: 'unknown', rule: 'no_english_words' });
    }
    // English with a rare word in it is never sent away.
    for (const text of ['Sparkly tiara', 'General praise', 'Fascinating contraption']) expect(code(text), text).not.toBe('unknown');
  });

  it('a question or a request after a statement is split off in a run-on', () => {
    expect(codes('nice tower is it a castle')).toEqual(['specific_praise', 'question']);
    expect(codes('good job did you do it yourself')).toEqual(['general_praise', 'question']);
    expect(codes('what are you doing now are you making a car')).toEqual(['question', 'question']);
    expect(codes('my favorite is this one')).toEqual(['neutral']);
    expect(codes('I love the tower you made yesterday')).toEqual(['specific_praise']);
  });

  it('the support filter beyond the table', () => {
    for (const text of ['I hit her again', 'I hit him in the face', 'I beat my kids', 'Mommy is going to spank you', 'I punched him']) {
      expect(isSafetyConcern(text), text).toBe(true);
    }
    for (const text of ['I beat you!', 'I win, I beat you this time', 'Mommy will beat you to the door', 'Mommy hurt her knee', 'Did mommy hurt you?', 'I will whip you up some soup']) {
      expect(isSafetyConcern(text), text).toBe(false);
    }
  });
});

describe('the vocabulary', () => {
  it('knows the inflected forms of the action verbs and the scene words', () => {
    for (const w of ['stacking', 'stacked', 'stacks', 'putting', 'carried', 'carries', 'balancing', 'wobbly', 'crayons', 'spoon']) {
      expect(isPlayWord(w), w).toBe(true);
    }
  });
  it('does not take function words or made-up words for play words', () => {
    for (const w of ['the', 'you', 'are', 'blah', 'blahing', 'foo', 'xx', 'xyzzy', 'zzzzing']) expect(isPlayWord(w), w).toBe(false);
    for (const w of ['the', 'you', 'are', 'stacking']) expect(isEnglishWord(w), w).toBe(true);
  });
  it('is generous', () => {
    expect(VOCABULARY.size).toBeGreaterThan(1500);
  });
});

/**
 * A third pass: five reviewers attacked the coder from five sides (an honest parent, a hostile one, the round,
 * the lessons, the team's screens). Their own sentences are kept here word for word, next to the honest
 * sentences each fix must not break. A leak (something unkind, an order or made-up words fills a ring) and a
 * false alarm (an honest sentence lands in the tray or counts for nothing) weigh the same.
 *
 * Each row is [sentence, what Mia said just before or null, what is expected]:
 *   a code           the whole turn is one sentence with this code
 *   'B:neutral'      one sentence in this bucket, whatever its code (target, neutral, avoid)
 *   '!criticism'     any code but this one
 *   'T:a,b'          the codes of the turn, sentence by sentence
 */
type Row = [text: string, childLastSaid: string | null, expected: string];
const g = (name: string, rows: Row[]): { name: string; rows: Row[] } => ({ name, rows });
const n = (expected: string, ...texts: string[]): Row[] => texts.map((t) => [t, null, expected]);

const REVIEW: { name: string; rows: Row[] }[] = [
  g('a description that shares a word with her line is a description; her words said back stay a reflection', [
    ['You are sliding the orange crayon over to me.', 'You can have orange.', 'description'],
    ['You can have orange.', 'You can have orange.', 'reflection'],
    ['You are handing me a yellow block.', 'This block is for you.', 'description'],
    ['You are drawing a small house with a red door.', 'This is our house.', 'description'],
    ['You are setting a plate down in front of me.', 'This plate is for you.', 'description'],
    ['You are putting the cars back in the bin one by one.', 'The cars go in the bin.', 'description'],
    ['You are setting a blue block down very gently.', 'This block is for you.', 'description'],
    ["You're drawing a small house with a red door.", 'This is our house.', 'description'],
    ["You're coloring the grass green.", 'This is the grass.', 'description'],
    ["You're handing me a yellow block.", 'This block is for you.', 'description'],
    ['You handed me the lid of the toy bin.', 'The lid is for you.', 'description'],
    ['You stacked the books into a tower.', 'The books make a tower.', 'description'],
    ["You're drawing a house with a red door.", 'This is our house.', 'description'],
    ['You are stacking the blocks.', 'This block is for you.', 'description'],
    ["You're holding the block.", 'This block is for you.', 'description'],
    ['You rolled the orange one.', 'You can have orange.', 'description'],
    // must not break
    ['You are making a train.', 'It is a train.', 'reflection'],
    ['You colored a rainbow!', 'Rainbow!', 'reflection'],
    ['You made a train.', 'It is a train.', 'reflection'],
    ['You are making soup.', "I'm making soup.", 'reflection'],
    ["You're making soup for us.", "I'm making soup.", 'reflection'],
    ['You are putting the cars in the bin.', 'The cars go in the bin.', 'reflection'],
    ['You made a tall tower!', 'I made a tower!', 'reflection'],
    // Mostly new words: counted as the description it also is, never as anything but a skill.
    ['You made a tall tower with the red blocks!', 'I made a tower!', 'description'],
    ['You are finding a puzzle piece under the rug.', 'I found the last piece.', 'description'],
    ['You found the last piece.', 'I found the last piece.', 'reflection'],
    ['You drew a rainbow!', 'Rainbow!', 'reflection'],
    ["It's a long train.", 'It is a train.', 'reflection'],
    ['This block is for me.', 'This block is for you.', 'reflection'],
  ]),
  g('"clean up", "sit down", "slow down" after a noun or a helper verb are not an order', [
    ...n('specific_praise', 'Thank you for helping Mommy clean up.', 'Thank you for helping clean up.', 'Good job helping clean up!', 'I like how you help clean up.', 'Great job with clean up today.', 'Nice clean up, Mia!',
      'Thank you for helping clean up the cars.', 'Great job helping clean up.', 'I love how you helped clean up.', 'Thank you for helping Daddy clean up.', 'Thank you for helping put the cars away.', 'Great job helping put the toys away.', 'Thank you for helping me sort and clean up.'),
    ...n('description', "You're helping the bear sit down at the table.", 'You made the car slow down.', "You're helping clean up.", 'You helped clean up.'),
    ...n('neutral', 'The cars slow down at the bridge.', 'I know, clean up takes a long time.', 'Clean up time!'),
    ...n('command', 'good girl sit down', 'nice tower now clean up', 'I love your tower sit down', 'nice job with the blocks sit down', 'nice clean up your toys', 'Clean up the blocks.', 'Nice tower now clean up.', 'Good girl sit down.', 'Great job stacking now give me the red one.', 'Good job, now clean up.', 'Great helping now put the cars away.', 'Help me clean up.', 'I need you to help clean up.'),
  ]),
  g('an adverb between "you" and the past verb keeps the description', [
    ...n('description', 'You gently laid the doll in the bin.', 'You carefully set the cup on the table.', 'You slowly poured the juice.', 'You gently set the blue block down.', 'You slowly colored inside the circle.', 'You very slowly carried the cup to the table.', 'You patiently waited for the soup.', 'You quickly found the lid.', 'You almost got it.', 'You finally got the lid on.', 'You set the blue block down very gently.', "You're gently setting the block down."),
    ...n('neutral', 'You barely tried.', 'You rudely grabbed it.'),
    ...n('criticism', 'You really messed up.'),
    ...n('B:neutral', 'You finally listened.'),
  ]),
  g('plain orders with everyday play verbs reach the to-swap tray', [
    ...n('command', 'Stir the soup.', 'Eat your soup.', 'Drink your tea.', 'Taste the soup.', 'Scoop some peas into the bowl.', "Blow on it, it's hot.", 'Zip up the backpack.', 'Wipe the table.', 'Dump them in the bin.', 'Tuck the baby in.', 'Clap your hands.', 'Mia, scoop the peas.', 'Please stir it slowly.', 'Gentle hands, please.', 'More tea, please.'),
    ...n('neutral', 'Dance party!', 'Tap tap tap.', 'Pop goes the weasel.', 'Guess what!', 'Peek a boo!', 'Water in the cup.', 'Yes, please.'),
    ['Bang! The pot is loud.', null, 'T:neutral,neutral'],
  ]),
  g('an unkind statement in the form of a description is a criticism', [
    ...n('criticism', 'You are acting like a two year old.', 'You are throwing a tantrum.', 'You are making me sad.', 'You are bothering me.', 'You are bugging me.', 'You are taking forever.', 'You are messing it up.', 'You are showing off.', "You're just sitting there.", 'You are lying to me.', 'You are hogging all the blocks.', 'You took forever.', 'You are crying over nothing.'),
    ...n('description', 'You are acting like a lion.', 'You are throwing the ball.', 'You are rocking the doll like a baby.', 'You are making me soup.', 'You are taking your time.', 'You mixed it all up.', "You're showing off your tower."),
    ...n('!criticism', 'You made me smile.'),
    ['You messed up.', 'I messed up.', 'reflection'],
  ]),
  g('a dismissive tail or a "but" takes the ring away', [
    ...n('B:neutral', 'You are stacking, finally.', 'You tried, at least.', 'Great stacking, finally.', 'Nice tower, I guess.', 'Nice tower, but it is crooked.', 'Good job, but you missed one.', 'Not bad for a four year old.', 'Nice, finally.'),
    ...n('criticism', 'You built a tower, big deal.', 'You stacked it, took you long enough.', 'Good job stacking, for once.', 'Nice tower, but mine is better.', 'Good girl, was that so hard.', 'Good job, for once.'),
    ...n('description', 'Finally, you are stacking.', 'You stacked at least three blocks.'),
    ['You finally did it, great job!', null, 'T:neutral,general_praise'],
    ['It fell, but you tried again, great job!', null, 'T:neutral,general_praise'],
  ]),
  g('an address term or a filler word does not make a praise specific', [
    ...n('general_praise', 'Good job, big girl!', 'Good job, little one!', 'Great work, little one.', 'Good work, kid.', "You're a good kid.", 'Nice try!', 'Good try.', "You're doing great, keep going.", "You're doing great, keep it up!", 'Nice and easy.', 'Looking good!', 'Good going!'),
    ...n('B:neutral', 'Nice weather today.', 'Have a nice day.', 'Great, I need a break.', 'I love my new phone.', 'I like the red one.'),
    ...n('specific_praise', 'Nice big tower!', 'Nice try stacking the tall one.', 'Great job trying again.', 'Good job keeping it steady.', 'Great idea!', 'I love your tower.', 'I love this drawing!', 'I love how big your tower is.', 'I love my little helper.', 'Nice try stacking it.'),
  ]),
  g('warm cheers stay out of the tray', [
    ...n('general_praise', 'Great job, keep it up!', 'Great job, give me five!', 'You did it, give me five!', 'You did it, yeah!'),
    ...n('neutral', 'It is not your fault.'),
    ...n('command', 'Great job, keep it quiet.', 'Nice tower, give me the red one.'),
    ...n('criticism', "That's not right."),
  ]),
  g('a say-back with a spoken contraction is a reflection', [
    ["The dog's hungry.", 'The dog is hungry.', 'reflection'],
    ["The tea's hot.", 'The tea is hot.', 'reflection'],
    ["The sun's very hot.", 'The sun is hot.', 'reflection'],
    ["Dinner's ready!", 'Dinner is ready!', 'reflection'],
    ["The lid's for me.", 'The lid is for you.', 'reflection'],
    ["The doll's going to sleep.", 'The doll goes to sleep.', 'reflection'],
    ["Oh, the dog's hungry.", 'The dog is hungry.', 'reflection'],
    ["The soup's ruined.", 'The soup is ruined!', 'reflection'],
    ["The dog's bowl is empty.", 'The dog is hungry.', 'neutral'],
    ["What's hot?", 'The tea is hot.', 'question'],
    ["That's nice.", 'The tea is hot.', 'general_praise'],
    ["It's wobbly.", 'It is wobbly.', 'reflection'],
  ]),
  g('"It is not ... yet" corrects nobody', [
    ...n('B:neutral', "It's not wobbly anymore.", "That's not too heavy for you.", "It's not ready yet.", "It's not hot anymore.", "It's not falling down this time!", "You're not scared of the storm.", "That's not scary at all.", "That's not easy, and you did it."),
    ["You're not done yet.", "I'm not done.", 'reflection'],
    ...n('criticism', "You're not listening anymore.", "That's not right yet.", "It's not good yet.", "That's not how you do it.", "It's not a toy.", "That's not too nice."),
  ]),
  g('a name or a pet name in front of "you" keeps the description', [
    ...n('description', "Aiden, you're stacking them so high.", 'Zoe you are building a garage for the cars', 'Emma, you put the block on top.', 'Noah, you made a tower!', "Baby girl, you're coloring the sun.", "Sweet pea, you're stirring the soup.", "Bud, you're building it so tall.", "My love, you're pouring the tea.", "Miss Mia, you're setting the table.", "Mia, you're stacking the blocks."),
    ...n('specific_praise', 'Emma, thank you for sharing.'),
    ...n('neutral', 'Love the colors!'),
    ...n('command', 'Emma, give me the spoon.'),
    ...n('general_praise', 'Great job, Aiden!'),
    ...n('B:neutral', 'Girl power!'),
  ]),
  g('a hard word said of oneself, of a pretend character or of a thing corrects nobody', [
    ...n('B:neutral', 'Oops, I picked the wrong crayon.', 'Oops, I made a mess.', 'Oops, my bad.', 'Oh no, the bad dragon is coming!', 'The monster is so mean!', 'The dog made a mess.', 'The car is going too fast!', 'This puzzle is too hard for me.', 'I hate it when my tower falls too.', 'The lazy cat is sleeping.'),
    ['No more juice.', 'My juice is all gone.', 'B:neutral'],
    ...n('question', "What's wrong, sweetie?"),
    ...n('description', "You're cleaning up the messy table."),
    ...n('criticism', 'You made a mess.', 'You left a mess.', 'You got the wrong one.', 'I think you did it wrong.', "That's so mean.", "You're going too fast.", 'No more throwing.', 'No more blocks for you.', 'You are so messy.', "That's wrong."),
  ]),
  g('common past forms are known as actions', [
    ...n('description', 'You fit the last piece in.', 'You left the spoon in the pot.', 'You tipped the pot and the food rolled out.', 'You told the dolly good night.', 'You said the soup is ready.', 'You shut the oven door.', 'You bought an apple at the store.', 'You saw the dog and drew it.'),
  ]),
  g('sarcastic praise that names a misbehavior is a criticism', [
    ...n('criticism', 'I love how you throw everything on the floor.', 'I love how loud you are.', 'I love it when you scream.', 'Great job whining.', 'Good job yelling at me.', 'Thanks for throwing the block at me.', 'Good job making me wait.', 'Wow, great job throwing everything.', 'I like your sister better.'),
    ...n('specific_praise', "I love how gently you're holding the bunny.", 'Thank you for sharing the red crayon.', 'I like the way you lined up the cars.', 'I love how loud your drum is!'),
  ]),
  g('her complaint said back with something unkind added is a criticism', [
    ['This is too hard for a baby like you.', 'This is too hard.', 'criticism'],
    ["You can't do it because you never try.", "I can't do it!", 'criticism'],
    ['It is not good, it is ugly.', 'It is not good.', 'criticism'],
    ['The soup is ruined and it is your fault.', 'The soup is ruined!', 'criticism'],
    ['It broke because of you.', 'It broke.', 'criticism'],
    ['You made a tower that looks like garbage.', 'I made a tower!', 'criticism'],
    ['You made a tower, so what.', 'I made a tower!', 'criticism'],
    ['This is too hard.', 'This is too hard.', 'reflection'],
    ['This is too hard, you are frustrated.', 'This is too hard.', 'reflection'],
    ["You can't do it yet.", "I can't do it!", 'reflection'],
    ['You messed up.', 'I messed up.', 'reflection'],
    ['It is not good, you think.', 'It is not good.', 'reflection'],
    ['The soup is ruined.', 'The soup is ruined!', 'reflection'],
    ['The garbage truck is big.', null, 'neutral'],
    ['You are driving the garbage truck.', null, 'description'],
  ]),
  g('an order after "You ...," or after "and" is a command', [
    ...n('command', 'You built a tower, make it taller.', 'You made a train, make another one.', 'You drew a sun, draw a moon too.', 'You are coloring, use the blue one.', 'You built a tower, share it with me.', 'You are stacking, put the red one on top.', 'You are drawing a house, add a door.', 'You stacked three, stack one more.', 'Nice tower and give me the red block.', 'Good job stacking and clean up.', 'You are stacking and give me that.', 'You built a tower, now make it taller.'),
    ...n('description', 'You picked it up, put it on top.', 'You picked it up and put it on top.', 'You stack them up, line them up, and knock them down.'),
    ...n('specific_praise', 'I love how you pick them up and hand them to me.', 'Thank you for helping me sort and clean up.'),
  ]),
  g('a tag question without its comma is a question', [
    ...n('question', 'you are building a house right', "you're making soup right", 'you put it on top right', 'you are building a house huh', 'nice tower right'),
    ['you made a tower right', 'I made a tower!', 'question'],
    ...n('description', 'You put it on the right.', 'You lined them up just right.', 'You stacked them up right.', 'You turned it right side up.', 'You stacked the blocks right.'),
    ...n('!question', 'You got it right!'),
  ]),
  g('a mashed or made-up verb next to one real word fills no ring', [
    ...n('neutral', 'You are sdfsdfing blocks.', 'You are xkcding the car.', 'You are aaaaing the block.', 'You are asdfing.', 'You are qqqqing it.',
      'You are stacking ' + Array.from({ length: 60 }, (_, i) => 'zq' + 'bcdfg'[i % 5] + 'rt' + i).join(' ').replace(/\d/g, 'x')),
    ...n('description', 'You are assembling the track.', 'You are constructing a bridge.', "You're wiggling the car."),
  ]),
  g('"You want to ... ." is a statement; "You did make a tower!" says her words back', [
    ...n('B:neutral', 'You want to play cars now.', 'You want to build a tower.', 'You want to do it yourself.', 'You want to make soup.', 'You want to draw a house.', 'You want to try again.', 'You want to play with the cars.', 'You wanna build it tall.'),
    ...n('question', 'You want to play with the cars?', 'Wanna play with the cars.', 'Want to build a tower.', 'You want to play with the cars', 'Did you make a tower?'),
    ['You did make a tower!', 'I made a tower!', 'B:target'],
    ['You sure did make a tower.', 'I made a tower!', 'B:target'],
    ['You did draw a cat!', 'I drew a cat!', 'B:target'],
    ...n('general_praise', 'You did it!'),
    ...n('criticism', 'You did that wrong.'),
    ...n('neutral', 'You did not listen.'),
    ...n('specific_praise', 'You did a great job stacking.'),
  ]),
  g('"your" typed for "you are", and narration in the third person', [
    ...n('specific_praise', 'ur so gentle with the baby', 'your so careful with the cups', 'your stacking so carefully', 'your waiting so patiently'),
    ...n('description', 'your coloring in the circle', 'your making soup', 'ur drawing a house with a red door', 'Mia is stirring the pot.', "Mia's building a tall tower.", 'Mia stacked the blocks.'),
    ...n('!description', 'Your drawing is so pretty.', 'Your building blocks are here.', 'Your coloring book is here.'),
    ...n('specific_praise', 'i love how careful ur being', 'good job sharing ur blocks', 'I love your very tall tower.'),
  ]),
  g('more orders, empty sentences and unkind talk', [
    ...n('command', 'Hands in your lap.', 'Eyes on me.', 'Great stacking, your turn to clean up.', 'Fine, do it your way.', 'Do it.', 'Do that again.', 'Do it yourself.'),
    ...n('question', 'Do you want it', 'Does it fit', 'Do those go here?'),
    ...n('criticism', 'Last warning.'),
    ...n('neutral', 'You are stacking stacking stacking stacking.', 'Hands up!', 'Your turn to stir!', 'Eyes, nose, mouth.'),
    ...n('description', 'You are stirring round and round and round.'),
    ...n('command', 'You are sitting down this instant.', "I'd like you to stack the blue one.", 'Mommy wants you to put the blocks away.', 'You will put the blocks away.'),
    ...n('B:avoid', "Wouldn't it be nice if you shared"),
    ...n('B:target', 'You are cleaning up, thank you.'),
    ...n('specific_praise', 'I like it when you sit with me.'),
    ...n('neutral', 'You are doing.', 'You are going.', 'You got.', 'You went.', 'You made.'),
    ...n('B:neutral', 'You are doing it.'),
    ...n('description', 'You are doing a puzzle.', 'You are going down the slide.', 'You went under the bridge.'),
    ...n('description', 'You made it.', 'You are doing it too!'),
    ...n('criticism', 'After all I do for you, you build that.', 'Your sister never does this.', 'I am so done with you.', 'Your drawing is a mess.', 'That looks like garbage.', 'You always do this.'),
    ...n('B:neutral', 'The paint is a mess.'),
  ]),
  g('false alarms found while the review was being closed', [
    ...n('neutral', 'Ready, set, go!', 'Keep going!', 'Keep it up!', 'Keep trying.', 'Give me five!', 'Come on!', 'Slow and steady.', 'Clean up, clean up, everybody everywhere.', 'Clean up song!',
      'I pour the tea, stir it, and drink it.', 'I put it on, take it off.', 'The bear and the doll sit down.', "It's not working.", 'This is not working.', 'The bear is being naughty.', 'The cat is lazy.', 'The soup is yucky.',
      'No more monkeys jumping on the bed.', 'The clean up is done.', 'After clean up we eat.'),
    ...n('B:neutral', 'Come on, you can do it!', 'No, thank you.', 'No thank you.', "Aren't you clever!", "You're doing so well.", 'No big deal.', 'I love my tea.', 'I like my soup hot.'),
    ...n('description', 'You are stacking it right now.', "You're stacking the blocks right now.", 'You made the tower stand up.', 'You finally finished it.', 'You said please!', 'You really tried.', 'Leo is stacking.', 'Mia waited.'),
    ...n('command', 'You stop it right now.', 'You come here this instant.', 'Come on, hurry up.', 'Dance with me.', 'Hug the bear.', 'Paint the house red.', 'Mia, stack them.', 'Say please.', 'You opened it, take a look.', 'Bud, hand me that.'),
    ...n('criticism', 'You are taking a long time.', 'Your room is a mess.', "It's your fault.", 'You made me wait.', 'Emma, no.', 'Your tower is ugly.', 'You are mean.', 'The soup is yucky and so are you.'),
    ...n('question', 'Isn\'t that nice?', "Wouldn't that be fun?", 'you like that huh'),
    ...n('neutral', 'Water all over the floor!', 'Step up here.', 'Jump up and down.', 'Stuff on the floor.', 'Wind in the trees.', 'I did it wrong.', "It's not too bad!", 'No, thank you.', 'The bear wants tea, please.', 'you did everything right'),
    ...n('command', 'Water the flowers.', 'Dance with me.', 'Splash me!', 'Drink up.', 'Tea, please.', 'Quiet voice, please.'),
    ...n('description', "You're making a bottle for a baby.", 'you got the answer right'),
    ...n('specific_praise', 'Thank you for making a bed for a baby.', 'I love how loud you sing!', 'I love how slow and careful you are.'),
    ...n('criticism', 'I think it looks ugly.', "That's not real."),
    ...n('general_praise', 'Nice tower for a three year old.', 'Pretty good for a girl.'),
    ...n('specific_praise', 'Nice job looking at me.', 'Great job going down the slide.', 'Good job listening to me.', 'Great job calming down.', 'Nice job slowing down on the stairs.', 'Good job sitting down at the table.'),
    ...n('neutral', 'So close.', 'Oh, so close!', 'Eyes on the dog, nose on the dog.', 'Feet in the water, splash splash.'),
    ...n('command', 'Close the door.', 'Feet on the floor.', 'So close the door.'),
    ...n('description', 'You told me about the dog.', 'You said bye to the blocks.'),
    ...n('specific_praise', 'Nice and gentle.', 'Thank you for saying please.', 'You nicely shared.'),
  ]),
  g('slang praise is general praise', [
    ...n('general_praise', 'You rock!', "You're killing it!", "That's my girl!"),
  ]),
];

describe.each(REVIEW)('review: $name', ({ rows }) => {
  it.each(rows)('%s (after %s) -> %s', (text, childLastSaid, expected) => {
    const turn = codeTurn(text, { childLastSaid });
    const got = turn.map((c) => `${c.code}/${c.rule}`).join(' | ');
    if (expected.startsWith('T:')) {
      expect(turn.map((c) => c.code).join(','), got).toBe(expected.slice(2));
      return;
    }
    if (expected.startsWith('!')) {
      for (const c of turn) expect(c.code, got).not.toBe(expected.slice(1));
      return;
    }
    expect(turn, got).toHaveLength(1);
    if (expected.startsWith('B:')) expect(turn[0].bucket, got).toBe(expected.slice(2));
    else expect(turn[0].code, got).toBe(expected);
  });
});

describe('review: what the fixes rest on', () => {
  it('the support filter is not touched by a hard word: "You are throwing a tantrum." is coded, as a criticism', () => {
    expect(codeSentence('You are throwing a tantrum.')).toMatchObject({ code: 'criticism', bucket: 'avoid' });
    expect(isSafetyConcern('You are throwing a tantrum.')).toBe(false);
  });

  it('sarcasm about waiting does not train the habit it names', () => {
    expect(codeSentence('Good job making me wait.')).toMatchObject({ code: 'criticism' });
    expect(codeSentence('Good job making me wait.').namedBehavior).toBeUndefined();
    expect(codeSentence('Nice job waiting for your turn.')).toMatchObject({ code: 'specific_praise', namedBehavior: 'patient' });
  });

  it('a backhanded sentence is listed with its own rule and names no habit', () => {
    expect(codeSentence('Great stacking so gently, finally.')).toMatchObject({ code: 'general_praise', rule: 'backhanded' });
    expect(codeSentence('Great stacking so gently, finally.').namedBehavior).toBeUndefined();
    expect(codeSentence('You are stacking, finally.')).toMatchObject({ code: 'neutral', rule: 'backhanded' });
    expect(codeSentence('You finally listened.')).toMatchObject({ code: 'neutral', rule: 'backhanded' });
    expect(codeSentence('Nice tower, but it is crooked.')).toMatchObject({ code: 'general_praise', rule: 'praise_but' });
    // A praise that goes on to another skill after "but" keeps its ring.
    expect(codeSentence('Nice tower, but I love your bridge even more.').code).toBe('specific_praise');
  });

  it('a paste of made-up words after one real verb is not a description', () => {
    const made = Array.from({ length: 60 }, (_, i) => `zq${'bcdfg'[i % 5]}rt${'aeiou'[i % 5]}x`).join(' ');
    expect(codeSentence(`You are stacking ${made}`)).toMatchObject({ code: 'neutral', rule: 'unclear_words' });
    expect(codeSentence('You are sdfsdfing blocks.')).toMatchObject({ code: 'neutral', rule: 'unclear_action' });
    // A real verb the vocabulary did not have is not "mashed": it has vowels where a word has them.
    for (const text of ['You are quibbling the car.', 'You are harmonizing the bells.']) expect(codeSentence(text).code, text).toBe('description');
  });

  it('knows the base forms it reads orders and present narration by', () => {
    for (const w of ['stir', 'eat', 'drink', 'taste', 'scoop', 'blow', 'zip', 'wipe', 'dump', 'tuck', 'clap', 'sing', 'flip', 'snap', 'park', 'carry', 'squish', 'shake', 'tap', 'stack']) {
      expect(isBaseVerb(w), w).toBe(true);
    }
    for (const w of ['stirred', 'stacks', 'stacking', 'made', 'party', 'the', 'blorp']) expect(isBaseVerb(w), w).toBe(false);
  });
});
