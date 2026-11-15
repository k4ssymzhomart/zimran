/**
 * The words the coder knows. Two uses:
 *  - a ring needs a real word: "You're blahing the foo" and "nice yy" name nothing, so they fill nothing;
 *  - a sentence with almost no English in it ("muy bien") is not coded at all.
 *
 * The lists are generous on purpose. A parent who describes honest play must almost never fall outside
 * them; a missing word costs that parent a ring, a made-up word that slips in costs nothing.
 * Pure data: no network, no clock, no randomness.
 */
import { SCENES } from '../child/scenes';

const list = (s: string): string[] => s.split(/\s+/).filter(Boolean);

/**
 * Verbs a description may start with: "You stacked three blocks." Past and base forms, as typed.
 * Verbs that are an order in their base form after "you" ("You stop", "You wait") are listed in the past only.
 */
export const ACTION: ReadonlySet<string> = new Set(
  list(`
    put made make built build drew draw picked pick chose choose stacked stack colored color placed place moved
    move pushed push pulled pull turned turn added add found find took take gave give shared share rolled roll
    lined line opened open closed close mixed mix poured pour cut held hold set knocked knock fixed fix connected
    connect pressed press used use got get tried try finished finish started start filled fill drove drive flew
    fly fed feed washed wash cooked cook hid hide dropped drop lifted lift balanced balance matched match sorted
    sort painted paint wrote write counted count handed hand brought bring parked park covered cover wrapped wrap
    kept keep went go came come sat sit stood stand jumped jump ran run threw throw laid lay squeezed squeeze
    tapped tap showed show grabbed grab carried carry sang sing tucked tuck wiped wipe stirred stir scooped scoop
    let dug dig bounced bounce caught catch kicked kick attached attach joined join dressed dress brushed brush
    waited stopped worked helped cleaned tidied listened noticed remembered decided planned checked played
    shook shake slid slide spun spin swept sweep hung hang sent send won win rode ride wore wear ate eat
    drank drink slept sleep woke wake blew blow grew grow swam swim bent bend stuck stick tore tear taught teach
  `),
);

/** More play verbs, base form. Their -ing, -ed and -s forms are generated below. */
const PLAY_VERBS = list(`
  arrange ask bake bang bathe beep blend blink boil borrow bow braid breathe bring bubble buckle bump button buzz
  call calm celebrate chase cheer chew chop clap click climb collect comb concentrate copy crash crawl create
  crumple cuddle curl dab dance decorate design dip discover dive doodle drag dress dribble drip drum dry dump
  dust empty erase explore fit flap flatten flip float focus fold follow gallop gather giggle glide glue guess
  hammer haul heap help hop hug hum hunt imagine invent jingle juggle kiss knead kneel knit lace laugh lead lean
  leap learn lick link load lock march measure mold mop nap nod offer organize pack paddle paste pat pedal peek
  peel pet pile pinch plant poke pop practice pretend print race rake rattle reach relax rest return rinse rip
  rock row rub sail save scatter scribble scrub search sew shade shape sharpen shout sip skate sketch skip slice
  smear smile smooth snap snip snuggle spill splash spread sprinkle squirt squish stamp steer step stomp stretch
  string stroke strum swing switch tape taste thread tickle tie tilt tiptoe toss touch tow trace trade trim
  twirl twist unlock unpack untie unzip visit walk watch water wave weave whisper whistle wiggle wink wobble
  wonder yawn zip zoom
  check clean decide figure listen look notice plan play remember say stop tell think tidy wait work
`);

