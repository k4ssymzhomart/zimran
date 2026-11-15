/**
 * Rule-based coding of what a parent says during play.
 * Pure TypeScript, no network, no LLM. Every sentence gets exactly one code.
 *
 * Order of checks: criticism > command > question > praise > reflection > description > neutral.
 * (Praise in question form, "Did you do a good job?", is a question, so questions are checked first.)
 */
import { BUCKET, type Code, type CodedSentence, type CodingContext, type Habit } from '../types';
import { isSafetyConcern } from './safety';

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
    .replace(/\byour (being|\w+ing (?:the|a|an|it|them|that|this|those|these|my|your|all|some)\b)/g, "you're $1");
}

const WH_WORDS = new Set(['what', 'where', 'who', 'why', 'how', 'which', 'when']);
const AUX_WORDS = new Set(['is', 'are', 'was', 'were', 'do', 'does', 'did', 'can', 'could', 'will', 'would', 'should']);

/**
 * Split a parent's turn into sentences. Each sentence is coded on its own.
 * Typed turns often run on without punctuation ("thats so cool what is that"),
 * so a question word followed by an auxiliary, after at least two words, also starts a new sentence.
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
    let start = 0;
    for (let i = 2; i < tokens.length - 1; i++) {
      const word = tokens[i].toLowerCase().replace(/[^a-z']/g, '');
      const next = tokens[i + 1].toLowerCase().replace(/[^a-z']/g, '');
      if (WH_WORDS.has(word) && AUX_WORDS.has(next) && i - start >= 2) {
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

/** Interjections and names at the start of a sentence carry no code of their own. */
const LEAD =
  /^(?:(?:(?:oh no|uh oh|uh-oh|oops|whoa|wow|ooh|oh|aww|aw|ah|hey|hmm|hm|yay|okay|ok|well(?! done)|so|and|now|please|mia|sweetie|sweetheart|honey|buddy|baby|kiddo)\b|look(?=,))[,!.]*\s*)+/;

// ---------- criticism ----------

