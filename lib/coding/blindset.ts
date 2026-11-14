import type { Code } from '../types';

/**
 * A blind check of the classifier: 80 turns labelled from the category table alone,
 * before the author had read the rules or the other example sets.
 * Typed the way people type in a chat box: lower case, missing apostrophes, small typos,
 * non-native grammar, a few two-sentence turns. Ten turns per main category.
 * Each row: the turn, the expected code per sentence, and the child's line where it matters.
 */
export const BLINDSET: [string, Code[], string?][] = [
  // specific praise
  ['great job stacking those blocks so carefully', ['specific_praise']],
  ['i love how you shared the crayons with me', ['specific_praise']],
  ['nice tower', ['specific_praise']],
  ['wow you did so good job with puting the pieces together', ['specific_praise']],
  ['thank you for waiting your turn', ['specific_praise']],
  ['i like the way your being gentle with the dolly', ['specific_praise']],
  ['good job cleaning up the cars!', ['specific_praise']],
  ['thats a beautiful drawing', ['specific_praise']],
  ['you are so good at building', ['specific_praise']],
  ['im proud of you for trying again. you put the roof back on', ['specific_praise', 'description']],

  // general praise
  ['good job!', ['general_praise']],
  ['awesome', ['general_praise']],
  ['nice work buddy', ['general_praise']],
  ['wow thats great', ['general_praise']],
  ['well done', ['general_praise']],
  ['yay!! perfect', ['general_praise']],
  ['you are so smart', ['general_praise']],
  ['thank you', ['general_praise']],
  ['good girl', ['general_praise']],
  ['very good, mia', ['general_praise']],

  // reflection (third item is what the child just said)
  ['the car goes fast', ['reflection'], 'The car goes fast'],
  ['you made a big tower', ['reflection'], 'I made a big tower'],
  ['its a doggy, yes', ['reflection'], "It's a doggy"],
  ['you want the red one', ['reflection'], 'I want the red one'],
  ['oh the baby is sleeping', ['reflection'], 'The baby is sleeping'],
  ['a rainbow', ['reflection'], 'Look, a rainbow!'],
  ['your tower fell down', ['reflection'], 'My tower fell down'],
  ['youre making soup. it smells yummy', ['reflection', 'neutral'], "I'm making soup"],
  ['that one is too big', ['reflection'], 'This one is too big'],
  ['the train go to the zoo', ['reflection'], 'The train is going to the zoo'],

  // description
  ['youre putting the blue block on top', ['description']],
  ['you drew a long line', ['description']],
  ['you are driving the car around the track', ['description']],
  ['now your making the cow jump', ['description']],
  ['you picked the green crayon', ['description']],
  ['u r building it really tall', ['description']],
  ['you put the baby to bed', ['description']],
  ['you is coloring the sun yellow', ['description']],
  ['youre rolling the playdoh. you made a snake', ['description', 'description']],
  ['i see you lining up all the animals', ['description']],

  // neutral
  ['thats a red one', ['neutral']],
  ['im building a garage for my car', ['neutral']],
  ['the cow says moo', ['neutral']],
  ['this block is heavy', ['neutral']],
  ['my tower is getting tall too', ['neutral']],
  ['there are three bears in the house', ['neutral']],
  ['oops it fell', ['neutral']],
  ['i have the yellow one', ['neutral']],
  ['it looks like a castle', ['neutral']],
  ['we are playing with the farm today', ['neutral']],

  // question
  ['what are you making?', ['question']],
  ['is that a horse', ['question']],
  ['you want the blue one?', ['question']],
  ['thats a big tower, right?', ['question']],
  ['where does this piece go', ['question']],
  ['what color is this one', ['question']],
  ['how many blocks you have', ['question']],
  ['do you like the doggy', ['question']],
  ['its a truck isnt it', ['question']],
  ['whats that. who lives in there', ['question', 'question']],

  // command
  ['put it here', ['command']],
  ['lets build a house', ['command']],
  ['can you hand me that', ['command']],
  ['you need to sit down', ['command']],
  ['give me the red block please', ['command']],
  ['look at this one', ['command']],
  ['try the other side', ['command']],
  ['why dont you put the hat on him', ['command']],
  ['how about we draw a sun', ['command']],
  ['be carful with that. hold it with two hands', ['command', 'command']],

  // criticism
  ['no', ['criticism']],
  ['dont throw the blocks', ['criticism']],
  ['stop that', ['criticism']],
  ['thats not a dog', ['criticism']],
  ['no not like that', ['criticism']],
  ['you are being naughty', ['criticism']],
  ['thats wrong, it goes the other way', ['criticism']],
  ['quit banging it', ['criticism']],
  ['youre making a mess', ['criticism']],
  ['you never listen. stop it right now', ['criticism', 'criticism']],
];
