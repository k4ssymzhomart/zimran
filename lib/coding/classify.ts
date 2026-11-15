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
import { ACTION, isActionWord, isEnglishWord, isForeignWord, isPlayWord } from './vocabulary';

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
    .replace(/\byour (being|\w+ing (?:the|a|an|it|them|that|this|those|these|my|your|all|some)\b)/g, "you're $1");
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

// ---------- criticism ----------

/**
 * Hostile talk is a criticism in whatever frame it comes: inside a praise ("I love how you ruin everything"),
 * as a description ("You are whining again") or as sarcasm ("Nice mess"). It never fills a ring.
 */
const HOSTILE: [RegExp, string][] = [
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
  // blame: what she is said to do to the parent
  [/\bwasting (?:my|our|everyone's) time\b/, 'blame'],
  [/\b(?:make|makes|making|made) me (?:so |really |very )?(?:angry|mad|crazy|sick|tired|upset|furious|nuts|late)\b/, 'blame'],
  [/\bdriving me (?:crazy|nuts|mad|insane|up the wall)\b/, 'blame'],
  [/\bon my (?:last )?nerves?\b/, 'blame'],
  [/\bgiving me a headache\b/, 'blame'],
  [/\b(?:sick|tired) of (?:you|your|this)\b|\bfed up\b|\bi(?:'ve| have)? had (?:it|enough)\b/, 'blame'],
  // a praise word on a put-down is sarcasm
  [/\b(?:nice|great|good|lovely|fine|wonderful|beautiful),? (?:another |a |big )*mess\b/, 'sarcasm'],
  // "Good job breaking it", "Thanks for nothing", "Way to go, you spilled it"
  [
    /\b(?:(?:good|great|nice|awesome|wonderful|excellent|super|fantastic) (?:job|work|going)|way to go|thanks(?: a lot| so much)? for|thank you(?: so much)? for),? (?:you |now it's |now you |it's )?(?:breaking|ruining|wrecking|spilling|destroying|messing|broke|broken|ruined|spilled|wrecked|nothing)\b/,
    'sarcasm',
  ],
  [/\b(?:going|job|one|work|move|done),? (?:genius|einstein|sherlock|smarty)\b/, 'sarcasm'],
];

const CRITICISM: [RegExp, string][] = [
  [/^(?:no\b(?!\s+(?:problem|worries|way|wonder))|nope\b|nah\b|enough(?:$|,| (?:of|already|now|with)\b))/, 'starts_with_no'],
  [/^(?:don't|dont|do not|stop|quit)\b(?! (?:worry|give up))/, 'negative_command'],
  [/\byou (?:shouldn't|should not|can't|cannot|must not|mustn't)\b/, 'you_cant'],
  [/\b(?:that's|that is|it's|it is|this is|you're|you are|those are|these are) not\b(?! (?:giving up|quitting|a problem|a big deal)\b)/, 'correction'],
  [/\bnot (?:like that|that way|right|nice|good|okay|ok|how|there(?! yet)|that one|this one|those)\b/, 'correction'],
  [/\b(?:doesn't|does not) (?:go|belong)\b/, 'correction'],
  [/\bi said no\b/, 'correction'],
  // "not so good", "that wasn't nice". ("Isn't that nice?" is a question, so "isn't" takes no "that".)
  [/\b(?:not|wasn't|weren't) (?:so |very |really |too |that )?(?:nice|good|okay|ok|right|kind|great)\b|\b(?:isn't|aren't) (?:so |very |really )?(?:nice|good|okay|ok|right|kind)\b|\bno good\b/, 'correction'],
  [/^cool it\b/, 'negative_command'],
  [/\b(?:wrong|bad(?! (?:guys?|wolf))|naughty|messy|sloppy|ugly|stupid|dumb|lazy|rude|gross|yucky|terrible|awful(?! lot)|horrible|annoying|boring|disgusting|bossy|brat|idiot|shut up)\b/, 'negative_word'],
  [/\b(?:you're|you are) (?:ruining|breaking|wrecking|embarrassing|driving me)\b/, 'negative_word'],
  [/\byou (?:always |just |really )?(?:broke|ruined|wrecked|ruin|ruins|wreck|wrecks|messed up|mess up)\b/, 'negative_word'],
  [/\btoo (?:rough|loud|fast|slow|hard|messy|much(?! fun))\b/, 'too_much'],
  [/\b(?:being|so|are|you're) mean\b/, 'negative_word'],
  [/\bi (?:don't|do not) like\b/, 'dislike'],
  [/\bi hate\b/, 'dislike'],
  [/\b(?:make|makes|making|made) (?:a|such a|a big|a huge|another) mess\b/, 'negative_word'],
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
  ...HOSTILE,
];

// ---------- commands ----------

const COMMAND_PHRASES: [RegExp, string][] = [
  [/^(?:let's|lets|let us)\b/, 'lets'],
  [/^(?:can|could|will|would) you\b/, 'can_you'],
  [/^(?:why don't (?:you|we)|why not|how about|what about (?:you|we)|shall we)\b/, 'suggestion'],
  [
    /^(?:you (?:need|have|ought) to(?! see)|you must(?! be)|you should(?! (?:be (?:so |very |really )?proud|see))|you'd better|you better|i (?:want|need) you to|we (?:need|have) to|we should|it's time to|time to)\b/,
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

/** A soft opening does not change an order: "Maybe put that one there", "Just give it to me". */
const SOFTENER = /^(?:(?:maybe|perhaps|i think|i guess|just)\s+)+/;
/** "Play time is fun", "Paint is wet", "Clean up time is over": the first word is a thing, not an order. */
const THING_FIRST = /^\w+ (?:(?!(?:it|this|that|me|what|who|how|where|them|him|her|here|there)\b)\w+ (?:\w+ )?)?(?:is|are|was|were|isn't|aren't)\b/;
/** Cheering her on is not an order: "Go Mia go!" */
const CHEER = /^go (?:go|mia)(?: go)*$/;
/** "You give me that", "You stop it right now": an order with "you" in front. */
const YOU_ORDER =
  /^you (?:(?:give|hand|bring|pass) (?:me|it|that|this)|come (?:here|back|over)|(?:sit|get|put that|put it) (?:down|back|over here)|(?:stop|quit) (?:it|that|this|right)|\w+ (?:\w+ ){0,3}right now$)\b/;

/** An order said in the middle of a sentence: "... but you need to be quiet", "nice tower can you make it taller". */
const ORDER_INSIDE =
  /(?<!\b(?:do|did|does|if|when|what|how|where|why|who) )\b(?:you (?:need|have|ought) to(?! see)|you must(?! be)|you should(?! (?:be (?:so |very |really )?proud|see))|you'd better|you better|i (?:want|need) you to|we (?:need|have) to|we should|it's time to|let's(?! (?:you|her|him|me|them|it|us)\b))\b|(?<!\b(?:what|how|where|when|who|which|why|if|you|far|fast|many|much|high|tall|long) )\b(?:can|could|will|would) you\b(?= \w)/;

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
    if (ORDER_PHRASE.test(t.slice(i).join(' ')) && !subject(prev) && !/^(?:and|or|me|him|her|them|us|say|says|said)$/.test(prev)) return true;

    if (!OBJECT_VERBS.has(w) || !OBJECT_START.has(next) || subject(prev) || NOUN_BEFORE.has(prev)) continue;
    // "you gently put it": an adverb between the subject and its verb
    if (/ly$/.test(prev) && subject(t[i - 2])) continue;
    const clauseStart = t.lastIndexOf(',', i) + 1;
    const caused = t.slice(clauseStart, i).some((x) => CAUSES.test(x));
    if (CAUSES.test(t[i - 2] ?? '') || (caused && !points)) continue;
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
const TAG = /(?:,\s*(?:right|huh|okay|ok|yeah|no)$)|(?:\b(?:isn't it|aren't you|don't you|doesn't it|won't you|didn't you)$)/;
/** "Wanna play with the cars" is a question even without a question mark. */
const WANNA = /^(?:you )?(?:wanna|want to)\b/;

// ---------- praise ----------

const NOT_PRAISE = /\bgood (?:morning|night|bye|afternoon|evening|grief|luck|heavens|gracious)\b|\bgoodbye\b/;
const PRAISE = new RegExp(
  [
    /\b(?:good|great|nice|nicely|awesome|excellent|fantastic|terrific|wonderful|amazing|super|perfect|beautiful|beautifully|lovely|gorgeous|cute|brilliant|impressive|incredible|cool|neat|smart|clever|proud|bravo|well done|way to go|not bad)\b/,
    /\bi (?:really |just |do )?(?:like|love)\b/,
    /\b(?:thank you|thanks)\b/,
    /\byou did it\b|\byou got it(?=$|,| (?:right|again)\b)|\bthere you go\b|\bhigh five\b|\blook at you\b/,
    /\byou (?:figured (?:it|that) out|nailed it)\b|\byou(?:'ve| have)? got this\b|\b(?:you're|you are) the best\b/,
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

/** Words that do not say WHAT is being praised. If nothing else is left, the praise is general. */
const PRAISE_FILLER = new Set(
  (
    'good great nice nicely awesome excellent fantastic terrific wonderful amazing super perfect beautiful ' +
    'gorgeous cute looks look no got high five pretty ' +
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

const stem = (w: string): string => (w.length > 4 ? w.replace(/(?:ing|ed|es|s)$/, '') : w);
const content = (s: string): string[] => words(normalize(s)).filter((w) => !STOP.has(w)).map(stem);

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

/** Her line said back word for word, also with her "I" turned into "you": "look it stays", "you made a tower". */
function saysSame(parent: string, childSaid: string): boolean {
  const hers = flat(childSaid);
  const turned = hers.replace(/\bi'm\b/g, "you're").replace(/\bi am\b/g, 'you are').replace(/\bi\b/g, 'you').replace(/\bmy\b/g, 'your');
  const mine = flat(parent);
  return mine.length > 0 && (mine === hers || mine === turned);
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
  const s = unstretch(normalize(text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')).replace(OTHER_SCRIPTS, ' ').replace(/\s+/g, ' ').trim());

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

  // Another language in Latin letters ("muy bien", "du baust einen turm") is not coded: it has a common
  // word of that language and fewer than half of its words are English.
  const all = words(s);
  const known = all.filter(english).length;
  if (known * 2 < all.length && all.some(isForeignWord)) return make('unknown', 0.9, 'no_english_words');
  /** Made-up words and nothing real next to them: the sentence is listed, but it names nothing. */
  const madeUp = known < all.length && !all.some(isPlayWord);

  const core = s.replace(LEAD, '').trim();
  const endsWithQuestionMark = /\?\s*$/.test(core);
  const bare = core.replace(/[.!?,;:"]+$/g, '').trim();
  if (!bare) return make('neutral', 0.9, 'filler');
  const first = words(bare)[0] ?? '';

  // 0. Her own line said back word for word is a reflection whatever its form: "look it stays".
  //    Her bare "No!" said back names nothing: it is neither a reflection nor a correction of her.
  if (ctx.childLastSaid && !endsWithQuestionMark && saysSame(s, ctx.childLastSaid)) {
    return flat(s) === 'no' ? make('neutral', 0.8, 'echoes_no') : make('reflection', 0.9, 'echoes_child');
  }

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
  if (CHEER.test(bare)) return make('neutral', 0.7, 'cheer');
  const order = bare.replace(SOFTENER, '');
  for (const [re, rule] of COMMAND_PHRASES) if (re.test(order)) return make('command', 0.9, rule);
  if (YOU_ORDER.test(bare)) return make('command', 0.8, 'you_imperative');
  const imperative = (c: string): boolean =>
    IMPERATIVE.has(words(c)[0] ?? '') && !AUX_INVERSION.test(c) && !THING_FIRST.test(c) && !/^look at you\b/.test(c);
  if (imperative(order)) return make('command', 0.85, 'imperative');
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
      if (COMMAND_PHRASES.some(([re]) => re.test(c)) || imperative(c)) return make('command', 0.75, 'command_after_comma');
    }
  }
  if (orderInside(bare)) return make('command', 0.75, 'command_inside');

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
    const liked = bare.match(PREFERENCE)?.[1];
    if (liked && !PRAISE_FILLER.has(liked) && !/ing$/.test(liked)) return make('neutral', 0.6, 'preference');
    // The "what" has to be a real word: "nice yy" praises nothing she can do again.
    const what = words(bare).filter((w) => !PRAISE_FILLER.has(w));
    if (what.some(isPlayWord)) return make('specific_praise', 0.85, 'praise_plus_what', namedHabit(bare));
    const called = names(text);
    if (what.some((w) => !english(w) && !called.has(w))) return make('general_praise', 0.6, 'unclear_praise');
    return make('general_praise', 0.9, 'praise_only');
  }
  if (POSITIVE_TRAIT.test(bare)) return make('specific_praise', 0.75, 'positive_trait', namedHabit(bare));
  if (POSITIVE_MANNER.test(bare)) return make('specific_praise', 0.75, 'positive_manner', namedHabit(bare));

  // 5. Reflection: says the child's words back
  if (ctx.childLastSaid && isReflection(bare, ctx.childLastSaid)) return make('reflection', 0.85, 'echoes_child');

  // 6. Description of what the child is doing
  if (/\b(?:you're|you are|youre) going to\b/.test(bare)) return make('neutral', 0.55, 'future_plan');
  const ing = bare.match(DESC_ING) ?? bare.match(DESC_SEEN);
  if (ing && !NOT_ACTION_ING.has(ing[1])) {
    // A description needs a real action or a real play thing: "You're blahing the foo" describes nothing.
    if (madeUp) return make('neutral', 0.4, 'unclear_action');
    return make('description', 0.9, 'you_are_doing');
  }
  const verb = bare.match(DESC_VERB);
  // "You snapped them together": the past of any play verb is something she did.
  if (verb && (ACTION.has(verb[1]) || (/ed$/.test(verb[1]) && isActionWord(verb[1])))) return make('description', 0.85, 'you_did');

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
