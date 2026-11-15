/**
 * Simulated child. Deterministic: the same seed and the same parent moves give the same child.
 * It models cause and effect, not a body: each skill has its own effect.
 *   specific praise -> connection, and the named behavior shows up more often
 *   reflection      -> she talks more
 *   description     -> she stays with the toy
 *   question / command / criticism -> focus drops, tension rises
 * These effects follow what the method teaches parents. They are not a validated model of children.
 */
import type { Beat, BeatKind, ChildState, ChildView, Face, Habit, Move, Posture, Scene, SceneAction } from '../types';

const clamp = (n: number): number => Math.max(0, Math.min(100, n));

export function initialChild(seed = 1): ChildState {
  return {
    connection: 55,
    focus: 60,
    talk: 40,
    tension: 25,
    habits: { gentle: 1, sharing: 1, patient: 1, tidy: 1 },
    beat: 0,
    seed,
    waitArmed: 0,
    lastSaid: null,
    lastSaidBeat: 0,
    pendingVent: 0,
  };
}

/** Tension released on the beat after an outburst. Without it one whine would loop for the rest of the round. */
const VENT: Partial<Record<BeatKind, number>> = { whine: 8, scripted_whine: 8, meltdown: 15 };

/** How many beats her last line stays available for a reflection (about 14 seconds). */
const LINE_LASTS_BEATS = 2;

/** [connection, focus, talk, tension] */
export const EFFECTS: Record<Move, [number, number, number, number]> = {
  specific_praise: [6, 2, 1, -3],
  reflection: [4, 1, 8, -2],
  description: [3, 7, 1, -2],
  general_praise: [2, 0, 0, -1],
  neutral: [1, 0, 0, 0],
  question: [-1, -5, -3, 3],
  command: [-4, -7, -2, 8],
  criticism: [-9, -4, -5, 12],
  copy: [5, 3, 1, -2],
  wait: [0, 0, 0, 0],
  unknown: [0, 0, 0, 0],
};

const AVOID: Move[] = ['question', 'command', 'criticism'];
/** Tension at which "wait quietly" starts to work (minor whining). */
const WAIT_WORKS_FROM = 45;
const WAIT_BEATS = 2;
const WAIT_RELIEF = 6;
const HABIT_GAIN = 0.5;
/**
 * Copying her play warms her up to here and no further. Without this ceiling a parent who only taps
 * "Copy her" and never says a word would fill the connection bar; the rest of the way takes words.
 */
export const COPY_CONNECTION_CEILING = 65;
/** Beats that are an outburst. The coach does not ask the parent to answer these; see coach/policy.ts. */
export const isOutburst = (kind: BeatKind): boolean => kind === 'whine' || kind === 'scripted_whine' || kind === 'meltdown';

/** Apply one parent move. Returns a new state; never mutates. */
export function applyMove(state: ChildState, move: Move, namedBehavior?: Habit): ChildState {
  const [dc, df, dt, dx] = EFFECTS[move];
  const next: ChildState = {
    ...state,
    habits: { ...state.habits },
    connection: clamp(state.connection + dc),
    focus: clamp(state.focus + df),
    talk: clamp(state.talk + dt),
    tension: clamp(state.tension + dx),
  };
  if (move === 'specific_praise' && namedBehavior) next.habits[namedBehavior] += HABIT_GAIN;
  // A copy never lowers the bar either: above the ceiling it leaves connection where it is.
  if (move === 'copy') next.connection = Math.max(state.connection, Math.min(COPY_CONNECTION_CEILING, next.connection));
  if (move === 'wait') next.waitArmed = state.tension >= WAIT_WORKS_FROM ? WAIT_BEATS : 0;
  // Talking at her while "waiting" cancels the wait.
  if (AVOID.includes(move)) next.waitArmed = 0;
  return next;
}