/** Things in a playroom and in pretend play: toys, animals, food, clothes, body, art supplies, vehicles, places. */
const THINGS = list(`
  airplane airport animal ant apple apron arm baby back backpack bag ball balloon banana barn basket bath
  bathroom beach bead bear bed bedroom bee bell belt bib bike bin bird blanket block boat body book boot bottle
  bottom bow bowl box boy bread breakfast brick bridge broom brother brush bubble bucket bug building bunny bus
  butterfly button cake candy cape car card carpet carrot castle cat cave cereal chair chalk cheek cheese
  chicken chin choice circle clay clock cloud coat color colour cone cookie corn corner couch cow crab crayon
  crown cube cup daddy dad diamond digger dinner dinosaur doctor dog doll dolly dolphin door dot dough dragon
  drawing drawer dress drum duck ear edge egg elbow elephant engine eye face fairy family farm farmer feet
  fence finger fire firefighter fish flag floor flower foot fork fort fox friend fridge frog fruit game garage
  garden gate giraffe girl glove goat grandma grandpa grape grass guitar hair hammer hand hands hat head heart
  helicopter helping hen hill hippo home horse hospital house ice idea jacket jar juice kangaroo kettle key
  kid king kitchen kite kitten knee knife knight ladder lake lamp leaf lego leg letter lid line lion listening
  lizard lunch magnet mama manners marker mask milk mitten mom mommy monkey monster moon mountain mouse mouth
  music name napkin neck nest noodle nose number ocean octopus oval oven owl page paint painting pajamas pan
  pants papa paper park pasta pattern pea pencil pen penguin piano picnic picture pie piece pig pillow pilot
  pirate pizza plane plate playdoh playdough playground pocket pony pool pot potato prince princess puddle
  pumpkin puppet puppy purse puzzle queen rabbit race rain rainbow ramp rectangle rhino ribbon rice ring river
  road robot rock rocket roof room rooster rope row rug salad sand sandwich scarf school scissors sea seat
  shape shark sharing sheep shelf ship shirt shoe shop shoulder side sink sister skirt sky sled slide snack
  snail snake snow snowman soap sock sofa song soup spider sponge spoon square stairs star station step
  sticker stick stone store storm story stove strawberry street string stripe sun superhero sweater swing table
  tail tea teacher teddy teeth tent thumb tiger tile toast toe tomato tongue tooth top towel tower toy tractor
  track train tray tree triangle truck try tummy tunnel turn turtle umbrella unicorn van vegetable voice wagon
  waiting wall wand water whale wheel wind window wing wolf word work worm yard zebra zipper zoo
`);

/** Everyday words around play: people, time, weather, pretend jobs, and what a praise may name ("great teamwork"). */
const EVERYDAY = list(`
  cartwheel catch goal handstand kick pose shot somersault throw
  example exact praise specific compliment
  accident adventure air alien alphabet answer art artist astronaut attention aunt baker balance bandage beginning
  birthday bit bite breath builder bunch camera chance chef child children city clothes coin collection
  concentration construction cooperation corner cousin craft creation creativity customer dancer day decision
  description design direction dirt dream driver earth effort end energy family feeling fireman focus food
  fun gift ghost giant glass ground group guest height helper holiday hole hug imagination invention joke
  journey kindness kiss lady laugh length lesson magic man map masterpiece meal medicine memory mermaid mess
  metal middle minute mistake moment money morning mud night noise nurse officer pair painter part party
  patience people person phone place plastic player police power present problem project question reflection
  rule season secret sentence shadow singer size smell smoke solution sound space speed spot spring start
  strength structure student summer surprise taste team teamwork thinking ticket town treasure trick trip
  uncle village walk waiter weather week weekend weight winter witch wizard woman wood worker world year

  accept act control express greet handle obey speak spend spent talk treat
  agree answer apologize behave begin belong bother break broke broken build buy care change continue cooperate
  cry describe enjoy explain fall fell fallen feel finish forgive happen hear hurt include invite lose lost
  manage matter miss mention need pause pay prefer promise repeat respect scream sell solve stay trust visit
  worry yell

  afraid alike asleep awake bored broken cheerful comfortable complete confident confused cranky curious
  dangerous delicious determined double easy enormous entire exciting extra famous fresh frustrated gigantic
  healthy important independent interesting jealous large lonely lucky magical massive medium messy miniature
  nervous organized peaceful playful possible respectful responsible serious simple single surprised tricky
  true upset whole worried young
`);

/** How things look, feel and sound: colors, sizes, feelings, and the ways of behaving a praise names. */
const QUALITIES = list(`
  angry big black blue brave bright brown bumpy busy calm careful clean cold colorful cozy creative crooked
  curly curvy dark deep different dirty dry empty even excited fair fancy fast fat favorite flat fluffy focused
  friendly full funny fuzzy generous gentle giant glad gold gray green grey grumpy happy hard heavy helpful high
  hot huge hungry kind light little long loud low mad narrow neat new noisy old orange patient pink plain
  polite purple quick quiet ready real red rough round sad safe scared scary shiny short shy silly silver
  sleepy slippery slow small smooth soft sour sparkly special spicy steady sticky still straight strong sturdy
  sweet tall tasty thick thin thirsty thoughtful tidy tiny tippy tired warm wet white wide wild wobbly wooden
  yellow yummy
`);

/** Play sounds are English enough to be coded ("Vroom!"), but they are not a "what" for a praise. */
const SOUNDS = list(`
  achoo baa bam beep boing boo boom brr bzz choo chomp clang clink crash ding dong drip eek flap hee hiss honk
  hooray hurray la da ta na nom meow mmm moo neigh oink peekaboo ping plop pow quack ribbit roar rumble shh sizzle splat
  swish swoosh tada thud tick tock toot tweet uh vroom wee whee whoosh woof yum zap zoom
`);

