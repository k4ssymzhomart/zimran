import type { Scene } from '../types';

/** Scenes are data. Add a scene by adding an object; the engine does not change. */
export const BLOCKS: Scene = {
  id: 'blocks',
  title: 'Blocks',
  intro: 'Mia dumps a box of wooden blocks onto the rug.',
  actions: [
    { does: 'Mia stacks a red block on the tower.', says: 'I made a tower!' },
    { does: 'Mia sets a blue block down very gently.', says: 'This one goes on top.', habit: 'gentle' },
    { does: 'Mia hands you a yellow block.', says: 'This block is for you.', habit: 'sharing' },
    { does: 'Mia lines up three green blocks in a row.', says: 'It is a train.' },
    { does: 'Mia waits while the tower stops wobbling.', says: 'It is wobbly.', habit: 'patient' },
    { does: 'Mia puts the extra blocks back in the box.', says: 'All clean.', habit: 'tidy' },
    { does: 'Mia builds a little bridge between two towers.', says: 'The cars go under here.' },
    { does: 'Mia balances a small block on a big one.', says: 'Look, it stays!' },
    { does: 'Mia bangs two blocks together loudly.', says: 'Boom!', rough: true },
    { does: 'Mia knocks the tower over.', says: 'Crash!', rough: true },
  ],
  wander: { does: 'Mia looks away from the blocks, toward the window.' },
  whine: { does: 'Mia whines and flops onto the rug.', says: "I can't do it!" },
  whineAlt: [
    { does: 'Mia pokes the wobbly tower and groans.', says: 'It keeps falling!' },
    { does: 'Mia drops her block and crosses her arms.', says: 'This is too hard.' },
  ],
  meltdown: { does: 'Mia throws a block across the room.', says: 'No!' },
  scriptedWhineBeat: 5,
  farewell: {
    high: 'Mia hugs your arm. “Play again tomorrow?”',
    mid: 'Mia waves. “Bye-bye, blocks.”',
    low: 'Mia walks off without looking back.',
  },
};

export const DRAWING: Scene = {
  id: 'drawing',
  title: 'Drawing',
  intro: 'Mia opens a box of crayons and pulls a big sheet of paper closer.',
  actions: [
    { does: 'Mia draws a long green line across the page.', says: 'This is the grass.' },
    { does: 'Mia colors slowly inside the circle.', says: 'I stay inside the line.', habit: 'gentle' },
    { does: 'Mia slides the orange crayon over to you.', says: 'You can have orange.', habit: 'sharing' },
    { does: 'Mia draws a yellow sun in the corner.', says: 'The sun is hot.' },
    { does: 'Mia holds her crayon up and waits for you to finish.', says: 'Your turn first.', habit: 'patient' },
    { does: 'Mia puts the crayons back in the box, points up.', says: 'They go to bed.', habit: 'tidy' },
    { does: 'Mia draws a small house with a red door.', says: 'This is our house.' },
    { does: 'Mia adds a dog next to the house.', says: 'The dog is hungry.' },
    { does: 'Mia scribbles hard over the whole picture.', says: 'It is a storm!', rough: true },
    { does: 'Mia snaps a crayon in half.', says: 'It broke.', rough: true },
  ],
  wander: { does: 'Mia puts her crayon down and stares at the ceiling.' },
  whine: { does: 'Mia pushes the paper away and whines.', says: "It doesn't look right!" },
  whineAlt: [
    { does: 'Mia presses the crayon down hard and huffs.', says: 'I messed up.' },
    { does: 'Mia hides the picture under her arm.', says: 'It is not good.' },
  ],
  meltdown: { does: 'Mia sweeps the crayons onto the floor.', says: 'No!' },
  scriptedWhineBeat: 4,
  farewell: {
    high: 'Mia holds up the picture. “This one is for you.”',
    mid: 'Mia waves. “Bye-bye, crayons.”',
    low: 'Mia leaves the picture on the floor and walks away.',
  },
};

