/**
 * Rule-based coding of what a parent says during play.
 * Pure TypeScript, no network, no LLM. Every sentence gets exactly one code.
 *
 * Order of checks: criticism > command > question > praise > reflection > description > neutral.
 * (Praise in question form, "Did you do a good job?", is a question, so questions are checked first.)
 * Before any of them: a sentence with almost no English in it is not coded, and her own line said
 * back word for word is a reflection. A ring needs a real word: see vocabulary.ts.
 */
import { BUCKET, type Code, type CodedSentence, type CodingContext, type Habit } from '../types';
import { isSafetyConcern } from './safety';
import { ACTION, isActionWord, isBaseVerb, isEnglishWord, isForeignWord, isPlayWord } from './vocabulary';

// ---------- text helpers ----------

/** People type without apostrophes. Restore the common ones so the rules see one spelling. */
const CONTRACTIONS: Record<string, string> = {
  thats: "that's",
  whats: "what's",
  youre: "you're",
  youve: "you've",
  dont: "don't",
  doesnt: "doesn't",
  didnt: "didn't",
  cant: "can't",
  wont: "won't",
  isnt: "isn't",
  arent: "aren't",
  shouldnt: "shouldn't",
  wouldnt: "wouldn't",
  couldnt: "couldn't",
  wasnt: "wasn't",
  havent: "haven't",
  im: "i'm",
  ive: "i've",
  lets: "let's",
  // chat shorthand
  u: 'you',
  r: 'are',
  ur: 'your',
};

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b[a-z]+\b/g, (w) => CONTRACTIONS[w] ?? w)
    // Non-native agreement: "you is coloring".
    .replace(/\byou is\b/g, 'you are')
    // "your" typed for "you're": only when an -ing word and then an object follow ("your making the cow jump"),
    // so "your drawing is lovely" keeps its noun.
    .replace(/\byour (being|\w+ing (?:the|a|an|it|them|that|this|those|these|my|your|all|some)\b)/g, "you're $1")
    // At the start of a sentence "your so gentle" and "your stacking so carefully" are "you're" too.
    // "Your drawing is so pretty" and "Your coloring book is here" keep their noun.
    .replace(/^your (?=(?:so|very|really|such a) )/, "you're ")
    .replace(/^your (?=\w+ing (?!(?:is|are|was|were|looks?|has|had|fell|got|book|books|page|pages|set|box|blocks?|toys?)\b)\w)/, "you're ");
}

const WH_WORDS = new Set(['what', 'where', 'who', 'why', 'how', 'which', 'when']);
const AUX_WORDS = new Set(['is', 'are', 'was', 'were', 'do', 'does', 'did', 'can', 'could', 'will', 'would', 'should']);

const set = (s: string): Set<string> => new Set(s.split(' '));

/** Inside these, "you ..." belongs to the clause: "I love how gently you stack", "thank you for what you made". */
const HOLDS_CLAUSE = set(
  'how that what where when while if because like love see saw notice noticed think thought know knows bet way thank thanks hope sure glad happy proud said says told tell tells means shows seems guess',
);
/** Right after these, the next word continues the clause: "did you", "and you", "help you build". */
const GLUE = set(
  'and but so then now or than as for to with of about at by from did do does are is was were can could will would should have has had ' +
    'who which why help helps helped let lets watch make makes',
);
/** "there you are", "as high as you can": after these a helper verb and "you" do not open a question. */
const NO_QUESTION_AFTER = set('you as than to of did do does are is was were can could will would should have has had who which why');
/** What an object starts with: "you put THE red one", "put THAT down". */
const OBJECT_START = set('the a an it them that this those these my your all some two three four five another one more me him her us mine yours');
/** Verbs whose past is spelled like their order: "you put it on top" may be narration. */
const SAME_IN_PAST = set('put set cut let read');

/**
 * Speech arrives without punctuation, and fast typists skip it. True when a new clause starts at word i:
 *  - a question: "what is", "can you hand", "are you making", "is it a";
 *  - a description: "you are building", "you put the";
 *  - a praise: "i love how", "nice job", "thank you for".
 * `before` is the number of words already in the sentence; a clause never starts inside a held clause.
 */
function startsClause(t: string[], i: number, before: number): boolean {
  const [prev, w, next, next2, next3] = [t[i - 1], t[i], t[i + 1] ?? '', t[i + 2] ?? '', t[i + 3] ?? ''];
  if (before < 2) return false;
  if (WH_WORDS.has(w) && AUX_WORDS.has(next)) return true;
  const near = t.slice(i - Math.min(3, before), i);
  if (next2 && !NO_QUESTION_AFTER.has(prev) && !near.some((x) => WH_WORDS.has(x) || x === 'if')) {
    if (/^(?:can|could|will|would|do|did|are|were)$/.test(w) && next === 'you') return true;
    // "nice tower is it a castle", never "my favorite is this one"
    const asks = next === 'it' ? /^(?:a|an|the|your|my|for)$/.test(next2) : /^(?:that|this)$/.test(next) && /^(?:a|an|your|my)$/.test(next2);
    if (w === 'is' && asks && !/^(?:that|this|here|there)$/.test(prev)) return true;
  }
  if (before < 3 || GLUE.has(prev) || near.some((x) => HOLDS_CLAUSE.has(x))) return false;
  if (w === 'i' && /^(?:love|like)$/.test(next)) return /^(?:how|that|the|your|it|this|when|what|those|these|you|watching|seeing)$/.test(next2);
  // "... on top nice job stacking", "... for me thank you for sharing"; never "such a good job"
  if (/^(?:nice|good|great|awesome)$/.test(w) && /^(?:job|work)$/.test(next)) return !/^(?:a|such|very|really|so|the|of|just|not|say|said)$/.test(prev);
  if (w === 'thank' && next === 'you' && next2 === 'for') return true;
  // "you are (carefully) stacking"
  const doing = w === "you're" || w === 'youre' ? [next, next2] : w === 'you' && next === 'are' ? [next2, next3] : [];
  if (doing.some((x) => /ing$/.test(x) && !NOT_ACTION_ING.has(x))) return true;
  // "the colors you picked" is one clause; "... you picked the red one" starts a new one.
  return w === 'you' && ACTION.has(next) && (!IMPERATIVE.has(next) || SAME_IN_PAST.has(next)) && OBJECT_START.has(next2);
}

/**
 * Split a parent's turn into sentences. Each sentence is coded on its own.
 * Typed and spoken turns often run on without punctuation ("thats so cool what is that"),
 * so a clause start (see startsClause) after at least two words also starts a new sentence.
 */
