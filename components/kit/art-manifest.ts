/**
 * Every picture the screens can show, with its real pixel size, so next/image never guesses.
 * Generated from public/art, public/mia, public/leo, public/parent and public/scene: regenerate it when a file is added.
 * It is not called art.ts because Art.tsx sits beside it, and the two names would be one file on a disk that ignores case.
 */
import type { PartnerId } from '@/lib/types';

export interface ArtFile {
  src: string;
  width: number;
  height: number;
}

/** The glossy violet 3D objects in public/art. */
export type ArtName =
  | 'alarm'
  | 'badge'
  | 'ball'
  | 'bath'
  | 'bell'
  | 'blocks'
  | 'book'
  | 'breakfast'
  | 'bubbles'
  | 'cake'
  | 'car'
  | 'card'
  | 'cassette'
  | 'chart-card'
  | 'clipboard'
  | 'cloud'
  | 'coach'
  | 'compass'
  | 'crayons'
  | 'crown'
  | 'daycare'
  | 'describe'
  | 'dinner'
  | 'dino'
  | 'document'
  | 'door'
  | 'drawing'
  | 'duck'
  | 'duo'
  | 'ear'
  | 'earbud'
  | 'envelope'
  | 'follow'
  | 'gear'
  | 'gem'
  | 'gift'
  | 'globe'
  | 'gradcap'
  | 'headphones'
  | 'heart'
  | 'highlighter'
  | 'hourglass'
  | 'key'
  | 'lifering'
  | 'lightbulb'
  | 'lock'
  | 'medal-check'
  | 'medal-flame'
  | 'medal-heart'
  | 'medal-star'
  | 'medal'
  | 'megaphone'
  | 'mic-off'
  | 'microphone'
  | 'moon'
  | 'mug'
  | 'nametag'
  | 'party'
  | 'pause'
  | 'pegboard'
  | 'phone'
  | 'plan'
  | 'plant'
  | 'play'
  | 'praise'
  | 'progress'
  | 'puzzle'
  | 'record'
  | 'reflect'
  | 'replay'
  | 'rings'
  | 'rocket'
  | 'rosette'
  | 'scales'
  | 'search-speech'
  | 'seedling'
  | 'shield'
  | 'sneaker'
  | 'sofa'
  | 'sparkle'
  | 'stacker'
  | 'stairs'
  | 'stethoscope'
  | 'stopwatch'
  | 'streak'
  | 'summit'
  | 'sun'
  | 'swap'
  | 'tab-home-off'
  | 'tab-home'
  | 'tab-practice-off'
  | 'tab-practice'
  | 'tab-profile-off'
  | 'tab-profile'
  | 'tab-progress-off'
  | 'tab-progress'
  | 'tablet'
  | 'target'
  | 'teddies'
  | 'teddy'
  | 'timer'
  | 'toggle'
  | 'train'
  | 'trash'
  | 'tree'
  | 'trophy'
  | 'typing'
  | 'wand';