const CRITICISM: [RegExp, string][] = [
  [/^(?:no\b(?!\s+(?:problem|worries|way|wonder))|nope\b|nah\b|enough(?:$|,| (?:of|already|now|with)\b))/, 'starts_with_no'],
  [/^(?:don't|dont|do not|stop|quit)\b(?! (?:worry|give up))/, 'negative_command'],
  [/\byou (?:shouldn't|should not|can't|cannot|must not|mustn't)\b/, 'you_cant'],
  [/\b(?:that's|that is|it's|it is|this is|you're|you are|those are|these are) not\b/, 'correction'],
  [/\bnot (?:like that|that way|right|nice|good|okay|ok|how|there(?! yet)|that one|this one|those)\b/, 'correction'],
  [/\b(?:doesn't|does not) (?:go|belong)\b/, 'correction'],
  [/\bi said no\b/, 'correction'],
  [/\b(?:wrong|bad(?! (?:guys?|wolf))|naughty|messy|sloppy|ugly|stupid|dumb|lazy|rude|gross|yucky|terrible|awful(?! lot)|horrible|annoying|boring|disgusting|bossy|brat|idiot|shut up)\b/, 'negative_word'],
  [/\b(?:you're|you are) (?:ruining|breaking|wrecking|embarrassing|driving me)\b/, 'negative_word'],
  [/\byou (?:broke|ruined|wrecked)\b/, 'negative_word'],
  [/\btoo (?:rough|loud|fast|slow|hard|messy|much)\b/, 'too_much'],
  [/\b(?:being|so|are|you're) mean\b/, 'negative_word'],
  [/\bi (?:don't|do not) like\b/, 'dislike'],
  [/\bi hate\b/, 'dislike'],
  [/\b(?:making|made) (?:a|such a|a big|a huge) mess\b/, 'negative_word'],
  [/\byou never\b(?! (?:give up|gave up|quit))/, 'you_never'],
  [/\bwhat's wrong with you\b/, 'negative_word'],
];

// ---------- commands ----------

const COMMAND_PHRASES: [RegExp, string][] = [
  [/^(?:let's|lets|let us)\b/, 'lets'],
  [/^(?:can|could|will|would) you\b/, 'can_you'],
  [/^(?:why don't (?:you|we)|why not|how about|what about (?:you|we)|shall we)\b/, 'suggestion'],
  [
    /^(?:you (?:need|have|ought) to|you must|you should(?! be (?:so |very |really )?proud)|you'd better|you better|i (?:want|need) you to|we (?:need|have) to|we should|it's time to|time to)\b/,
    'you_need_to',
  ],
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

// ---------- questions ----------

const WH = /^(?:what|where|who|whose|why|how|which|when)\b/;
const EXCLAMATIVE =
  /^(?:what an?\b|how (?:nice|cool|great|beautiful|pretty|tall|big|fun|wonderful|lovely|neat|awesome|amazing|clever|smart|kind|gentle|careful)\b)/;
const AUX_INVERSION =
  /^(?:is|are|was|were|do|does|did|can|could|will|would|should|shall|have|has|am)\s+(?:you|we|i|it|she|he|they|that|this|the|your|there|those|these)\b/;
const TAG = /(?:,\s*(?:right|huh|okay|ok|yeah|no)$)|(?:\b(?:isn't it|aren't you|don't you|doesn't it|won't you|didn't you)$)/;
/** "Wanna play with the cars" is a question even without a question mark. */
const WANNA = /^(?:you )?(?:wanna|want to)\b/;

// ---------- praise ----------

const NOT_PRAISE = /\bgood (?:morning|night|bye|afternoon|evening)\b|\bgoodbye\b/;
const PRAISE =
  /\b(?:good|great|nice|nicely|awesome|excellent|fantastic|terrific|wonderful|amazing|super|perfect|beautiful|beautifully|lovely|gorgeous|cute|brilliant|impressive|incredible|cool|neat|smart|clever|proud|bravo|well done|way to go|not bad)\b|\bi (?:really |just |do )?(?:like|love)\b|\b(?:thank you|thanks)\b|\byou did it\b|\byou got it(?=$|,| (?:right|again)\b)|\bthere you go\b|\bhigh five\b|\b(?:so|very|really|how|looks|that's|it's|is) pretty(?=$|,| (?:too|and|on|in|with|like|there|here|today|now)\b)|\ba pretty\b(?! (?:good|big|tall|much|fast|hard|cool|well|close|sure|soon))/;

/** "You are so careful with the blocks": a positive word about how she is behaving is specific praise. */
const POSITIVE_TRAIT =
  /\b(?:you're|you are) (?:being )?(?:so |very |really |super |such a )?(?:careful|gentle|patient|kind|helpful|polite|brave|creative|thoughtful|generous)\b/;

/** Words that do not say WHAT is being praised. If nothing else is left, the praise is general. */
const PRAISE_FILLER = new Set(
  (
    'good great nice nicely awesome excellent fantastic terrific wonderful amazing super perfect beautiful ' +
    'gorgeous cute looks look no got high five pretty ' +
    "beautifully lovely brilliant impressive incredible cool neat smart clever proud bravo well done way go not bad " +
    "like love thank thanks job work that that's this is it it's so very really such a an the what you you're are " +
    "did do doing i i'm im am of for to with just how too and there thing one stuff me my your we on in at be been " +
    'was were yeah yes yay wow oh see have has buddy sweetie sweetheart honey mia baby kiddo girl boy dear bud champ pal ' +
    // When, not what: "Good job today" still does not say what she did.
    'today tonight again now always everyone guys'
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

const stem = (w: string): string => (w.length > 4 ? w.replace(/(?:ing|ed|es|s)$/, '') : w);
const content = (s: string): string[] => words(normalize(s)).filter((w) => !STOP.has(w)).map(stem);

/** A reflection says back at least half of the child's content words (and at least two when she used two). */
export function isReflection(parent: string, childSaid: string): boolean {
  const child = Array.from(new Set(content(childSaid)));
  if (child.length === 0) return false;
  const said = new Set(content(parent));
  const overlap = child.filter((w) => said.has(w)).length;
  return overlap >= Math.min(2, child.length) && overlap / child.length >= 0.5;
}

/**
 * True when a criticism rule also matches the child's own last line (her "I" read as "you")
 * and the parent is saying that line back: "I can't do it!" -> "You can't do it."
 */
function saysBackHerComplaint(rule: RegExp, parent: string, childSaid?: string | null): boolean {
  if (!childSaid) return false;
  const hers = normalize(childSaid).replace(/\bi\b/g, 'you').replace(/[.!?,;:"]+$/g, '');
  return rule.test(hers) && isReflection(parent, childSaid);
}

// ---------- description ----------

const ACTION = new Set(
  (
    'put made make built build drew draw picked pick chose choose stacked stack colored color placed place moved ' +
    'move pushed push pulled pull turned turn added add found find took take gave give shared share rolled roll ' +
    'lined line opened open closed close mixed mix poured pour cut held hold set knocked knock fixed fix connected ' +
    'connect pressed press used use got get tried try finished finish started start filled fill drove drive flew ' +
    'fly fed feed washed wash cooked cook hid hide dropped drop lifted lift balanced balance matched match sorted ' +
    'sort painted paint wrote write counted count handed hand brought bring parked park covered cover wrapped wrap ' +
    'kept keep went go came come sat sit stood stand jumped jump ran run threw throw laid lay squeezed squeeze ' +
    'tapped tap showed show grabbed grab carried carry sang sing tucked tuck wiped wipe stirred stir scooped scoop ' +
    'dug dig bounced bounce caught catch kicked kick attached attach joined join dressed dress brushed brush'
  ).split(' '),
);

const SEEING = "(?:(?:i see|i notice|i noticed|i can see|looks like) (?:that )?)?";
const DESC_ING = new RegExp(`^${SEEING}(?:you're|you are|youre) (?:\\w+ ){0,2}?(\\w+ing)\\b`);
const DESC_VERB = new RegExp(`^${SEEING}you(?:'ve| have)? (?:just |now |also |already |even )?(\\w+)\\b`);
/** "I see you lining up the animals": no "are", still a description. */
const DESC_SEEN = /^(?:i see|i saw|i notice|i noticed|i can see) you (?:\w+ ){0,1}?(\w+ing)\b/;
/** Words ending in -ing that are not actions. */
const NOT_ACTION_ING = new Set(
  'king thing something nothing anything everything ring string wing spring morning evening ceiling darling sibling being interesting kidding exhausting irritating frustrating tiring confusing surprising charming'.split(
    ' ',
  ),
);

// ---------- main ----------

export function codeSentence(sentence: string, ctx: CodingContext = {}): CodedSentence {
  const text = sentence.trim();
  const s = normalize(text);

  const make = (code: Code, confidence: number, rule: string, namedBehavior?: Habit): CodedSentence => ({
    text,
    code,
    bucket: BUCKET[code],
    confidence,
    rule,
    ...(namedBehavior ? { namedBehavior } : {}),
  });

  if (!/[a-z]/.test(s)) return make('unknown', 1, 'no_english_words');
  // Not play talk: it is not coded and counts for nothing. The screen shows where to find support.
  if (isSafetyConcern(text)) return make('unknown', 1, 'safety');

  const core = s.replace(LEAD, '').trim();
  const endsWithQuestionMark = /\?\s*$/.test(core);
  const bare = core.replace(/[.!?,;:"]+$/g, '').trim();
  if (!bare) return make('neutral', 0.9, 'filler');
  const first = words(bare)[0] ?? '';

  // 1. Criticism ("not bad" is mild praise, not criticism)
  if (!/\bnot bad\b/.test(bare)) {
    for (const [re, rule] of CRITICISM) {
      if (!re.test(bare)) continue;
      // Her own complaint said back ("This is too hard.") is a reflection, not a criticism of her.
      if (saysBackHerComplaint(re, bare, ctx.childLastSaid)) return make('reflection', 0.8, 'echoes_child');
      return make('criticism', 0.9, rule);
    }
  }

  // 2. Command, including commands dressed as questions ("Can you hand me that?")
  for (const [re, rule] of COMMAND_PHRASES) if (re.test(bare)) return make('command', 0.9, rule);
  if (IMPERATIVE.has(first) && !AUX_INVERSION.test(bare)) return make('command', 0.85, 'imperative');
  {
    // After "You ..." a clause is usually more narration ("You picked it up, put it on top"), so there an
    // order is read only when it is announced: "You're doing great, now give me the red one."
    const youFirst = first === 'you' || first === "you're";
    const tails = bare
      .split(/,\s*/)
      .slice(1)
      .map((c) => c.replace(/^(?:and|then)\s+/, ''))
      .filter((c) => !youFirst || /^(?:now|please)\b/.test(c))
      .map((c) => c.replace(LEAD, '').trim());
    for (const c of tails) {
      if (COMMAND_PHRASES.some(([re]) => re.test(c)) || (IMPERATIVE.has(words(c)[0] ?? '') && !AUX_INVERSION.test(c))) return make('command', 0.75, 'command_after_comma');
    }
  }

  // 3. Question
  const questionForm =
    endsWithQuestionMark ||
    (WH.test(bare) && !EXCLAMATIVE.test(bare)) ||
    AUX_INVERSION.test(bare) ||
    TAG.test(bare) ||
    WANNA.test(bare);
  if (questionForm) {
    return make('question', endsWithQuestionMark ? 0.95 : 0.8, endsWithQuestionMark ? 'question_mark' : 'question_form');
  }

  // 4. Praise: specific when it says what exactly, otherwise general
  if (PRAISE.test(bare) && !NOT_PRAISE.test(bare)) {
    const what = words(bare).filter((w) => !PRAISE_FILLER.has(w));
    if (what.length > 0) return make('specific_praise', 0.85, 'praise_plus_what', namedHabit(bare));
    return make('general_praise', 0.9, 'praise_only');
  }
  if (POSITIVE_TRAIT.test(bare)) return make('specific_praise', 0.75, 'positive_trait', namedHabit(bare));

  // 5. Reflection: says the child's words back
  if (ctx.childLastSaid && isReflection(bare, ctx.childLastSaid)) return make('reflection', 0.85, 'echoes_child');

  // 6. Description of what the child is doing
  if (/\b(?:you're|you are|youre) going to\b/.test(bare)) return make('neutral', 0.55, 'future_plan');
  const ing = bare.match(DESC_ING) ?? bare.match(DESC_SEEN);
  if (ing && !NOT_ACTION_ING.has(ing[1])) return make('description', 0.9, 'you_are_doing');
  const verb = bare.match(DESC_VERB);
  if (verb && ACTION.has(verb[1])) return make('description', 0.85, 'you_did');

  // 7. Neutral talk. A sentence about "you" that no rule caught gets a lower confidence.
  const mentionsChild = /\byou(?:'re|r)?\b/.test(bare);
  return make('neutral', mentionsChild ? 0.55 : 0.8, mentionsChild ? 'neutral_mentions_child' : 'neutral');
}

/** Code a whole turn: split into sentences, code each. */
export function codeTurn(turn: string, ctx: CodingContext = {}): CodedSentence[] {
  return splitSentences(turn).map((s) => codeSentence(s, ctx));
}