export function splitSentences(turn: string): string[] {
  const out: string[] = [];
  let carried = '';
  for (const piece of turn.match(/[^.!?\n]+[.!?]*/g) ?? []) {
    // "Yay!! Perfect" is one sentence: an interjection on its own joins what follows.
    const raw = `${carried} ${piece}`.trim();
    carried = '';
    if (!raw.toLowerCase().replace(LEAD, '').replace(/[^a-z]/g, '')) {
      carried = raw;
      continue;
    }
    const tokens = raw.split(/\s+/).filter(Boolean);
    const plain = tokens.map((x) => x.toLowerCase().replace(/[’‘`]/g, "'").replace(/[^a-z']/g, ''));
    let start = 0;
    for (let i = 2; i < tokens.length - 1; i++) {
      // An interjection alone ("wow sweetie") is not a sentence to split off.
      const said = plain.slice(start, i).join(' ').replace(LEAD, '');
      if (said && startsClause(plain, i, i - start)) {
        out.push(tokens.slice(start, i).join(' '));
        start = i;
      }
    }
    const rest = tokens.slice(start).join(' ');
    if (rest) out.push(rest);
  }
  if (carried) out.push(carried);
  return out;
}

const words = (s: string): string[] =>
  s
    .replace(/[^a-z' ]/g, ' ')
    .split(' ')
    .filter(Boolean);

/** Interjections, names and "then", "next", "first" at the start of a sentence carry no code of their own. */
const LEAD =
  /^(?:(?:(?:oh no|uh oh|uh-oh|oops|whoa|wow|ooh|oh|aww|aw|ah|hey|hmm|hm|yay|okay|ok|well(?! done)|so|and|now|then|next|first|finally|please|mia|sweetie|sweetheart|honey|buddy|baby|kiddo)\b|look(?=,)|wait(?=,| you\b))[,!.]*\s*)+/;

/** Pet names that address her when a comma follows: "Sweet pea, you're stirring the soup." Never "Love the colors!". */
const PET_NAME =
  /^(?:sweet pea|sweetie pie|baby girl|baby boy|big girl|big boy|sweet girl|sweet boy|my love|my dear|my darling|my girl|my boy|little one|little man|little lady|miss mia|mia girl|love|darling|dear|bud|bub|babe|pumpkin|princess|munchkin|peanut|sunshine|sugar|girl|boy),\s*/;

/**
 * Who the sentence is said to is not part of what it says. Dropped from the front: a pet name before a comma,
 * and a word the coder does not know (a name: "Aiden, you're stacking", "Zoe you are building") before a
 * comma or before "you".
 */
function dropAddress(s: string): string {
  const pet = s.replace(PET_NAME, '');
  if (pet !== s) return pet;
  const m = s.match(/^([a-z]+)(?:,\s*|\s+(?=(?:you|you're)\b))/);
  return m && !english(m[1]) ? s.slice(m[0].length) : s;
}

/**
 * Narration in the third person is still about her: "Mia is stirring the pot", "Mia stacked the blocks".
 * Only a real past is read this way; "Mia put it here" may be an order with the comma left out.
 */
function secondPerson(s: string): string {
  const doing = s.replace(/^(?:mia|leo)(?:'s| is) (?=(?:\w+ ){0,2}?\w+ing\b)/, "you're ");
  if (doing !== s) return doing;
  const did = s.match(/^(?:mia|leo) (\w+)\b/)?.[1];
  return did && !isBaseVerb(did) && !IMPERATIVE.has(did) && (ACTION.has(did) || (/ed$/.test(did) && isActionWord(did))) ? s.replace(/^(?:mia|leo) /, 'you ') : s;
}

// ---------- criticism ----------

/**
 * Hostile talk is a criticism in whatever frame it comes: inside a praise ("I love how you ruin everything"),
 * as a description ("You are whining again") or as sarcasm ("Nice mess"). It never fills a ring.
 */
type Rule = [re: RegExp, name: string, except?: RegExp];

/** Who a hard word is said of in pretend play: "The bear is being naughty", "The cat is lazy". */
const CHARACTER =
  '(?:bear|teddy|cat|kitty|kitten|dog|doggy|puppy|bunny|rabbit|doll|dolly|baby|monster|dragon|witch|pirate|wolf|giant|troll|robot|dinosaur|dino|duck|duckling|pig|cow|horse|pony|lion|tiger|monkey|frog|fish|bird|mouse|king|queen|prince|princess|fairy|puppet|guy|man|lady|driver|farmer|goat|sheep|elephant|giraffe|shark|snake|spider)s?';

/** Said of oneself, of a toy or of a pretend character, a hard word corrects nobody: "Oops, I made a mess", "The dog made a mess". */
const NOT_HER = "(?:i|i've|we|we've|he|she|they|mommy|daddy|the \\w+|my \\w+)";

const HOSTILE: Rule[] = [
  // put-downs
  [/\b(?:useless|pathetic|worthless|hopeless|clumsy|loser|jerk|crybaby|whiner|moron|dummy|selfish|ridiculous|obnoxious|good for nothing)\b/, 'put_down'],
  [/\b(?:you|it|that|this) sucks?\b(?! up)/, 'put_down'],
  [/\b(?:can't stand|nobody likes|the worst|shame on you|ashamed|disappointed in|disappointing|grow up|act your age|anything right|ignoring me|doing nothing)\b/, 'put_down'],
  [/\bshut (?:it|your (?:mouth|trap|face))\b/, 'put_down'],
  // "baby" is an insult only as a name for her, never the doll: "such a baby", not "a baby bear"
  [/\b(?:such|being|you're|you are|what) a (?:big |little |total |real )?(?:cry ?)?baby(?=$|,| (?:about|again|today|right now)\b)/, 'put_down'],
  [/\b(?:acting|crying|whining|behaving|screaming|pouting) like a (?:big |little )?baby\b/, 'put_down'],
  [/\b(?:being|such|you're|you are|what) a (?:real |royal |total |big |huge )?(?:pain|brat|handful|nightmare|mess)\b/, 'put_down'],
  [
    /\b(?:you're|you are) (?:always |just |still |so |really |very |too |being )*(?:slow|difficult|impossible|whiny|whining|fussy|stubborn|careless|spoiled|pouting|sulking|nagging)\b(?! and (?:careful|gentle|steady))/,
    'put_down',
  ],
  // unkind talk in the shape of a description: "You are taking forever", "You're just sitting there"
  [/\byou(?:'re| are| were)? (?:taking|took|take) (?:forever|so long|too long|(?:such )?a (?:really |very )?long time)\b|\btook you (?:forever|long enough|so long)\b|\btook (?:you )?long enough\b/, 'put_down'],
  [/\bmessing (?:it|this|that|everything|things) (?:all )?up\b/, 'put_down'],
  [/\b(?:over|about) nothing$|\bfor no reason\b/, 'put_down'],
  [/\blike a (?:two|three|2|3)[- ]year[- ]old\b|\blike (?:a|an) (?:little kid|maniac|brat)\b/, 'put_down'],
  [/\b(?:hogging|acting up|throwing a (?:fit|tantrum)|giving me attitude|pushing my buttons|lying to me|just sitting there|talking back)\b/, 'put_down'],
  [/\bshowing off\b(?! (?:your|the|her|his|a|an|that|this|those|these|my|our|how|what)\b)/, 'put_down'],
  [/\b(?:baby|brat|dummy) like you\b/, 'put_down'],
  [/\blooks? like (?:garbage|trash|junk)\b|\b(?:is|was) garbage$/, 'put_down'],
  [/\byour \w+ (?:is|are|looks like) (?:such )?a (?:total |big |huge )?mess\b/, 'put_down'],
  [/\byou always do (?:this|that)\b/, 'put_down'],
  // a comparison that puts her down
  [/\b(?:like|love|prefer) your (?:sister|brother|cousin|friend) (?:better|more)\b|\byour (?:sister|brother) (?:never|always|would|wouldn't|doesn't|can)\b/, 'comparison'],
  [/\bmine is (?:so much |much |way )?(?:better|nicer|prettier)\b/, 'comparison'],
  // a tail that takes the kind words back: "Good job, for once", "You built a tower, big deal"
  [/\bfor once\b|(?<!\b(?:no|not a|a|the) )\bbig deal$|\bso what$|\bwho cares\b|\babout time(?=$|[,!]| you\b)|\bwas (?:that|it) so hard\b/, 'dismissive'],
  // blame: what she is said to do to the parent
  [/\bwasting (?:my|our|everyone's) time\b/, 'blame'],
  [
    /\b(?:make|makes|making|made) me (?:so |really |very )?(?:angry|mad|crazy|sick|tired|upset|furious|nuts|late|sad|miserable|cry|wait|regret)\b/,
    'blame',
    // "The dragon made me sad!" is pretend play.
    /\b(?:the \w+|he|she|they) (?:make|makes|making|made|is making|are making) me\b/,
  ],
  [/\b(?:bothering|bugging|pestering|annoying) me\b/, 'blame'],
  [/\bafter all i(?:'ve| have)? (?:do|did|done)\b|\b(?:so |all )?done with you\b/, 'blame'],
  [/(?<!\b(?:not|never|isn't|wasn't|ain't) )\byour (?:own )?fault\b/, 'blame'],
  [/\b(?:broke|broken|fell|fell down|ruined|spilled|late|lost|crashed|messed up) because of you\b/, 'blame'],
  [/\bdriving me (?:crazy|nuts|mad|insane|up the wall)\b/, 'blame'],
  [/\bon my (?:last )?nerves?\b/, 'blame'],
  [/\bgiving me a headache\b/, 'blame'],
  [/\b(?:sick|tired) of (?:you|your|this)\b|\bfed up\b|\bi(?:'ve| have)? had (?:it|enough)\b/, 'blame'],
  // a praise word on a put-down is sarcasm
  [/\b(?:nice|great|good|lovely|fine|wonderful|beautiful),? (?:another |a |big )*mess\b/, 'sarcasm'],
  // "Good job breaking it", "Thanks for nothing", "Way to go, you spilled it"
  [
    /\b(?:(?:good|great|nice|awesome|wonderful|excellent|super|fantastic) (?:job|work|going)|way to go|thanks(?: a lot| so much)? for|thank you(?: so much)? for),? (?:you |now it's |now you |it's )?(?:breaking|ruining|wrecking|spilling|destroying|messing|broke|broken|ruined|spilled|wrecked|nothing|whining|crying|screaming|yelling|pouting|sulking|complaining|making me wait|throwing everything|throwing (?:\w+ ){1,3}at (?:me|him|her)|(?:hitting|kicking|biting|pushing) (?:me|him|her|them|people|your \w+))\b/,
    'sarcasm',
  ],
  // "I love how you throw everything on the floor", "I love how loud you are"
  [/\bi (?:really |just )?(?:love|like) (?:how|that|it when|when) you (?:never |always )?(?:whine|scream|yell|cry|hit|kick|bite|ignore|throw everything|make a mess|never listen)\b/, 'sarcasm'],
  // "I love how loud you sing!" may be meant; "I love how loud you are." is not.
  [/\bi (?:really |just )?(?:love|like) how (?:(?:rude|mean|messy|whiny|bossy|lazy) you\b|(?:loud|slow) (?:you are|you're being)$)/, 'sarcasm'],
  [/\b(?:going|job|one|work|move|done),? (?:genius|einstein|sherlock|smarty)\b/, 'sarcasm'],
];

const CRITICISM: Rule[] = [
  // "No more juice." says the juice is gone; "No more throwing." and "No more blocks for you." stop her.
  [
    /^(?:no\b(?!,?\s+(?:problem|worries|way|wonder|big deal|thank you|thanks))|nope\b|nah\b|enough(?:$|,| (?:of|already|now|with)\b))/,
    'starts_with_no',
    /^no more (?!\w+ing\b|of\b|that\b|this\b)(?!.*\bfor you\b)[\w' ]+$/,
  ],
  [/^(?:don't|dont|do not|stop|quit)\b(?! (?:worry|give up))/, 'negative_command'],
  [/\byou (?:shouldn't|should not|can't|cannot|must not|mustn't)\b/, 'you_cant'],
  // "It's not a toy." corrects her; "It's not ready yet.", "That's not too heavy for you." and "It is not your fault." correct nobody.
  [
    /\b(?:that's|that is|it's|it is|this is|those are|these are) not\b(?! (?:giving up|quitting|a problem|a big deal|your fault)\b)/,
    'correction',
    /\bnot (?:too (?!nice|good|kind)\w+|(?:so |very |that )?(?:scary|broken|easy|hot|cold|heavy|stuck|lost|gone|far|ready|done|finished|over|sharp|dark|wet|dry|full|empty|hungry|sleepy|tired|sad|hurt|wobbly|working|staying|fitting|moving|opening|closing|sticking|standing|rolling|turning))\b|\b(?:yet|anymore|any more|this time)$/,
  ],
  [
    /\b(?:you're|you are) not\b(?! (?:giving up|quitting)\b)/,
    'correction',
    /\bnot (?:too (?!nice|good|kind)\w+|scared|afraid|alone|in trouble|hurt|late|sure|(?:done|finished|ready)(?: yet)?$)/,
  ],
  [/\bnot (?:like that|that way|right|nice|good|okay|ok|how|there(?! yet)|that one|this one|those)\b/, 'correction'],
  [/\b(?:doesn't|does not) (?:go|belong)\b/, 'correction'],
  [/\bi said no\b/, 'correction'],
  // "not so good", "that wasn't nice". ("Isn't that nice?" is a question, so "isn't" takes no "that".)
  [/\b(?:not|wasn't|weren't) (?:so |very |really |too |that )?(?:nice|good|okay|ok|right|kind|great)\b|\b(?:isn't|aren't) (?:so |very |really )?(?:nice|good|okay|ok|right|kind)\b|\bno good\b/, 'correction'],
  [/^cool it\b/, 'negative_command'],
  [
    /\b(?:wrong|bad(?! (?:guys?|wolf|dragon|monster|witch|pirate|dream|storm|weather|luck))|naughty|messy|sloppy|ugly|stupid|dumb|lazy|rude|gross|yucky|terrible|awful(?! lot)|horrible|annoying|boring|disgusting|bossy|brat|idiot|shut up)\b/,
    'negative_word',
    // Not of her: the parent's own slip, "what's wrong", a pretend character ("the lazy cat"), pretend food ("yucky worm soup").
    new RegExp(
      [
        "^(?:i|i'm|i've|we|we're|mommy|daddy|mine|my \\w+)\\b(?!.*\\b(?:you|you're|your|yours|that's|that is|it's|this is|that|this|those|these|look|looks)\\b)",
        "\\bwhat(?:'s| is) wrong(?! with you)\\b",
        "\\b(?:something|anything|nothing)(?:'s| is)? wrong\\b",
        '\\bmy bad$',
        '\\bthe (?:bad|naughty|messy|ugly|lazy|rude|bossy|yucky|gross|silly) \\w+',
        `^the (?:\\w+ )?${CHARACTER} (?:is|was|are|were|looks?|got|gets) (?:being |so |very |too |a little )*(?:bad|naughty|messy|ugly|lazy|rude|bossy|yucky|gross|stupid|dumb|boring|annoying)$`,
        '\\b(?:yucky|gross|disgusting) (?:\\w+ )?(?:soup|stew|pie|cake|food|mud|worms?|bugs?|slime|potion|medicine|tea|juice|sandwich|pizza|socks?|feet)\\b',
        '\\b(?:soup|stew|pie|cake|food|mud|slime|potion|medicine|tea|juice|sandwich|pizza) (?:is|tastes|smells|looks) (?:so |very |really )?(?:yucky|gross|disgusting)$',
      ].join('|'),
    ),
  ],
  [/\b(?:you're|you are) (?:ruining|breaking|wrecking|embarrassing|driving me)\b/, 'negative_word'],
  [/\byou (?:always |just |really )?(?:broke|ruined|wrecked|ruin|ruins|wreck|wrecks|messed up|mess up)\b/, 'negative_word'],
  // "You're going too fast." is said of her; "The car is going too fast!" and "This puzzle is too hard for me." are not.
  [/\btoo (?:rough|loud|fast|slow|hard|messy|much(?! fun))\b/, 'too_much', /^(?:the|this|that|my) \w+ (?:\w+ )?(?:is|was|goes|went|are|were) (?:\w+ )?too\b|\bfor me$/],
  // "That's so mean." is; "The monster is so mean!" is pretend.
  [/\b(?:you're|you are|you were|being|that's|that is|that was|were) (?:so |very |really |just )?mean\b|^(?:so |very )?mean$/, 'negative_word'],
  [/\bi (?:don't|do not) like\b/, 'dislike'],
  [/\bi hate\b(?! (?:it )?when (?:my|mine|the|i|it|that|this)\b)/, 'dislike'],
  [
    /\b(?:make|makes|making|made|left|leave|leaves|leaving) (?:a|such a|a big|a huge|another) mess\b/,
    'negative_word',
    new RegExp(`^${NOT_HER}(?: have| has)? (?:just |really |always |\\w+ed and )?(?:make|makes|making|made|left|leave|leaves|leaving)\\b`),
  ],
  [/\byou never\b(?! (?:give up|gave up|quit))/, 'you_never'],
  [/\bwhat's wrong with you\b/, 'negative_word'],
  // A "don't" after a praise or a description is still a "don't": "Nice tower, but don't knock it."
  [/(?:,|\b(?:and|but|so|now|then|please|just)) (?:don't|do not)\b(?! (?:worry|give up))/, 'negative_command'],
  // A rule said at her and a threat are corrections too: "We don't throw toys", "If you do that again we are done".
  [/\bwe (?:don't|do not|never) (?:throw|hit|bang|break|kick|bite|grab|yell|scream|shout|push|rip|tear|snatch|smash|slam|spit|say|talk|do|play|draw|color|write|run|climb|jump|stand|put|use|touch|eat|take)\b/, 'prohibition'],
  [/\b(?:not|isn't|aren't) for \w+ing\b/, 'prohibition'],
  [
    /^if you\b.*(?:\b(?:we are|we're|i am|i'm|you are|you're|it is|it's|that is|that's) (?:done|leaving|stopping|finished|over|going (?:home|to bed|away)|in (?:trouble|time ?out))\b|\b(?:take|taking|put|putting|goes|going) (?:(?:it|them|that|this|the \w+|your \w+) )?away\b|\b(?:no more|time ?out)\b)/,
    'threat',
  ],
  [/\b(?:last|final) warning\b/, 'threat'],
  ...HOSTILE,
];

// ---------- commands ----------

const COMMAND_PHRASES: [RegExp, string][] = [
  [/^(?:let's|lets|let us)\b/, 'lets'],
  [/^(?:can|could|will|would) you\b/, 'can_you'],
  [/^(?:why don't (?:you|we)|why not|how about|what about (?:you|we)|shall we)\b/, 'suggestion'],
  [
    /^(?:you (?:need|have|ought) to(?! see)|you must(?! be)|you should(?! (?:be (?:so |very |really )?proud|see))|you'd better|you better|i (?:want|need) you to|i'd like you to|i would like you to|(?:mommy|daddy|mom|dad|mama|papa) (?:wants|needs|would like) you to|we (?:need|have) to|we should|it's time to|time to)\b/,
    'you_need_to',
  ],
  // "Hands in your lap.", "Eyes on me.": an order with the verb left out.
  // ("Eyes on the dog, nose on the dog." is talk about a picture.)
  [/^(?:hands|eyes|feet|ears|bottom|bottoms) (?:in|on|to|off|down) (?:your|my|me|mommy|daddy|the (?:floor|chair|table|seat|rug|ground))\b/, 'body_order'],
  // "Great stacking, your turn to clean up." ("Your turn to stir!" is play.)
  [/^(?:it's |it is |now it's )?your turn to (?:clean|tidy|pick up|put (?:\w+ ){0,3}away|stop|sit|listen)\b/, 'your_turn_to'],
];

const IMPERATIVE = new Set(
  (
    'put give hand take look come go sit stand try make draw build use pick place move push pull turn open close ' +
    'clean tidy tell show say watch listen wait hold bring get let do keep be stack color colour add share throw ' +
    'count find help finish start play leave pass press cut pour mix wash read touch grab choose point roll line ' +
    'fix set drop lift follow check stay hurry slow calm ask write paint feed hide knock connect match sort ' +
    'fill drive fly cook careful'
  ).split(' '),
);

/** A soft opening does not change an order: "Maybe put that one there", "Just give it to me". */
const SOFTENER = /^(?:(?:maybe|perhaps|i think|i guess|just)\s+)+/;
/** "Play time is fun", "Paint is wet", "Clean up time is over": the first word is a thing, not an order. */
const THING_FIRST = /^\w+ (?:(?!(?:it|this|that|me|what|who|how|where|them|him|her|here|there)\b)\w+ (?:\w+ )?)?(?:is|are|was|were|isn't|aren't)\b/;
/** Cheering her on is not an order: "Go Mia go!" */
const CHEER = /^(?:go (?:go|mia)(?: go)*|ready,? (?:set|steady),? go|on your marks?,? get set,? go|keep it up|keep going|keep at it|keep trying|give me (?:five|a five|a high five)|come on|slow and steady)$/;
/** "You give me that", "You stop it right now": an order with "you" in front. */
const YOU_ORDER =
  /^you (?:(?:give|hand|bring|pass) (?:me|it|that|this)|come (?:here|back|over)|(?:sit|get|put that|put it) (?:down|back|over here)|(?:stop|quit) (?:it|that|this|right)|(?!are\b|were\b)\w+ (?:\w+ ){0,3}right now$|\w+ (?:\w+ ){0,3}(?:this instant|this minute|this second)$)\b/;

/**
 * An order with an everyday play verb the short list above does not have: "Stir the soup.", "Zip up the backpack.",
 * "Blow on it." The verb comes first and an object or a particle follows, so "Dance party!", "Tap tap tap."
 * and "Guess what!" stay talk.
 */
const FOLLOWS_ORDER = set(
  'the a an it them that this these those my your our some me us him her another more all both ' +
    'up down off out away back again slowly gently carefully quietly nicely softly here',
);
/** "Blow on it", "Dance with me": a preposition counts when an object comes after it. */
const FOLLOWS_PREP = set('in on over with into onto to under at for');
const OBJECT_AFTER_PREP = set('it them that this the a an my your me us him her these those');
/** Verbs that say what is in her head, not what to do: "Guess what!", "Imagine that!", "Remember the zoo?" */
const NOT_AN_ORDER_VERB = set('think remember notice wonder guess imagine figure learn decide plan pretend bet');
/** Words that are a thing as often as a verb: "Water in the cup.", "Paint on your hands!" */
const THING_OR_VERB = set(
  'water paint rock hammer button brush dress drum slide swing step bubble string race row shape stick color line hand park bow glue tape dust mop comb stamp pile load print hug kiss ' +
    'pat dip drip bump nap lock plant tie rake rattle sail skate sketch slice smile switch trade visit walk wave whistle wink fold march pinch poke pop peel crash splash dance jump spill ' +
    'tickle slip crack scoop spin shake hook plug whisk mash frost season rest stash prop ladle stuff wind snap clap flip kick bounce catch ride sleep',
);
/** After a word that may be a thing, only these make it an order: "Water the flowers", "Splash me", "Dance with me". */
const PLAIN_OBJECT = set('the a an it them that this these those my your our some me us him her');
const PRONOUN_OBJECT = set('it them me us him her');
/** Rhymes and games: "Rock-a-bye baby", "Peek a boo!", "Pat a cake". */
const RHYME = /^(?:rock a bye|peek a boo|pat a cake|pop goes|row row|ring around|skip to my|pat pat|clap clap|tap tap|hop hop|clean up clean up|slow and steady|come on (?:you|mia|sweetie|honey|buddy|kiddo|we|i)\b)/;
/** "Clean up time!", "Clean-up takes a long time": the first words are a thing, not an order. */
const CLEAN_UP_THING = /^clean ?up (?:time|takes|took|is|was|song|crew)\b/;

/** True when the clause opens as an order: "Put it here", "Stir the soup", "Zip up the backpack". */
function imperative(clause: string): boolean {
  const [w = '', next = '', next2 = ''] = words(clause);
  // "Do it.", "Do that again.": an order. (A question about one thing would be "Does it ...?")
  if (/^do (?:it|that|this)\b/.test(clause)) return true;
  if (AUX_INVERSION.test(clause) || THING_FIRST.test(clause) || /^look at you\b/.test(clause)) return false;
  if (CLEAN_UP_THING.test(clause) || RHYME.test(words(clause).join(' '))) return false;
  if (IMPERATIVE.has(w)) return true;
  if (!isBaseVerb(w) || NOT_AN_ORDER_VERB.has(w)) return false;
  // "Water all over the floor!", "Paint on the table." name a thing; "Water the flowers." and "Dance with me." are orders.
  if (THING_OR_VERB.has(w)) return PLAIN_OBJECT.has(next) || (FOLLOWS_PREP.has(next) && PRONOUN_OBJECT.has(next2));
  if (FOLLOWS_ORDER.has(next)) return true;
  return FOLLOWS_PREP.has(next) && OBJECT_AFTER_PREP.has(next2);
}

/** A request with no verb: "Gentle hands, please.", "More tea, please." Not "Yes, please." and not "You said please!". */
const PLEASE_REQUEST = /\bplease$/;
const NOT_A_REQUEST = /^(?:yes|yeah|yep|ok|okay|no|sure|oh|pretty)?,? ?please$|\b(?:you|you're|i|i'm|she|he|we|say|says|said|saying|word|words|wants|want|needs|need|likes|is|are|was|has|have)\b/;

/** Cheering after a praise is not an order: "Great job, keep it up!", "You did it, give me five!" */
const CHEER_TAIL = /,?\s*(?:keep it up|keep going|keep at it|give me (?:five|a five|a high five)|high five|up top)$/;

/** An order said in the middle of a sentence: "... but you need to be quiet", "nice tower can you make it taller". */
const ORDER_INSIDE =
  /(?<!\b(?:do|did|does|if|when|what|how|where|why|who) )\b(?:you (?:need|have|ought) to(?! see)|you must(?! be)|you should(?! (?:be (?:so |very |really )?proud|see))|you'd better|you better|i (?:want|need) you to|i'd like you to|i would like you to|(?:mommy|daddy|mom|dad|mama|papa) (?:wants|needs|would like) you to|we (?:need|have) to|we should|it's time to|let's(?! (?:you|her|him|me|them|it|us)\b))\b|(?<!\b(?:what|how|where|when|who|which|why|if|you|far|fast|many|much|high|tall|long) )\b(?:can|could|will|would) you\b(?= \w)/;

/** Verbs that are an order after "now", "so", "but", "please" or "then": "... now give me the red one". */
const ORDER_VERBS = set('give hand bring pass take hold pick grab move get drop leave show tell put stop quit hurry come sit listen try use make build draw stack clean tidy look watch wait be');
/** Verbs that are an order when an object follows and no subject stands in front: "nice stacking put it on top". */
const OBJECT_VERBS = set('put give hand bring pass take hold pick grab move get drop leave show tell');
/** Short orders that need no object: "good girl sit down", "nice tower now clean up". */
const ORDER_PHRASE =
  /^(?:sit (?:down|still)|come (?:here|back)|calm down|slow down|settle down|quiet down|hurry up|be (?:quiet|careful|gentle|nice|good)|stop (?:it|that)|clean (?:it )?up(?! time)|get up|stand up|listen to me|look at me|pay attention|go away|let go|give it back|hold still|do (?:it|that|this) again)\b/;

/** A subject or a helper in front of the verb makes it part of the clause: "you put", "to put", "can now give". */
const SUBJECT_BEFORE = set('you i we they he she it to can could will would should shall may might must do does did not never always just also who that which');
/** So does an object ("help me put"), a joiner ("and put") or a describing word ("nice pick", "the hand"). */
const NOUN_BEFORE = set('and or me him her them us mia a an the your my this nice good great');
/** "helping daddy put it away", "you made the bear hold the cup": the second verb is not said to her. */
const CAUSES = /^(?:help|helps|helping|helped|let|lets|letting|watch|watching|watched|see|saw|seeing|make|makes|making|made)$/;
const subject = (w?: string): boolean => !!w && (SUBJECT_BEFORE.has(w) || /(?:'ll|'d|n't|'ve)$/.test(w));
/** After "and" these are an order when an object follows: "... and give me that". */
const AND_ORDER_VERBS = set('give hand bring pass show tell get grab take');
const AND_ORDER_PHRASE = /^(?:clean (?:it )?up|sit down|come here|come back|calm down|settle down|hurry up)$/;
/** A whole clause that is a thing: "the cars", "you and the bear". What follows is what the thing does. */
const THING_SUBJECT =
  /^(?:(?:you|i|we|mia|mommy|daddy) and )?(?:the|a|an|my|your|this|that|these|those|our|all the|both) (?:\w+ ){0,2}\w+(?: and (?:the |a |an |my |your )?(?:\w+ ){0,2}\w+)?$/;
/** Words clean-up as a thing comes after: "the clean up", "with clean up", "nice clean up". */
const CLEAN_UP_AFTER = /^(?:the|a|this|that|our|your|my|with|at|for|of|during|after|before|about|nice|good|great|awesome|quick|fast|super|wonderful|excellent|beautiful)$/;

/** "you pick them up and ...", "to sort and ...", "can stack and ...", "helping me sort and ...": the verb after "and" goes on. */
function carriesVerb(before: string[]): boolean {
  return before.some((w, i) => {
    if (w === 'to' || CAUSES.test(w) || /^(?:can|could|will|would|should|may|might|must|let's)$/.test(w) || /(?:'ll|'d)$/.test(w)) return true;
    return (w === 'you' || w === 'i' || w === 'we' || w === 'they') && isBaseVerb(before[i + 1] ?? '');
  });
}

/**
 * Finds an order after a praise or a description, with or without a comma. An order anywhere in the
 * sentence wins: "Great job stacking now give me the red one" is a command, not a praise.
 * Narration stays narration: "You picked it up, put it on top", "I love how you put it on top".
 */
function orderInside(bare: string): boolean {
  if (ORDER_INSIDE.test(bare) && !WH.test(bare)) return true;
  // Commas are kept as words of their own: they mark where a clause ends.
  const t = bare.replace(/[^a-z', ]/g, ' ').replace(/,/g, ' , ').split(' ').filter(Boolean);
  for (let i = 1; i < t.length; i++) {
    const [w, prev, next] = [t[i], t[i - 1], t[i + 1] ?? ''];
    const before = t.slice(0, i).join(' ');
    const praised = PRAISE.test(before);
    // "put" is also a past: after "you ..." it is an order only when it points ("put that down", "put it away").
    const points = /^(?:that|this|those|these|me)$/.test(next) || /\b(?:away|here|please|now)\b/.test(t.slice(i).join(' '));
    const narrated = SAME_IN_PAST.has(w) && !praised && !points;

    if (ORDER_VERBS.has(w) && !subject(t[i - 2])) {
      if (/^(?:now|so|but|please)$/.test(prev)) return true;
      if (prev === 'then' && !narrated) return true;
    }
    if (prev === 'and' && /^(?:stop|quit|hurry)$/.test(w)) return true;
    const rest = t.slice(i).join(' ');
    const clauseStart = t.lastIndexOf(',', i) + 1;
    const clause = t.slice(clauseStart, i);
    // "Nice tower and give me the red block", "Good job stacking and clean up": an order after "and", unless the
    // words before it carry the verb along ("you pick them up and hand them to me", "helping me sort and clean up").
    if (prev === 'and' && ((AND_ORDER_VERBS.has(w) && OBJECT_START.has(next)) || AND_ORDER_PHRASE.test(rest)) && !carriesVerb(t.slice(0, i - 1))) return true;
    if (ORDER_PHRASE.test(rest) && !subject(prev) && !/^(?:and|or|me|him|her|them|us|say|says|said)$/.test(prev)) {
      // "helping Mommy clean up", "you made the car slow down": the phrase belongs to the verb before it.
      const causedNear = [prev, t[i - 2] ?? '', t[i - 3] ?? ''].some((x) => CAUSES.test(x)) && clause.some((x) => CAUSES.test(x));
      // "The cars slow down at the bridge": a thing is the subject.
      const thingIsSubject = THING_SUBJECT.test(clause.join(' '));
      // "Nice clean up, Mia!", "Great job with clean up today": clean-up as a thing, with no object after it.
      const cleanUpThing =
        /^clean up\b/.test(rest) && !OBJECT_START.has(t[i + 2] ?? '') && (CLEAN_UP_AFTER.test(prev) || /^(?:is|was|takes|took|time|song|crew)$/.test(t[i + 2] ?? ''));
      if (!causedNear && !thingIsSubject && !cleanUpThing) return true;
    }

    if (!OBJECT_VERBS.has(w) || !OBJECT_START.has(next) || subject(prev) || NOUN_BEFORE.has(prev)) continue;
    // "you gently put it": an adverb between the subject and its verb
    if (/ly$/.test(prev) && subject(t[i - 2])) continue;
    const caused = clause.some((x) => CAUSES.test(x));
    if (CAUSES.test(prev) || CAUSES.test(t[i - 2] ?? '') || (caused && !points)) continue;
    const afterClause = praised || /\byou(?:'re|'ve)?\b/.test(before);
    if (SAME_IN_PAST.has(w) ? afterClause && !narrated : afterClause || points) return true;
  }
  return false;
}

// ---------- questions ----------

/** "When" asks only with a helper verb after it: "When it fell you tried again" is a statement. */
const WH = /^(?:what|where|who|whose|why|how|which|when (?:is|are|was|were|do|does|did|can|could|will|would|should))\b/;
const EXCLAMATIVE =
  /^(?:what an?\b|how (?:nice|cool|great|beautiful|pretty|tall|big|fun|wonderful|lovely|neat|awesome|amazing|clever|smart|kind|gentle|careful)\b)/;
const AUX_INVERSION =
  /^(?:is|are|was|were|do|does|did|can|could|will|would|should|shall|have|has|am)\s+(?:you|we|i|it|she|he|they|that|this|the|your|there|those|these)\b/;
/** "Wouldn't it be nice if you shared", "Isn't that a tower". With an exclamation mark it is an exclamation: "Aren't you clever!" */
const NEGATIVE_INVERSION = /^(?:isn't|aren't|wasn't|weren't|wouldn't|couldn't|won't)\s+(?:you|we|i|it|she|he|they|that|this|the|your|there|those|these)\b/;
const TAG = /(?:,\s*(?:right|huh|okay|ok|yeah|no)$)|(?:\b(?:isn't it|aren't you|don't you|doesn't it|won't you|didn't you)$)/;
/** "you got the answer right", "you did the puzzle right": with these verbs "right" says how, it does not ask. */
const GETS_IT_RIGHT = /\b(?:got|get|gets|getting|did|do|does|doing|done|guessed|guess|answered|spelled|said|say)\b/;
/** Before a last "right" these make it a word of the sentence, not a tag: "on the right", "got it right", "just right". */
const RIGHT_IS_A_WORD = set(
  "the it that this them just all is are am was be turn turned go went your my on to that's it's you're i'm not got did do up down in out together back so too about quite exactly looks sounds seems feels there here stay keep way goes",
);
/** "Wanna play with the cars" is a question even without a question mark. */
const WANNA = /^(?:you )?(?:wanna|want to)\b/;

// ---------- praise ----------

const NOT_PRAISE = /\bgood (?:morning|night|bye|afternoon|evening|grief|luck|heavens|gracious)\b|\bgoodbye\b|^no,? (?:thank you|thanks)$/;
const PRAISE = new RegExp(
  [
    /\b(?:good|great|nice|nicely|awesome|excellent|fantastic|terrific|wonderful|amazing|super|perfect|beautiful|beautifully|lovely|gorgeous|cute|brilliant|impressive|incredible|cool|neat|smart|clever|proud|bravo|well done|way to go|not bad)\b/,
    /\bi (?:really |just |do )?(?:like|love)\b/,
    /\b(?:thank you|thanks)\b/,
    /\byou did it\b|\byou got it(?=$|,| (?:right|again)\b)|\bthere you go\b|\bhigh five\b|\blook at you\b/,
    /\byou (?:figured (?:it|that) out|nailed it)\b|\byou(?:'ve| have)? got this\b|\b(?:you're|you are) the best\b/,
    /\byou rock$|\b(?:you're|you are) (?:killing|crushing|rocking) it\b|\bthat's my (?:girl|boy)\b/,
    /\b(?:doing|did) (?:so |very |really )?well\b/,
    // "That was kind", "How thoughtful"; "sweet" only of her, never of the tea
    /\b(?:that was|that is|that's|how|what a) (?:so |very |really )?(?:kind|thoughtful|helpful|generous|brave|polite|gentle|patient|careful)\b/,
    /\b(?:you're|you are|how|that's|that is) (?:so |very |really )?sweet\b(?! (?:potato|tea|corn))/,
    // "pretty" as "lovely", not as "rather": "so pretty", never "pretty heavy"
    /\b(?:so|very|really|how|looks|that's|it's|is) pretty(?=$|,| (?:too|and|on|in|with|like|there|here|today|now)\b)/,
    /\ba pretty\b(?! (?:good|big|tall|much|fast|hard|cool|well|close|sure|soon))/,
  ]
    .map((re) => re.source)
    .join('|'),
);

/** "You are so careful with the blocks": a positive word about how she is behaving is specific praise. */
const POSITIVE_TRAIT =
  /\b(?:you're|you are) (?:being )?(?:so |very |really |super |such a )?(?:careful|gentle|patient|kind|helpful|polite|brave|creative|thoughtful|generous|calm|focused|respectful)\b/;

/** "You waited so patiently", "You worked so hard on that": praise of how she did it. */
const POSITIVE_MANNER =
  /\byou(?:'re| are|'ve| have)? (?:\w+ ){1,4}?(?:so|very|really|super) (?:patiently|gently|carefully|nicely|quietly|calmly|kindly|politely|neatly|softly)\b|\b(?:work|worked|working|try|tried|trying|practiced|practicing|concentrating|focusing|thinking) (?:so|very|really|super) hard\b/;

/** "I like orange", "I love pizza": a taste of the parent's own, not praise of her. */
const PREFERENCE = /^i (?:really |just |do |also )?(?:like|love) (\w+)(?: too| best| the most| a lot| so much)?$/;
/** "I like the red one.", "I love that one best.": a pick of the parent's own. */
const PREFERS_ONE = /^i (?:really |just |do |also )?(?:like|love) (?:the |this |that )?(?:\w+ )?ones?(?: too| best| the most| a lot| so much)?$/;
/** "I love my new phone.": the parent's own thing. "I love my little helper." is about her. */
const LIKES_OWN = /^i (?:really |just |do |also )?(?:like|love) my\b(?!.*\b(?:helper|girl|boy|baby|kid|kiddo|child|daughter|son|sweetie|honey|buddy|princess|mia|leo|you|your|you're)\b)/;
/** How she is addressed is not what is praised: "Good job, big girl!", "Great work, little one." */
const ADDRESS = /\b(?:big|little|good|sweet|my) (?:girl|boy|kid|one|guy|man|lady|princess)\b/g;
/** Praise that names nothing: "You rock!", "You're killing it!", "That's my girl!" */
const SLANG_PRAISE =
  /\byou rock$|\b(?:you're|you are) (?:killing|crushing|rocking) it\b|\bthat's my (?:girl|boy)\b|\blooking (?:so |really |very )?(?:good|great|nice|sharp|awesome)\b|\b(?:good|nice|great) going\b|\bkeep going\b/g;
/**
 * A tail that takes a praise or a description half back: "You are stacking, finally.", "Nice tower, I guess.",
 * "Not bad for a four year old." Such a sentence fills no ring.
 */
const BACKHANDED =
  /,\s*(?:finally|at least|whatever|sort of|kind of)$|\b(?:i guess|i suppose)$|\b(?:good|great|nice|bad|smart|clever|fast|quick|well|job|work|try)\b(?: \w+){0,2} for (?:a|an) (?:baby|little kid|girl|boy|(?:\w+|\d+)[- ]year[- ]old)$/;

/** Words that do not say WHAT is being praised. If nothing else is left, the praise is general. */
const PRAISE_FILLER = new Set(
  (
    'good great nice nicely awesome excellent fantastic terrific wonderful amazing super perfect beautiful ' +
    'gorgeous cute looks look no got high five pretty ' +
    // "Nice try!", "Keep it up!", "Have a nice day.": none of these names what she did.
    'try keep up kid day today weather time morning easy break ' +
    'so well ' +
    "beautifully lovely brilliant impressive incredible cool neat smart clever proud bravo well done way go not bad " +
    "like love thank thanks job work that that's this is it it's so very really such a an the what you you're are " +
    "did do doing i i'm im am of for to with just how too and there thing one stuff me my your we on in at be been " +
    'was were yeah yes yay wow oh see have has figured out nailed kind thoughtful helpful generous brave polite best sweet mommy daddy mom dad mama papa buddy sweetie sweetheart honey mia baby kiddo girl boy dear bud champ pal'
  ).split(' '),
);

const HABIT_WORDS: [RegExp, Habit][] = [
  [/\b(?:gentle|gently|careful|carefully|soft|softly|slowly)\b/, 'gentle'],
  [/\b(?:share|sharing|shared|giving me|handing me|gave me|handed me)\b/, 'sharing'],
  [/\b(?:wait|waiting|waited|patient|patiently|taking turns|your turn)\b/, 'patient'],
  [/\b(?:tidy|tidying|clean|cleaning|cleaned|put(?:ting)? (?:\w+ ){0,3}?(?:away|back))\b/, 'tidy'],
];

function namedHabit(s: string): Habit | undefined {
  for (const [re, habit] of HABIT_WORDS) if (re.test(s)) return habit;
  return undefined;
}

// ---------- reflection ----------

const STOP = new Set(
  (
    "a an the is are am was were it its it's this that that's to of in on at and or but so very really i i'm you " +
    "you're my your me we he she they do does did be been have has had will can with for one some here there look " +
    'see oh wow yeah yes no just now too up down our'
  ).split(' '),
);

/** Endings are folded, and an irregular past goes to its verb: "You did draw a cat!" says back "I drew a cat!". */
const stem = (w: string): string => {
  const base = PAST_OF[w] ?? w;
  return base.length > 4 ? base.replace(/(?:ing|ed|es|s)$/, '') : base;
};
/** "The dog's hungry" is "the dog is hungry": the short form is dropped before the words are compared. */
const content = (s: string): string[] =>
  words(normalize(s))
    .map((w) => w.replace(/'(?:s|re|ll|ve|d)$/, ''))
    .filter((w) => w !== '' && !STOP.has(w))
    .map(stem);

/**
 * A reflection says back at least half of the child's content words (and at least two when she used two),
 * or a piece of her line with nothing added: "A tower!" after "I made a tower!".
 */
export function isReflection(parent: string, childSaid: string): boolean {
  const child = Array.from(new Set(content(childSaid)));
  if (child.length === 0) return false;
  const said = new Set(content(parent));
  const overlap = child.filter((w) => said.has(w)).length;
  if (overlap >= Math.min(2, child.length) && overlap / child.length >= 0.5) return true;
  return said.size > 0 && overlap === said.size;
}

const flat = (s: string): string => words(normalize(s)).join(' ');

/** Her line as the parent says it back: "I'm" becomes "you're", "I" becomes "you", "my" becomes "your". */
const turned = (hers: string): string => hers.replace(/\bi'm\b/g, "you're").replace(/\bi am\b/g, 'you are').replace(/\bi\b/g, 'you').replace(/\bmy\b/g, 'your');

/** Her line said back word for word, also with her "I" turned into "you": "look it stays", "you made a tower". */
function saysSame(parent: string, childSaid: string): boolean {
  const hers = flat(childSaid);
  const mine = flat(parent);
  return mine.length > 0 && (mine === hers || mine === turned(hers));
}

/**
 * True when a criticism rule also matches the child's own last line (her "I" read as "you")
 * and the parent is saying that line back: "I can't do it!" -> "You can't do it."
 */
function saysBackHerComplaint(rule: RegExp, parent: string, childSaid?: string | null): boolean {
  if (!childSaid) return false;
  const hers = turned(normalize(childSaid)).replace(/[.!?,;:"]+$/g, '');
  return rule.test(hers) && isReflection(parent, childSaid);
}

/** What the parent added to her line: the parent's words with each of hers taken out once. */
function addedWords(parent: string, childSaid: string): string {
  const left = new Map<string, number>();
  const hers = flat(childSaid);
  for (const form of [hers, turned(hers)]) {
    const seen = new Map<string, number>();
    for (const w of form.split(' ')) seen.set(w, (seen.get(w) ?? 0) + 1);
    for (const [w, n] of seen) left.set(w, Math.max(left.get(w) ?? 0, n));
  }
  return words(parent)
    .filter((w) => {
      const n = left.get(w) ?? 0;
      if (n > 0) left.set(w, n - 1);
      return n === 0;
    })
    .join(' ');
}

/** Irregular pasts, so "You drew" and her "I am drawing" are seen as one verb. */
const PAST_OF: Record<string, string> = {
  made: 'make', drew: 'draw', built: 'build', gave: 'give', took: 'take', found: 'find', went: 'go', came: 'come', ate: 'eat', ran: 'run',
  sat: 'sit', held: 'hold', hid: 'hide', fed: 'feed', drove: 'drive', flew: 'fly', threw: 'throw', caught: 'catch', brought: 'bring',
  wrote: 'write', stood: 'stand', sang: 'sing', dug: 'dig', chose: 'choose', got: 'get', kept: 'keep', said: 'say', told: 'tell', left: 'leave',
};
const verbRoot = (w: string): string => {
  const base = PAST_OF[w] ?? w;
  return (base.length > 4 ? base.replace(/(?:ing|ed|es|s)$/, '') : base).replace(/e$/, '').replace(/([a-z])\1$/, '$1');
};

/** Verbs that say what a thing is or that she made it: with her own noun they give her line back ("You made a train."). */
const RESTATES = new Set(['make', 'draw', 'build', 'paint', 'color', 'write', 'create', 'say', 'call', 'name'].map((w) => verbRoot(w)));

/**
 * A sentence that shares a word with her line is not always her line said back. It is a description when it
 * has the form of one ("You are ...ing", "You ...ed") and
 *  - fewer than half of its own words are hers: "You are sliding the orange crayon over to me." after
 *    "You can have orange."; or
 *  - the action is not one she named and two or more of its words are new: "You stacked the books into a
 *    tower." after "The books make a tower."; or
 *  - her line names one thing only and the parent says what she does with it: "You are stacking the blocks."
 *    after "This block is for you."
 * "You made a train." after "It is a train.", "You drew a rainbow!" after "Rainbow!" and "You're making soup
 * for us." after "I'm making soup." stay reflections.
 * When in doubt it is a description: the parent can still say her words back and have both counted, while a
 * description taken for the reflection would leave her real words "already said".
 */
function describesNewAction(parent: string, verb: string, childSaid: string): boolean {
  const hers = new Set(content(childSaid));
  const mine = Array.from(new Set(content(parent)));
  if (mine.length === 0) return false;
  const shared = mine.filter((w) => hers.has(w)).length;
  if (shared / mine.length < 0.5) return true;
  const root = verbRoot(verb);
  if (new Set(words(normalize(childSaid)).map(verbRoot)).has(root)) return false;
  if (mine.length - shared >= 2) return true;
  return hers.size === 1 && !RESTATES.has(root);
}

// ---------- description ----------

const SEEING = "(?:(?:i see|i notice|i noticed|i can see|looks like) (?:that )?)?";
const DESC_ING = new RegExp(`^${SEEING}(?:you're|you are|youre) (?:\\w+ ){0,2}?(\\w+ing)\\b`);
/**
 * Words that may stand between "you" and the verb: "You gently laid the doll down", "You very slowly carried the cup",
 * "You did make a tower!". A closed list, so "You barely tried" and "You rudely grabbed it" stay out.
 */
const BEFORE_VERB =
  '(?:just|now|also|already|even|almost|really|still|then|very|so|finally|actually|gently|carefully|slowly|quietly|softly|neatly|quickly|patiently|kindly|proudly|calmly|happily|bravely|politely|nicely|sure|did)';
const DESC_VERB = new RegExp(`^${SEEING}you(?:'ve| have)? ((?:${BEFORE_VERB} ){0,2})(\\w+)\\b`);
/** "You finally listened.": said of what she was told to do, "finally" is a dig, not a description. */
const COMPLIED = set('listened stopped cleaned tidied helped shared waited behaved sat came calmed decided');
/** A description with nothing in it: "You are doing.", "You are going.", "You made." */
const EMPTY_DOING = /^(?:you're|you are) (?:doing|going)(?: (?:it|that|this))?$/;
const EMPTY_DID = /^you (?:made|got|put|took|gave|kept|used|found|went|did|had)$/;
/** Keys mashed into the shape of a verb: "sdfsdfing", "xkcding", "aaaaing". */
const mashed = (ing: string): boolean => {
  const root = ing.replace(/ing$/, '');
  return !isEnglishWord(ing) && (!/[aeiouy]/.test(root) || /(.)\1\1/.test(root) || /[^aeiouy]{5}/.test(root));
};
/** "I see you lining up the animals": no "are", still a description. */
const DESC_SEEN = /^(?:i see|i saw|i notice|i noticed|i can see) you (?:\w+ ){0,1}?(\w+ing)\b/;
/** Words ending in -ing that are not actions. */
const NOT_ACTION_ING = new Set(
  'king thing something nothing anything everything ring string wing spring morning evening ceiling darling sibling being interesting kidding exhausting irritating frustrating tiring confusing surprising charming'.split(
    ' ',
  ),
);

// ---------- which words are real ----------

/** Letters of other scripts. Words written in them are dropped, and the English around them is coded. */
const OTHER_SCRIPTS = /[\u0370-\u1fff\u2e80-\ud7ff]+/g;

const english = (w: string): boolean => isEnglishWord(w) || PRAISE_FILLER.has(w) || STOP.has(w) || IMPERATIVE.has(w);

/** "sooo", "noooo", "wheee": a letter held down is still the word, when one or two of it make a word. */
const unstretch = (s: string): string =>
  s.replace(/[a-z']*([a-z])\1{2,}[a-z']*/g, (w) => [w.replace(/(.)\1{2,}/g, '$1'), w.replace(/(.)\1{2,}/g, '$1$1')].find((x) => !english(w) && english(x)) ?? w);

/**
 * A name the coder cannot know ("Good job, Aiden!"): a word set off by a comma at either end of the
 * sentence, or written with a capital in the middle of it.
 */
function names(text: string): Set<string> {
  const found = [text.match(/^\s*([A-Za-z]+),/)?.[1], text.match(/,\s*([A-Za-z]+)[\s.!?]*$/)?.[1], ...(text.match(/(?<=[a-z,] )[A-Z][a-z]+/g) ?? [])];
  return new Set(found.filter((w): w is string => Boolean(w)).map((w) => w.toLowerCase()).filter((w) => !english(w)));
}

// ---------- main ----------

export function codeSentence(sentence: string, ctx: CodingContext = {}): CodedSentence {
  const text = sentence.trim();
  // Accents are folded ("très" -> "tres"); words in other scripts are dropped.
  const s = unstretch(normalize(text.normalize('NFD').replace(/[̀-ͯ]/g, '')).replace(OTHER_SCRIPTS, ' ').replace(/\s+/g, ' ').trim());

  /** Set once the sentence is known to take its kind words half back (see BACKHANDED): then it fills no ring. */
  let backhanded = false;
  const make = (code: Code, confidence: number, rule: string, namedBehavior?: Habit): CodedSentence => {
    if (backhanded && BUCKET[code] === 'target') {
      const mild: Code = code === 'specific_praise' ? 'general_praise' : 'neutral';
      return { text, code: mild, bucket: BUCKET[mild], confidence: 0.6, rule: 'backhanded' };
    }
    return { text, code, bucket: BUCKET[code], confidence, rule, ...(namedBehavior ? { namedBehavior } : {}) };
  };

  if (!/[a-z]/.test(s)) return make('unknown', 1, 'no_english_words');
  // Not play talk: it is not coded and counts for nothing. The screen shows where to find support.
  if (isSafetyConcern(text)) return make('unknown', 1, 'safety');

  // Another language in Latin letters ("muy bien", "du baust einen turm") is not coded: it has a common
  // word of that language and fewer than half of its words are English.
  const everyWord = words(s);
  if (everyWord.filter(english).length * 2 < everyWord.length && everyWord.some(isForeignWord)) return make('unknown', 0.9, 'no_english_words');

  // Who the sentence is said to ("Aiden, ...", "Sweet pea, ...") is set aside before it is read.
  const said = dropAddress(s);
  const all = words(said);
  const known = all.filter(english).length;
  /** Made-up words and nothing real next to them: the sentence is listed, but it names nothing. */
  const madeUp = known < all.length && !all.some(isPlayWord);
  /** More made-up words than real ones: one real word does not make the rest a sentence. */
  const mostlyMadeUp = known * 2 < all.length;

  const core = dropAddress(secondPerson(said).replace(LEAD, '').trim());
  const endsWithQuestionMark = /\?\s*$/.test(core);
  const bare = core.replace(/[.!?,;:"]+$/g, '').trim();
  if (!bare) return make('neutral', 0.9, 'filler');
  const first = words(bare)[0] ?? '';

  // 0. Her own line said back word for word is a reflection whatever its form: "look it stays".
  //    Her bare "No!" said back names nothing: it is neither a reflection nor a correction of her.
  if (ctx.childLastSaid && !endsWithQuestionMark && saysSame(s, ctx.childLastSaid)) {
    return flat(s) === 'no' ? make('neutral', 0.8, 'echoes_no') : make('reflection', 0.9, 'echoes_child');
  }
  backhanded = BACKHANDED.test(bare);

  // 1. Criticism ("not bad" is mild praise, not criticism)
  if (!/\bnot (?:too |so |that |half )?bad\b/.test(bare)) {
    for (const [re, rule, except] of CRITICISM) {
      if (!re.test(bare) || except?.test(bare)) continue;
      // Her own complaint said back ("This is too hard.") is a reflection, not a criticism of her,
      // unless something unkind was added to it: "This is too hard for a baby like you."
      if (ctx.childLastSaid && saysBackHerComplaint(re, bare, ctx.childLastSaid)) {
        const added = addedWords(bare, ctx.childLastSaid);
        const unkind = CRITICISM.find(([r, , ex]) => r.test(added) && !ex?.test(added));
        return unkind ? make('criticism', 0.85, unkind[1]) : make('reflection', 0.8, 'echoes_child');
      }
      return make('criticism', 0.9, rule);
    }
  }

  // 2. Command, including commands dressed as questions ("Can you hand me that?")
  if (CHEER.test(bare)) return make('neutral', 0.7, 'cheer');
  // "So close!" cheers her on; the lead-in "so" is gone from `bare`, and a bare "Close." would be an order.
  if (/^(?:oh,? )?so close[.!]*$/.test(said)) return make('neutral', 0.7, 'cheer');
  if (/^clean up,? clean up\b/.test(bare)) return make('neutral', 0.7, 'rhyme');
  // A cheer after a praise belongs to the praise: it is neither an order nor the "what" of the praise.
  const told = CHEER_TAIL.test(bare) && PRAISE.test(bare.replace(CHEER_TAIL, '')) ? bare.replace(CHEER_TAIL, '') : bare;
  const order = told.replace(SOFTENER, '');
  for (const [re, rule] of COMMAND_PHRASES) if (re.test(order)) return make('command', 0.9, rule);
  if (YOU_ORDER.test(told)) return make('command', 0.8, 'you_imperative');
  // "You will put the blocks away." ("You will get it next time!" is cheering her on.)
  const will = told.match(/^you will (\w+) (\w+)/);
  if (will && isBaseVerb(will[1]) && !/^(?:get|find|win|make)$/.test(will[1]) && OBJECT_START.has(will[2])) return make('command', 0.8, 'you_will');
  if (imperative(order)) return make('command', 0.85, 'imperative');
  if (PLEASE_REQUEST.test(order) && !NOT_A_REQUEST.test(order) && !PRAISE.test(order)) return make('command', 0.7, 'please_request');
  {
    // After "You ..." a clause is usually more narration ("You picked it up, put it on top"), so there an
    // order is read when it is announced ("You're doing great, now give me the red one."), or when it opens
    // with a verb in its base form and an object: "You built a tower, make it taller."
    const youFirst = first === 'you' || first === "you're";
    const clauses = told.split(/,\s*/);
    const head = clauses[0];
    // "You stack them up, line them up, and knock them down.": the present goes on after the comma.
    const presentHead = isBaseVerb(head.match(/^you (?:(?:always|just|now|then|can|could) )?(\w+)\b/)?.[1] ?? '');
    const progressiveHead = /^(?:you're|you are)\b/.test(head);
    // "I pour the tea, stir it, and drink it.": the parent telling what they do themselves.
    const ownPresent = isBaseVerb(head.match(/^(?:i|we) (?:(?:always|just|now|then|can|could|will) )?(\w+)\b/)?.[1] ?? '');
    for (const raw of clauses.slice(1).map((c) => c.replace(/^(?:and|then)\s+/, ''))) {
      const c = raw.replace(LEAD, '').trim();
      if (ownPresent && !/^(?:now|please|you)\b/.test(raw)) continue;
      if (youFirst && !/^(?:now|please)\b/.test(raw)) {
        const [verb = '', next = ''] = words(c);
        // "put" and "set" are also a past, so after a past they are narration: only "You are stacking, put ..." is an order.
        const tells = (isBaseVerb(verb) || IMPERATIVE.has(verb)) && OBJECT_START.has(next) && !presentHead && (!SAME_IN_PAST.has(verb) || progressiveHead);
        if (tells) return make('command', 0.7, 'command_after_comma');
        continue;
      }
      if (COMMAND_PHRASES.some(([re]) => re.test(c)) || imperative(c)) return make('command', 0.75, 'command_after_comma');
    }
  }
  if (orderInside(told)) return make('command', 0.75, 'command_inside');

  // 3. Question
  const wordsSaid = words(bare);
  // Speech and fast typing drop the comma of a tag: "you are building a house right", "nice tower huh".
  // A typed "You stacked the blocks right." keeps its period and stays a statement.
  const looseTag =
    wordsSaid.length >= 3 &&
    (/\bhuh$/.test(bare) ||
      (!/[.!]\s*$/.test(core) && /\bright$/.test(bare) && !RIGHT_IS_A_WORD.has(wordsSaid[wordsSaid.length - 2]) && !GETS_IT_RIGHT.test(bare)));
  // "You did it, yeah!" cheers; "Nice tower, yeah?" asks, and its question mark says so.
  const cheers = /,\s*(?:yeah|yes)$/.test(bare) && PRAISE.test(bare.replace(/,\s*(?:yeah|yes)$/, ''));
  // "You want to play cars now." with a period is a statement; without one, as spoken, it stays a question.
  const statesWant = /^you\b/.test(bare) && /[.!]\s*$/.test(core);
  const questionForm =
    endsWithQuestionMark ||
    (WH.test(bare) && !EXCLAMATIVE.test(bare)) ||
    AUX_INVERSION.test(bare) ||
    (NEGATIVE_INVERSION.test(bare) && !/!\s*$/.test(core)) ||
    (TAG.test(bare) && !cheers) ||
    looseTag ||
    (WANNA.test(bare) && !statesWant);
  if (questionForm) {
    return make('question', endsWithQuestionMark ? 0.95 : 0.8, endsWithQuestionMark ? 'question_mark' : 'question_form');
  }

  // 4. Praise: specific when it says what exactly, otherwise general
  if (PRAISE.test(told) && !NOT_PRAISE.test(told)) {
    const liked = told.match(PREFERENCE)?.[1];
    if (liked && !PRAISE_FILLER.has(liked) && !/ing$/.test(liked)) return make('neutral', 0.6, 'preference');
    if (PREFERS_ONE.test(told) || LIKES_OWN.test(told)) return make('neutral', 0.6, 'preference');
    // The "what" has to be a real word: "nice yy" praises nothing she can do again.
    const what = words(told.replace(ADDRESS, ' ').replace(SLANG_PRAISE, ' ')).filter((w) => !PRAISE_FILLER.has(w));
    if (what.some(isPlayWord)) {
      // "Nice tower, but it is crooked.": what comes after "but" takes the praise back, unless it is a skill itself.
      const but = told.match(/^(.+?),? but (.+)$/);
      if (but && PRAISE.test(but[1]) && codeSentence(but[2]).bucket !== 'target') return make('general_praise', 0.6, 'praise_but');
      return make('specific_praise', 0.85, 'praise_plus_what', namedHabit(told));
    }
    const called = names(text);
    if (what.some((w) => !english(w) && !called.has(w))) return make('general_praise', 0.6, 'unclear_praise');
    return make('general_praise', 0.9, 'praise_only');
  }
  if (POSITIVE_TRAIT.test(bare)) return make('specific_praise', 0.75, 'positive_trait', namedHabit(bare));
  if (POSITIVE_MANNER.test(bare)) return make('specific_praise', 0.75, 'positive_manner', namedHabit(bare));

  const ing = bare.match(DESC_ING) ?? bare.match(DESC_SEEN);
  const doing = ing && !NOT_ACTION_ING.has(ing[1]) ? ing[1] : null;
  const past = bare.match(DESC_VERB);
  // "You snapped them together": the past of any play verb is something she did.
  const did = past && (ACTION.has(past[2]) || (/ed$/.test(past[2]) && isActionWord(past[2]))) ? past[2] : null;

  // 5. Reflection: says the child's words back. A sentence that only shares a word with her line and tells
  //    what she is doing ("You are handing me a yellow block." after "This block is for you.") is a description.
  if (ctx.childLastSaid && isReflection(bare, ctx.childLastSaid)) {
    const action = doing ?? did;
    if (!action || !describesNewAction(bare, action, ctx.childLastSaid)) return make('reflection', 0.85, 'echoes_child');
  }

  // 6. Description of what the child is doing
  if (/\b(?:you're|you are|youre) going to\b/.test(bare)) return make('neutral', 0.55, 'future_plan');
  if (EMPTY_DOING.test(bare) || EMPTY_DID.test(bare)) return make('neutral', 0.5, 'empty_description');
  // One word said over and over is not a sentence: "You are stacking stacking stacking stacking."
  const stuck = /\b(\w+) \1 \1\b/.test(bare);
  if (doing) {
    // A description needs a real action or a real play thing: "You're blahing the foo" describes nothing.
    if (madeUp || mashed(doing)) return make('neutral', 0.4, 'unclear_action');
    if (mostlyMadeUp || stuck) return make('neutral', 0.4, 'unclear_words');
    return make('description', 0.9, 'you_are_doing');
  }
  if (past && did) {
    if (/\bfinally\b/.test(past[1]) && COMPLIED.has(did)) return make('neutral', 0.6, 'backhanded');
    if (mostlyMadeUp || stuck) return make('neutral', 0.4, 'unclear_words');
    return make('description', 0.85, 'you_did');
  }

  // 7. Neutral talk. A sentence about "you" that no rule caught gets a lower confidence.
  // One unknown word alone is a name ("Aiden!"); more of them are words the coder could not make out.
  if (madeUp) return all.length === 1 ? make('neutral', 0.5, 'name') : make('neutral', 0.4, 'unclear_words');
  const mentionsChild = /\byou(?:'re|r)?\b/.test(bare);
  return make('neutral', mentionsChild ? 0.55 : 0.8, mentionsChild ? 'neutral_mentions_child' : 'neutral');
}

/** Code a whole turn: split into sentences, code each. */
export function codeTurn(turn: string, ctx: CodingContext = {}): CodedSentence[] {
  return splitSentences(turn).map((s) => codeSentence(s, ctx));
}
