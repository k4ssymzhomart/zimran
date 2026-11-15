import { describe, expect, it } from 'vitest';
import type { Bucket, Code } from '../types';
import { codeSentence, codeTurn } from './classify';
import { isSafetyConcern } from './safety';
import { isEnglishWord, isPlayWord, VOCABULARY } from './vocabulary';

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