/** Grammar words and everyday filler: English, but they name no action and no play thing. */
const FUNCTION_WORDS = list(`
  a about above absolutely actually across after again against ago ah all almost alone along already also always am an and another
  goodness gosh grief luck huh mhm mm yep yup nah worst nobody shame
  basically certainly completely definitely especially exactly finally hardly honestly literally mostly normally probably seriously simply suddenly totally truly usually
  any anybody anymore anyone anything anyway are around as at aw away aww be because been before behind being
  below beside best better between both but by bye can can't cannot could dear did do does doing done down
  during each either else enough even ever every everybody everyone everything everywhere except far few for
  forever from front goodbye gonna gotta had half has have having he hello her here hers herself hey hi him
  himself his hm hmm how however i if in inside instead into is it its itself just kinda last later least
  less let lot lots many may maybe me might mine more most much must my myself near nearly never next no nobody
  none nope nor not nothing now of off often oh ok okay on once one only onto oops or other others our ours
  ourselves out outside over own please pretty quite rather really right same she should since so some somebody
  someone something sometimes somewhere soon sorry still such sure than thank thanks that the their theirs them
  themselves then there these they thing things this those though through till time times to today together
  tomorrow tonight too toward towards under until up upon us very was way we well were what whatever when
  where whether which while who whoa whole whom whose why will with within without won't wow would yay yeah yes
  yesterday yet you your yours yourself

  zero two three four five six seven eight nine ten eleven twelve twenty hundred first second third

  awesome amazing bad beautiful beautifully boring bravo brilliant clever cool cute dumb excellent fantastic
  fine fun good gorgeous great incredible impressive lovely mean naughty neat nice nicely perfect proud rude
  smart stupid super terrific ugly wonderful wrong

  ain't become became begin began believe bet care feel felt forget forgot goes gone happen happened hear heard
  hope let like liked love loved mean meant mind need needed see seem seen saw says suppose understand want
  wanted wanna wish wished job mia sweetie sweetheart honey buddy kiddo champ pal
`);

// ---------- spelling rules ----------

/** A one-syllable word that ends vowel-consonant doubles its last letter: stop -> stopping, hum -> hummed. */
const doubles = (w: string): boolean => /^[^aeiou]*[aeiou][bdgmnprt]$/.test(w);

/** work -> works, carry -> carries, wash -> washes, box -> boxes. */
function sForm(w: string): string {
  if (/(?:s|x|z|ch|sh)$/.test(w)) return `${w}es`;
  if (/[^aeiou]y$/.test(w)) return `${w.slice(0, -1)}ies`;
  return `${w}s`;
}

/** stack -> stacking, balance -> balancing, stop -> stopping, tie -> tying. */
function ingForm(w: string): string {
  if (/ie$/.test(w)) return `${w.slice(0, -2)}ying`;
  if (/[^aeioy]e$/.test(w)) return `${w.slice(0, -1)}ing`;
  if (doubles(w)) return `${w}${w.slice(-1)}ing`;
  return `${w}ing`;
}

/** stack -> stacked, balance -> balanced, stop -> stopped, carry -> carried. */
function edForm(w: string): string {
  if (/e$/.test(w)) return `${w}d`;
  if (/[^aeiou]y$/.test(w)) return `${w.slice(0, -1)}ied`;
  if (doubles(w)) return `${w}${w.slice(-1)}ed`;
  return `${w}ed`;
}

/** gentle -> gently, happy -> happily, careful -> carefully, tall -> taller, tallest. */
function qualityForms(w: string): string[] {
  const y = /[^aeiou]y$/.test(w) ? w.slice(0, -1) : null;
  const ly = y ? `${y}ily` : /le$/.test(w) ? `${w.slice(0, -1)}y` : `${w}ly`;
  const stemmed = y ? `${y}i` : /e$/.test(w) ? w.slice(0, -1) : doubles(w) ? `${w}${w.slice(-1)}` : w;
  return [ly, `${stemmed}er`, `${stemmed}est`];
}

// ---------- the vocabulary ----------

const FUNCTION: ReadonlySet<string> = new Set(FUNCTION_WORDS);

const sceneTexts = (): string[] =>
  SCENES.flatMap((scene) => [
    scene.title,
    scene.intro,
    ...[...scene.actions, scene.wander, scene.whine, ...(scene.whineAlt ?? []), scene.meltdown].flatMap((a) => [a.does, a.says ?? '']),
    ...Object.values(scene.farewell),
  ]);