export const ART: Record<ArtName, ArtFile> = {
  alarm: { src: '/art/alarm.png', width: 512, height: 512 },
  badge: { src: '/art/badge.png', width: 384, height: 384 },
  ball: { src: '/art/ball.png', width: 512, height: 512 },
  bath: { src: '/art/bath.png', width: 384, height: 384 },
  bell: { src: '/art/bell.png', width: 512, height: 512 },
  blocks: { src: '/art/blocks.png', width: 384, height: 384 },
  book: { src: '/art/book.png', width: 512, height: 512 },
  breakfast: { src: '/art/breakfast.png', width: 384, height: 384 },
  bubbles: { src: '/art/bubbles.png', width: 512, height: 512 },
  cake: { src: '/art/cake.png', width: 512, height: 512 },
  car: { src: '/art/car.png', width: 512, height: 512 },
  card: { src: '/art/card.png', width: 512, height: 512 },
  cassette: { src: '/art/cassette.png', width: 512, height: 512 },
  'chart-card': { src: '/art/chart-card.png', width: 512, height: 512 },
  clipboard: { src: '/art/clipboard.png', width: 512, height: 512 },
  cloud: { src: '/art/cloud.png', width: 512, height: 512 },
  coach: { src: '/art/coach.png', width: 384, height: 384 },
  compass: { src: '/art/compass.png', width: 512, height: 512 },
  crayons: { src: '/art/crayons.png', width: 384, height: 384 },
  crown: { src: '/art/crown.png', width: 512, height: 512 },
  daycare: { src: '/art/daycare.png', width: 384, height: 384 },
  describe: { src: '/art/describe.png', width: 512, height: 512 },
  dinner: { src: '/art/dinner.png', width: 384, height: 384 },
  dino: { src: '/art/dino.png', width: 512, height: 512 },
  document: { src: '/art/document.png', width: 512, height: 512 },
  door: { src: '/art/door.png', width: 512, height: 512 },
  drawing: { src: '/art/drawing.png', width: 384, height: 384 },
  duck: { src: '/art/duck.png', width: 512, height: 512 },
  duo: { src: '/art/duo.png', width: 1100, height: 942 },
  ear: { src: '/art/ear.png', width: 512, height: 512 },
  earbud: { src: '/art/earbud.png', width: 384, height: 384 },
  envelope: { src: '/art/envelope.png', width: 512, height: 512 },
  follow: { src: '/art/follow.png', width: 384, height: 384 },
  gear: { src: '/art/gear.png', width: 512, height: 512 },
  gem: { src: '/art/gem.png', width: 512, height: 512 },
  gift: { src: '/art/gift.png', width: 384, height: 384 },
  globe: { src: '/art/globe.png', width: 512, height: 512 },
  gradcap: { src: '/art/gradcap.png', width: 512, height: 512 },
  headphones: { src: '/art/headphones.png', width: 512, height: 512 },
  heart: { src: '/art/heart.png', width: 512, height: 512 },
  highlighter: { src: '/art/highlighter.png', width: 512, height: 512 },
  hourglass: { src: '/art/hourglass.png', width: 384, height: 384 },
  key: { src: '/art/key.png', width: 512, height: 512 },
  lifering: { src: '/art/lifering.png', width: 512, height: 512 },
  lightbulb: { src: '/art/lightbulb.png', width: 384, height: 384 },
  lock: { src: '/art/lock.png', width: 384, height: 384 },
  'medal-check': { src: '/art/medal-check.png', width: 512, height: 512 },
  'medal-flame': { src: '/art/medal-flame.png', width: 512, height: 512 },
  'medal-heart': { src: '/art/medal-heart.png', width: 512, height: 512 },
  'medal-star': { src: '/art/medal-star.png', width: 512, height: 512 },
  medal: { src: '/art/medal.png', width: 512, height: 512 },
  megaphone: { src: '/art/megaphone.png', width: 512, height: 512 },
  'mic-off': { src: '/art/mic-off.png', width: 512, height: 512 },
  microphone: { src: '/art/microphone.png', width: 384, height: 384 },
  moon: { src: '/art/moon.png', width: 512, height: 512 },
  mug: { src: '/art/mug.png', width: 512, height: 512 },
  nametag: { src: '/art/nametag.png', width: 512, height: 512 },
  party: { src: '/art/party.png', width: 384, height: 384 },
  pause: { src: '/art/pause.png', width: 512, height: 512 },
  pegboard: { src: '/art/pegboard.png', width: 512, height: 512 },
  phone: { src: '/art/phone.png', width: 512, height: 512 },
  plan: { src: '/art/plan.png', width: 512, height: 512 },
  plant: { src: '/art/plant.png', width: 512, height: 512 },
  play: { src: '/art/play.png', width: 512, height: 512 },
  praise: { src: '/art/praise.png', width: 512, height: 512 },
  progress: { src: '/art/progress.png', width: 512, height: 512 },
  puzzle: { src: '/art/puzzle.png', width: 512, height: 512 },
  record: { src: '/art/record.png', width: 512, height: 512 },
  reflect: { src: '/art/reflect.png', width: 512, height: 512 },
  replay: { src: '/art/replay.png', width: 384, height: 384 },
  rings: { src: '/art/rings.png', width: 1200, height: 1200 },
  rocket: { src: '/art/rocket.png', width: 512, height: 512 },
  rosette: { src: '/art/rosette.png', width: 512, height: 512 },
  scales: { src: '/art/scales.png', width: 512, height: 512 },
  'search-speech': { src: '/art/search-speech.png', width: 512, height: 512 },
  seedling: { src: '/art/seedling.png', width: 512, height: 512 },
  shield: { src: '/art/shield.png', width: 384, height: 384 },
  sneaker: { src: '/art/sneaker.png', width: 512, height: 512 },
  sofa: { src: '/art/sofa.png', width: 512, height: 512 },
  sparkle: { src: '/art/sparkle.png', width: 512, height: 512 },
  stacker: { src: '/art/stacker.png', width: 512, height: 512 },
  stairs: { src: '/art/stairs.png', width: 512, height: 512 },
  stethoscope: { src: '/art/stethoscope.png', width: 512, height: 512 },
  stopwatch: { src: '/art/stopwatch.png', width: 512, height: 512 },
  streak: { src: '/art/streak.png', width: 384, height: 384 },
  summit: { src: '/art/summit.png', width: 512, height: 512 },
  sun: { src: '/art/sun.png', width: 512, height: 512 },
  swap: { src: '/art/swap.png', width: 384, height: 384 },
  'tab-home-off': { src: '/art/tab-home-off.png', width: 512, height: 512 },
  'tab-home': { src: '/art/tab-home.png', width: 512, height: 512 },
  'tab-practice-off': { src: '/art/tab-practice-off.png', width: 512, height: 512 },
  'tab-practice': { src: '/art/tab-practice.png', width: 512, height: 512 },
  'tab-profile-off': { src: '/art/tab-profile-off.png', width: 512, height: 512 },
  'tab-profile': { src: '/art/tab-profile.png', width: 512, height: 512 },
  'tab-progress-off': { src: '/art/tab-progress-off.png', width: 512, height: 512 },
  'tab-progress': { src: '/art/tab-progress.png', width: 512, height: 512 },
  tablet: { src: '/art/tablet.png', width: 512, height: 512 },
  target: { src: '/art/target.png', width: 512, height: 512 },
  teddies: { src: '/art/teddies.png', width: 512, height: 512 },
  teddy: { src: '/art/teddy.png', width: 512, height: 512 },
  timer: { src: '/art/timer.png', width: 512, height: 512 },
  toggle: { src: '/art/toggle.png', width: 512, height: 512 },
  train: { src: '/art/train.png', width: 512, height: 512 },
  trash: { src: '/art/trash.png', width: 512, height: 512 },
  tree: { src: '/art/tree.png', width: 512, height: 512 },
  trophy: { src: '/art/trophy.png', width: 384, height: 384 },
  typing: { src: '/art/typing.png', width: 384, height: 384 },
  wand: { src: '/art/wand.png', width: 512, height: 512 },
};