/** mulberry32: returns a number in [0, 1) and the next seed. */
function rand(seed: number): [number, number] {
  const next = (seed + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/** Weight of every action in the scene for the current state. Exported for tests. */
export function actionWeights(scene: Scene, state: ChildState): number[] {
  return scene.actions.map((a) => {
    const habit = a.habit ? state.habits[a.habit] : 1;
    const rough = a.rough ? 0.3 + state.tension / 50 : 1;
    return habit * rough;
  });
}

function pick(scene: Scene, state: ChildState, r: number): SceneAction {
  const weights = actionWeights(scene, state);
  const total = weights.reduce((a, b) => a + b, 0);
  let x = r * total;
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i];
    if (x < 0) return scene.actions[i];
  }
  return scene.actions[scene.actions.length - 1];
}

/** Advance one beat (about 6-8 seconds of play). Returns the new state and what she does and says. */
export function tick(state: ChildState, scene: Scene): { state: ChildState; beat: Beat } {
  const s: ChildState = {
    ...state,
    habits: { ...state.habits },
    beat: state.beat + 1,
    focus: clamp(state.focus - 1),
    tension: clamp(state.tension - state.pendingVent + 1),
    pendingVent: 0,
  };

  if (s.waitArmed > 0) {
    s.waitArmed -= 1;
    if (s.waitArmed === 0) s.tension = clamp(s.tension - WAIT_RELIEF);
  }

  let kind: BeatKind;
  if (s.beat === scene.scriptedWhineBeat) {
    s.tension = clamp(s.tension + 15);
    kind = 'scripted_whine';
  } else if (s.tension >= 70) kind = 'meltdown';
  else if (s.tension >= 50) kind = 'whine';
  else if (s.focus < 30) kind = 'wander';
  else kind = 'play';

  let action: SceneAction;
  let speaks = true;
  if (kind === 'play') {
    const [r1, seed1] = rand(s.seed);
    const [r2, seed2] = rand(seed1);
    s.seed = seed2;
    action = pick(scene, s, r1);
    speaks = r2 < s.talk / 100;
  } else if (kind === 'wander') action = scene.wander;
  else if (kind === 'meltdown') action = scene.meltdown;
  else {
    const whines = [scene.whine, ...(scene.whineAlt ?? [])];
    action = whines[s.beat % whines.length];
  }
  s.pendingVent = VENT[kind] ?? 0;

  const says = speaks && action.says ? action.says : null;
  if (says !== null) {
    s.lastSaid = says;
    s.lastSaidBeat = s.beat;
  } else if (s.beat - s.lastSaidBeat >= LINE_LASTS_BEATS) {
    s.lastSaid = null;
  }
  return { state: s, beat: { kind, does: action.does, says, ...(action.habit ? { habit: action.habit } : {}) } };
}

/** What the screen shows: face and posture from thresholds, plus the three bars. */
export function view(state: ChildState): ChildView {
  let face: Face;
  if (state.tension >= 70) face = 'crying';
  else if (state.tension >= 50) face = 'pouting';
  else if (state.connection >= 75) face = 'beaming';
  else if (state.connection >= 50) face = 'smiling';
  else face = 'neutral';

  let posture: Posture;
  if (state.tension >= 70 || state.connection < 35) posture = 'turned_away';
  else if (state.connection >= 70) posture = 'leaning_in';
  else posture = 'at_toy';

  return { face, posture, connection: state.connection, focus: state.focus, talk: state.talk };
}

/** One-line reaction shown immediately after the parent's move, before the next beat. */
export const MICRO_REACTION: Record<Move, string> = {
  specific_praise: 'Mia grins and holds it up for you to see.',
  reflection: 'Mia nods. "Yeah!" She keeps talking.',
  description: 'Mia stays with it, concentrating.',
  general_praise: 'Mia glances up and smiles.',
  neutral: 'Mia keeps playing.',
  question: 'Mia stops and looks up to answer.',
  command: "Mia's hand hovers. She frowns a little.",
  criticism: "Mia's shoulders drop.",
  copy: 'Mia giggles. You are doing it too!',
  wait: 'You stay calm and wait.',
  unknown: '',
};

/** Which goodbye she gives at the end of a round. */
export function farewell(state: ChildState, scene: Scene): string {
  if (state.tension >= 60 || state.connection < 40) return scene.farewell.low;
  if (state.connection >= 70) return scene.farewell.high;
  return scene.farewell.mid;
}