/** Every word of every scene: what Mia does and says is the first thing a parent describes and says back. */
const sceneWords = (): string[] =>
  sceneTexts()
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z' ]+/g, ' ')
    .split(' ')
    .map((w) => w.replace(/^'+|'+$/g, '').replace(/'s$/, ''))
    .filter((w) => w.length > 1 && !w.includes("'"));

/** "Mia stacks", "and waits" -> stack, wait. */
const sceneVerbs = (): string[] =>
  Array.from(sceneTexts().join(' ').toLowerCase().matchAll(/\b(?:mia|and) ([a-z]{3,}s)\b/g), (m) =>
    /(?:ss|sh|ch|x|z)es$/.test(m[1]) ? m[1].slice(0, -2) : /[^aeiou]ies$/.test(m[1]) && m[1].length > 4 ? `${m[1].slice(0, -3)}y` : m[1].slice(0, -1),
  );

/** Every form of the action and play verbs: "stack", "stacks", "stacking", "stacked". */
const VERB_FORMS: ReadonlySet<string> = new Set([...ACTION, ...PLAY_VERBS].flatMap((v) => [v, sForm(v), ingForm(v), edForm(v)]));

function buildVocabulary(): Set<string> {
  const out = new Set<string>(VERB_FORMS);
  for (const n of [...THINGS, ...EVERYDAY]) for (const form of [n, sForm(n), ingForm(n), edForm(n)]) out.add(form);
  for (const q of QUALITIES) for (const form of [q, ...qualityForms(q)]) out.add(form);
  for (const w of sceneWords()) out.add(w);
  // What Mia does is written as "Mia stacks ... and waits": those verbs get their other forms too.
  for (const v of sceneVerbs()) for (const form of [v, sForm(v), ingForm(v), edForm(v)]) out.add(form);
  for (const w of FUNCTION) out.delete(w);
  return out;
}

/** Real words: actions, things and qualities a parent may name. Function words are not in it. */
export const VOCABULARY: ReadonlySet<string> = buildVocabulary();

const ENGLISH: ReadonlySet<string> = new Set([...VOCABULARY, ...FUNCTION, ...SOUNDS]);

/**
 * The commonest words of other languages as people type them in Latin letters, without accents.
 * A sentence is "not English" only when it has one of these and fewer than half of its words are English,
 * so an English sentence with a rare word in it is never sent away.
 */
const FOREIGN: ReadonlySet<string> = new Set(
  list(`
    muy bien bueno buena hola gracias favor que como estas eres soy tu el los las una es con pero tambien
    aqui mira nino nina hijo hija mi quiero vamos ahora donde cuando porque nada todo esto eso hacer haces
    tiene tienes puedes bonito bonita lindo linda pequeno rojo azul
    tres bon bonne bonjour merci oui je elle nous vous ils est suis sont une le les des du mais avec
    dans sur cette c'est qui quoi pourquoi beau joli jolie petit rouge bleu vert regarde fais fait faire
    sehr gut du bist ist ich sie wir ihr ein eine einen einem der das den dem und oder aber mit auf nicht ja
    nein danke bitte hallo wie warum wer hier schon gross klein blau turm haus baust baut bauen machst macht
    machen toll prima mein dein
    molto bene brava bello ciao grazie prego sono che dove quando perche questo questa quello piccolo rosso
    torre amo tesoro muito bem bom boa ola obrigado obrigada sim nao voce esta uma isso
    ty vy ona oni eto molodec molodets molodez horosho khorosho harasho xorosho ochen privet poka spasibo
    pozhaluysta pozhaluista kak chto gde kogda pochemu kto bashnya bashnyu stroish stroit delaesh krasivo umnica
    umnitsa davai davay moy moya tvoy tvoya klassno zdorovo otlichno
    zhaksy jaqsy jaksy zhaqsy balam rakhmet rahmet sen salem salam kalaysyn qalaysyn zhok jok kerek keremet tamasha
    cok guzel iyi evet hayir merhaba tesekkurler tesekkur nasil kule yapiyorsun aferin harika
    bardzo dobrze tak nie dziekuje czesc jestes wieza heel goed nee dank hallo toren mooi
  `).filter((w) => !ENGLISH.has(w)),
);

/** "tower's" and "you're" are looked up without their ending. */
const bare = (word: string): string => word.toLowerCase().replace(/(?:n't|'(?:s|re|ve|ll|d|m))$/, '');

/** True for a real action, play thing or quality: the kind of word a description or a specific praise needs. */
export function isPlayWord(word: string): boolean {
  return VOCABULARY.has(word.toLowerCase()) || VOCABULARY.has(bare(word));
}

/** True for any word the coder knows as English: play words, grammar words and play sounds. */
export function isEnglishWord(word: string): boolean {
  const w = word.toLowerCase();
  return ENGLISH.has(w) || ENGLISH.has(bare(w));
}

/** True for a common word of another language typed in Latin letters: "muy", "einen", "molodec". */
export function isForeignWord(word: string): boolean {
  return FOREIGN.has(word.toLowerCase());
}

/** True for a form of an action or play verb: "snapped", "zipping". A thing or a quality is not one. */
export function isActionWord(word: string): boolean {
  return VERB_FORMS.has(word.toLowerCase());
}