/** Head-and-shoulders portraits. Mia and Leo have the same seven. */
export type FacePose = 'away' | 'beaming' | 'crying' | 'leaning' | 'neutral' | 'pouting' | 'smiling';

/** Full-body poses. Each child has two scene poses the other lacks. */
export type MiaBodyPose =
  | 'body-blocks'
  | 'body-crying'
  | 'body-drawing'
  | 'body-jumping'
  | 'body-pouting'
  | 'body-running'
  | 'body-showing'
  | 'body-waving';
export type LeoBodyPose =
  | 'body-car'
  | 'body-crying'
  | 'body-jumping'
  | 'body-pouting'
  | 'body-running'
  | 'body-showing'
  | 'body-teddy'
  | 'body-waving';

export type Pose = FacePose | MiaBodyPose | LeoBodyPose;

export const MIA: Record<FacePose | MiaBodyPose, ArtFile> = {
  away: { src: '/mia/away.png', width: 640, height: 640 },
  beaming: { src: '/mia/beaming.png', width: 640, height: 640 },
  'body-blocks': { src: '/mia/body-blocks.png', width: 768, height: 768 },
  'body-crying': { src: '/mia/body-crying.png', width: 768, height: 768 },
  'body-drawing': { src: '/mia/body-drawing.png', width: 768, height: 768 },
  'body-jumping': { src: '/mia/body-jumping.png', width: 768, height: 768 },
  'body-pouting': { src: '/mia/body-pouting.png', width: 768, height: 768 },
  'body-running': { src: '/mia/body-running.png', width: 768, height: 768 },
  'body-showing': { src: '/mia/body-showing.png', width: 768, height: 768 },
  'body-waving': { src: '/mia/body-waving.png', width: 768, height: 768 },
  crying: { src: '/mia/crying.png', width: 640, height: 640 },
  leaning: { src: '/mia/leaning.png', width: 640, height: 640 },
  neutral: { src: '/mia/neutral.png', width: 640, height: 640 },
  pouting: { src: '/mia/pouting.png', width: 640, height: 640 },
  smiling: { src: '/mia/smiling.png', width: 640, height: 640 },
};

