import type { Scene } from '../types';

/** Scenes are data. Add a scene by adding an object; the engine does not change. */
export const BLOCKS: Scene = {
  id: 'blocks',
  title: 'Blocks',
  intro: 'Mia tips a box of wooden blocks onto the rug.',
  actions: [
    { does: 'Mia stacks a red block on the tower.', says: 'I made a tower!' },
    { does: 'Mia sets a blue block down very gently.', says: 'This one goes on top.', habit: 'gentle' },
    { does: 'Mia hands you a yellow block.', says: 'This block is for you.', habit: 'sharing' },
    { does: 'Mia lines up three green blocks in a row.', says: 'It is a train.' },
    { does: 'Mia waits while the tower stops wobbling.', says: 'It is wobbly.', habit: 'patient' },
    { does: 'Mia puts the spare blocks back in the box.', says: 'All clean.', habit: 'tidy' },
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
    high: 'Mia hugs your arm. "Play again tomorrow?"',
    mid: 'Mia waves. "Bye-bye, blocks."',
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
    { does: 'Mia puts the crayons back in the box, tips up.', says: 'They go to bed.', habit: 'tidy' },
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
    high: 'Mia holds up the picture. "This one is for you."',
    mid: 'Mia waves. "Bye-bye, crayons."',
    low: 'Mia leaves the picture on the floor and walks away.',
  },
};

export const SCENES: Scene[] = [BLOCKS, DRAWING];
