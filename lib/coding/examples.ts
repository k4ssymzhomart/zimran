import type { Code } from '../types';

/**
 * Labeled sentences written by the team (not copied from any manual).
 * [what the parent says, expected code, what the child just said (for reflections)]
 * The test file checks every line.
 */
export const EXAMPLES: [string, Code, string?][] = [
  // ----- specific praise -----
  ['Great job stacking those blocks so carefully.', 'specific_praise'],
  ["I love how gently you're holding the bunny.", 'specific_praise'],
  ['Thank you for sharing the red crayon.', 'specific_praise'],
  ['Nice tower!', 'specific_praise'],
  ["You're doing a great job waiting your turn.", 'specific_praise'],
  ["That's a beautiful picture.", 'specific_praise'],
  ['I like the way you lined up the cars.', 'specific_praise'],
  ['Good job putting the lid back on.', 'specific_praise'],
  ['Wow, what a tall tower, nice building!', 'specific_praise'],
  ['Awesome job sharing with me.', 'specific_praise'],
  ['You are so good at building bridges.', 'specific_praise'],
  ['I love your train.', 'specific_praise'],
  ['You should be so proud of that tower.', 'specific_praise'],
  ['You drew a pretty flower.', 'specific_praise'],

  // ----- general praise -----
  ['Good job!', 'general_praise'],
  ['Good job today.', 'general_praise'],
  ['Nice work again!', 'general_praise'],
  ['Awesome!', 'general_praise'],
  ['Nice!', 'general_praise'],
  ['Great work!', 'general_praise'],
  ['I love it!', 'general_praise'],
  ['Thank you.', 'general_praise'],
  ['Wow, cool!', 'general_praise'],
  ["You're so smart.", 'general_praise'],
  ['Well done!', 'general_praise'],
  ['Yay, you did it!', 'general_praise'],
  ['Not bad!', 'general_praise'],
  ["That's so pretty!", 'general_praise'],
  ['You got it!', 'general_praise'],
  ['See, you did it!', 'general_praise'],
  ["That's pretty good.", 'general_praise'],

  // ----- reflection -----
  ['You made a big tower.', 'reflection', 'I made a big tower!'],
  ['The dog is hungry.', 'reflection', 'The dog is hungry.'],
  ['A red car.', 'reflection', "It's a red car."],
  ['You want the blue one.', 'reflection', 'I want the blue one.'],
  ['Your tower fell down.', 'reflection', 'My tower fell down!'],
  ["You're making soup.", 'reflection', "I'm making soup."],
  ['A train!', 'reflection', 'It is a train.'],
  ['It is wobbly.', 'reflection', 'It is wobbly.'],
  // "pretty" as "rather" is not praise: her line said back stays a reflection.
  ["It's pretty wobbly.", 'reflection', 'It is wobbly.'],

  // ----- description -----
  ["You're putting the blue block on top.", 'description'],
  ['You drew a long green line.', 'description'],
  ["You're making the car go fast.", 'description'],
  ['You picked the yellow one.', 'description'],
  ['You are stacking them one by one.', 'description'],
  ["You've built a bridge.", 'description'],
  ['You put the roof on the house.', 'description'],
  ["You're lining up all the animals.", 'description'],
  ["I see you're adding another block.", 'description'],
  ['Now you are rolling the ball.', 'description'],
  ['You got it on top.', 'description'],

  // ----- neutral talk -----
  ["That's a red one.", 'neutral'],
  ["I'm building a garage.", 'neutral'],
  ['Blocks are fun.', 'neutral'],
  ['This tower is very tall.', 'neutral'],
  ['The cow says moo.', 'neutral'],
  ['I have the green crayon.', 'neutral'],
  ['Hmm.', 'neutral'],
  ['Good morning!', 'neutral'],
  ['What a tall tower!', 'neutral'],
  ["You're the king of the castle.", 'neutral'],
  ["Don't worry, we can fix it.", 'neutral'],
  ['The bad guys are coming!', 'neutral'],
  ["That's pretty heavy.", 'neutral'],
  ["That's an awful lot of toys.", 'neutral'],

  // ----- question -----
  ['What are you making?', 'question'],
  ['Is that a house?', 'question'],
  ["You're making a tower, right?", 'question'],
  ['Do you like it?', 'question'],
  ['Where does this one go?', 'question'],
  ['What color is it', 'question'],
  ['Are you building a castle', 'question'],
  ['You made a tower?', 'question'],
  ['Is it a dog or a cat?', 'question'],
  ['How many blocks do you have?', 'question'],
  ['Did you do a good job?', 'question'],
  ["It's a big one, isn't it", 'question'],

  // ----- command -----
  ['Put it here.', 'command'],
  ['Give me the red one.', 'command'],
  ['Look at this.', 'command'],
  ['You need to sit down.', 'command'],
  ["Let's build a house.", 'command'],
  ['Can you hand me that?', 'command'],
  ["Why don't you draw a sun?", 'command'],
  ['How about we use blue?', 'command'],
  ['Please pass the green block.', 'command'],
  ['Try the big one.', 'command'],
  ['Tell me about your picture.', 'command'],
  ['Be careful.', 'command'],
  ['Come here, Mia.', 'command'],
  ['Show me your tower.', 'command'],
  ['Now put the roof on, okay?', 'command'],
  // A command after a praise is still a command: the lead is hers only until the order arrives.
  ['Good job, now put the blue one on top.', 'command'],
  ['Thank you for sharing, now give me the red one.', 'command'],
  ["You're doing great, now give me the red one.", 'command'],
  ['You did it, now put it away.', 'command'],

  // ----- criticism -----
  ['No, not like that.', 'criticism'],
  ["Don't throw it.", 'criticism'],
  ['Stop doing that.', 'criticism'],
  ["That's wrong.", 'criticism'],
  ["You're being too rough.", 'criticism'],
  ["That's not a dog, it's a cat.", 'criticism'],
  ['No.', 'criticism'],
  ["That's not how you do it.", 'criticism'],
  ["You're making a mess, that's bad.", 'criticism'],
  ["I don't like that.", 'criticism'],
  ["You shouldn't bang them.", 'criticism'],
  // Put-downs and bare corrections are never a description of what she is doing.
  ["You're so annoying.", 'criticism'],
  ["You're boring.", 'criticism'],
  ["You're ruining it.", 'criticism'],
  ['Shut up.', 'criticism'],
  ['Not there.', 'criticism'],
  ["That doesn't go there.", 'criticism'],
  ['You broke it.', 'criticism'],

  // ----- not coded -----
  ['...', 'unknown'],
  ['Молодец!', 'unknown'],
];