export const LEO: Record<FacePose | LeoBodyPose, ArtFile> = {
  away: { src: '/leo/away.png', width: 640, height: 640 },
  beaming: { src: '/leo/beaming.png', width: 640, height: 640 },
  'body-car': { src: '/leo/body-car.png', width: 768, height: 768 },
  'body-crying': { src: '/leo/body-crying.png', width: 768, height: 768 },
  'body-jumping': { src: '/leo/body-jumping.png', width: 768, height: 768 },
  'body-pouting': { src: '/leo/body-pouting.png', width: 768, height: 768 },
  'body-running': { src: '/leo/body-running.png', width: 768, height: 768 },
  'body-showing': { src: '/leo/body-showing.png', width: 768, height: 768 },
  'body-teddy': { src: '/leo/body-teddy.png', width: 768, height: 768 },
  'body-waving': { src: '/leo/body-waving.png', width: 768, height: 768 },
  crying: { src: '/leo/crying.png', width: 640, height: 640 },
  leaning: { src: '/leo/leaning.png', width: 640, height: 640 },
  neutral: { src: '/leo/neutral.png', width: 640, height: 640 },
  pouting: { src: '/leo/pouting.png', width: 640, height: 640 },
  smiling: { src: '/leo/smiling.png', width: 640, height: 640 },
};

/** The picture of a child in a pose. A scene pose only the other child has falls back to `body-showing`. */
export function portraitFile(partner: PartnerId, pose: Pose): ArtFile {
  const own = partner === 'mia' ? MIA : LEO;
  const all: Partial<Record<Pose, ArtFile>> = own;
  return all[pose] ?? own['body-showing'];
}

export type ParentName = 'dad' | 'mum';

export const PARENT: Record<ParentName, ArtFile> = {
  dad: { src: '/parent/dad.png', width: 640, height: 640 },
  mum: { src: '/parent/mum.png', width: 640, height: 640 },
};

/** A parent and a child together, for the live-mode screens. */
export type SceneArtName = 'dad-leo' | 'mum-mia';

export const SCENE_ART: Record<SceneArtName, ArtFile> = {
  'dad-leo': { src: '/scene/dad-leo.png', width: 1024, height: 1024 },
  'mum-mia': { src: '/scene/mum-mia.png', width: 1024, height: 1024 },
};