/** A calm scene: long stretches of quiet pretend play, and the scripted whine comes late. */
export const KITCHEN: Scene = {
  id: 'kitchen',
  title: 'Play kitchen',
  intro: 'Mia opens the little play kitchen and takes out a pot and a wooden spoon.',
  actions: [
    { does: 'Mia stirs the empty pot with a wooden spoon.', says: "I'm making soup." },
    { does: 'Mia carries a full cup to the table very slowly.', says: 'The tea is hot.', habit: 'gentle' },
    { does: 'Mia sets a plate down in front of you.', says: 'This plate is for you.', habit: 'sharing' },
    { does: 'Mia watches the pot and waits for it to cook.', says: 'The soup needs more time.', habit: 'patient' },
    { does: 'Mia puts the cups back on the little shelf.', says: 'The cups go here.', habit: 'tidy' },
    { does: 'Mia drops a toy carrot into the pot.', says: 'Carrots go in the soup.' },
    { does: 'Mia pours pretend juice into two cups.', says: 'Juice for everybody.' },
    { does: 'Mia taps the spoon on the pot lid.', says: 'Dinner is ready!' },
    { does: 'Mia bangs the pot on the toy stove.', says: 'It is so loud!', rough: true },
    { does: 'Mia tips the pot and the toy food rolls out.', says: 'It all spilled.', rough: true },
  ],
  wander: { does: 'Mia leaves the spoon in the pot and looks out the window.' },
  whine: { does: 'Mia pushes the pot away and whines.', says: 'The soup is ruined!' },
  whineAlt: [
    { does: 'Mia frowns into the empty cup.', says: 'My juice is all gone.' },
    { does: 'Mia drops the lid and slumps.', says: 'The lid keeps falling off.' },
  ],
  meltdown: { does: 'Mia sweeps the cups off the table.', says: 'No!' },
  scriptedWhineBeat: 6,
  farewell: {
    high: 'Mia hands you the last toy cookie. “You can eat here tomorrow.”',
    mid: 'Mia waves the spoon. “Bye-bye, kitchen.”',
    low: 'Mia leaves the pot on the floor and walks away.',
  },
};

/**
 * A harder scene. Mia is tired of tidying before it starts: she begins a little wound up, whines
 * on the second beat, and has more rough moves to fall into. Following her is the practice here too.
 */
export const CLEANUP: Scene = {
  id: 'cleanup',
  title: 'Clean-up time',
  intro: 'Toys cover the rug. Mia starts putting them away, slowly and her own way.',
  actions: [
    { does: 'Mia looks at the toys all over the rug and sighs.', says: 'There are so many toys.' },
    { does: 'Mia lays the doll in the bin very gently.', says: 'The doll goes to sleep.', habit: 'gentle' },
    { does: 'Mia hands you the lid of the toy bin.', says: 'The lid is for you.', habit: 'sharing' },
    { does: 'Mia holds the bin open and waits for your block.', says: 'Your block goes first.', habit: 'patient' },
    { does: 'Mia puts the cars back in the bin one by one.', says: 'The cars go in the bin.', habit: 'tidy' },
    { does: 'Mia stacks the books into a wobbly pile.', says: 'The books make a tower.' },
    { does: 'Mia carries the stuffed bear to the shelf.', says: 'Bear sits up here.' },
    { does: 'Mia finds a puzzle piece under the rug.', says: 'I found the last piece.' },
    { does: 'Mia dumps the bin back out onto the rug.', says: 'I dumped them all out!', rough: true },
    { does: 'Mia kicks a block across the floor.', says: 'It went far!', rough: true },
    { does: 'Mia throws a car at the bin from across the rug.', says: 'It crashed in!', rough: true },
  ],
  wander: { does: 'Mia lies down on the rug and stares at the lamp.' },
  whine: { does: 'Mia flops over the toy bin and whines.', says: 'There are too many!' },
  whineAlt: [
    { does: 'Mia hugs the bear and turns away from the bin.', says: 'I am still playing.' },
    { does: 'Mia drops a car and stomps.', says: 'This takes forever.' },
  ],
  meltdown: { does: 'Mia tips the whole bin over and cries.', says: 'No!' },
  scriptedWhineBeat: 2,
  startTension: 38,
  farewell: {
    high: 'Mia pats the full bin. “All the toys are home.”',
    mid: 'Mia waves at the shelf. “Night-night, toys.”',
    low: 'Mia leaves the last toys on the rug and walks off.',
  },
};

export const SCENES: Scene[] = [BLOCKS, DRAWING, KITCHEN, CLEANUP];

/** The scene with this id, or undefined. A plan day may name its scene; the caller picks the fallback. */
export function sceneById(id: string): Scene | undefined {
  return SCENES.find((s) => s.id === id);
}

/**
 * The free first visit plays blocks, then drawing. The daily plan starts on the two scenes a new
 * family has not seen yet and then goes round all four, so no scene comes up two days in a row.
 */
const ROTATION: Scene[] = [KITCHEN, CLEANUP, BLOCKS, DRAWING];

/** The scene for a day of the plan, 1-based. Anything that is not a day number plays day 1. */
export function sceneForDay(day: number): Scene {
  const n = Number.isFinite(day) ? Math.max(1, Math.floor(day)) : 1;
  return ROTATION[(n - 1) % ROTATION.length];
}
