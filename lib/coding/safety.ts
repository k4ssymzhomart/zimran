/**
 * Safety screen. A short, conservative list of patterns for a sentence that is not play talk at all:
 * the parent speaking of hitting, beating, spanking, slapping, shaking, choking or hurting a child or themselves,
 * or of not being able to go on. Such a sentence is not coded and fills no ring; the screen shows
 * where to find support instead.
 *
 * It is a word filter, not an assessment: it misses most ways of saying these things, and it is built
 * to stay quiet on ordinary play ("The car hit the wall", "Don't hit the tower", "I'll shake them too",
 * "I hit you with the pillow", "I'm going to beat you at this game", "Tag, I hit you!", "I shook them all up")
 * and on a worried "Did I hurt you?".
 */

/** The two support lines shown with the note. Printed exactly like this everywhere. */
export const CRISIS_LINES: readonly string[] = [
  'Call or text 988 (Suicide & Crisis Lifeline)',
  'Childhelp National Child Abuse Hotline: 1-800-422-4453',
];

export const SAFETY_NOTE: { readonly headline: string; readonly body: string } = {
  headline: 'That one is not scored.',
  body: `If things feel like too much right now: ${CRISIS_LINES[0]}. ${CRISIS_LINES[1]}.`,
};

/**
 * Who the verb is aimed at. The lookaheads keep play talk out: "the baby doll", "the baby's bottle",
 * "her hand", "her feelings", and "them" when it means the blocks ("hit them together", "shake them too").
 */
const PERSON =
  "(?:(?:you|her|him|mia|myself|my (?:kid|kids|child|children|son|daughter|baby|toddler|little one)|the (?:kid|kids|child|children|baby)|your (?:butt|bottom|behind))" +
  "(?!'s)(?! (?:doll|dolls|dolly|rattle|bottle|toy|toys|teddy|bear|bunny|puppet|hand|hands|feelings|tower|block|blocks|car|cars|truck|trucks|boat|plane|house|castle|ball|drum|train|pot|cup|plate|spoon|out|off|up)\\b)" +
  "|them(?! (?:together|too|out|off|up|all up|all together|all out|all around|around)\\b))" +
  // A soft thing or a toy is play: "I hit you with the pillow", "I will hit you with my car", "I hit them with the hammer too".
  '(?! with (?:the|a|my|your|this|that) (?:toy )?(?:pillow|cushion|ball|balloon|snowball|bubbles?|feather|noodle|teddy|sock|water|beanbag|car|truck|train|block|hammer|mallet|sword|wand)\\b)' +
  // "I'm going to shake you like a snow globe!"
  '(?! like (?:a|an|the) (?:snow ?globe|rattle|maraca|tambourine|milkshake|bottle|leaf|tree|bell)\\b)';
/** "Beat" is also how a game is won: "beat you at this game", "beat you to the door", "beat you this time". */
const NOT_A_GAME = "(?! (?:at|to|there|this time|next time|again|every time|my|mine|i'm|i am|i win|i won|in (?:a |the |this |that )?(?:game|race|round))\\b)";
const HARM =
  '(?:hit|hitting|spank|spanked|spanking|slap|slapped|slapping|smack|smacked|smacking|shake|shook|shaking|hurt|hurting' +
  '|whoop|whooping|whup|whip|whipping|strangle|strangling|choke|choking|punch|punched|punching)';
/** The parent naming themselves to the child: "Mommy is going to hurt you". */
const SELF_NAMED = "(?:mommy|mom|mama|mum|mummy|daddy|dad|dada|papa)(?:'s|'ll)?";
/** Words that may stand between "I" and the verb: "I am going to", "I almost", "I feel like I could". */
const BETWEEN_WORD =
  "(?: (?:am|is|was|will|would|could|might|may|can|wanna|want to|wanted to|need to|have to|had to|feel like|felt like|going to|gonna|about to|close to|almost|nearly|just|really|so|sometimes|always|keep|kept|i|i'm|i'll))";
const BETWEEN = `${BETWEEN_WORD}*`;
// Not after "did" ("Did I hurt you?") and not after "tag" ("Tag, I hit you!").
const I = "(?<!\\b(?:did|tag) )\\bi(?:'m|'ll|'d)?";
/** The same, said of what is still to come: "I'll", "I will", "I am going to", "Mommy is going to". */
const I_WILL = `(?:(?<!\\bdid )\\bi'll|${I}${BETWEEN_WORD}+|\\b${SELF_NAMED}${BETWEEN_WORD}+)`;
const I_OR_SELF = `(?:${I}|\\b${SELF_NAMED})${BETWEEN}`;

const PATTERNS: RegExp[] = [
  // "I'm going to spank you", "I almost shook the baby", "I want to hurt myself".
  // Not after "did": "Did I hurt you?" is a parent checking on her.
  new RegExp(`${I}${BETWEEN} ${HARM} ${PERSON}\\b`),
  new RegExp(`(?<!\\bdid )\\b${SELF_NAMED}${BETWEEN} (?:${HARM}|beat) you\\b${NOT_A_GAME}`),
  // "I beat her", "I am going to beat you"; a bare "I beat you!" is a game won.
  new RegExp(`${I}${BETWEEN} (?:beat|beating) (?!you\\b)${PERSON}${NOT_A_GAME}`),
  new RegExp(`${I}${BETWEEN_WORD}+ (?:beat|beating) you\\b${NOT_A_GAME}`),
  // "Do you want me to spank you?"
  new RegExp(`\\b(?:want|need|make|making) me (?:to )?${HARM} ${PERSON}\\b`),
  // "Do you want a spanking?", "You are getting a spanking", "You will get a whooping"
  /\ba spanking\b/,
  /\b(?:get|gets|getting|want|wants|need|needs|give you|giving you) a (?:whooping|whupping|whipping|beating|smacking)\b/,
  // "I'll slap your face", "Mommy is going to smack your bottom": a threat, so only of what is still to come.
  new RegExp(`${I_WILL} (?:slap|smack|spank|whoop|whip|punch|hit|pop) your (?:face|mouth|head|butt|bottom|behind|bum|backside)\\b`),
  // "I will break your arm"
  new RegExp(`${I_OR_SELF} (?:break|snap|wring|twist) your (?:arms?|neck|legs?|fingers?)\\b`),
  // "I'm going to throw you out the window"; never "I'll throw you up in the air!"
  new RegExp(`${I_OR_SELF} throw you (?:out (?:of )?the window|against the wall|across the room|down the stairs)\\b`),
  /\bsomething to cry about\b/,
  /\bbeat the (?:crap|hell|snot|tar|daylights|living daylights) out of\b/,
  /\b(?:kill|harm) myself\b/,
  // Only with "I" in front: "The dragon is going to kill you!" is play.
  new RegExp(`${I}${BETWEEN} (?:kill|harm) (?:you|her|him|them)\\b`),
  /\bend (?:it all|my life)\b/,
  /\bi (?:want|wanna|wish) (?:to die|i (?:was|were) dead)\b/,
  // "Mommy wants to die."
  new RegExp(`\\b${SELF_NAMED} (?:wants|want|wishes) to die\\b`),
  /\bi (?:do not|don't) want to (?:live|be alive)\b/,
  // "I can't go on", never "I can't go on the slide"
  /\bi (?:can't|cannot|can not) go on\b(?! (?:the|a|an|my|your|this|that|top|it|here|there)\b)/,
  // Never "I can't take it anymore, this soup is too yummy."
  /\bi (?:can't|cannot|can not) (?:do this any ?more|take (?:it|this|her|him) any ?more|cope|keep going)\b(?!.*\b(?:yummy|delicious|tasty|cute|cuteness|funny|silly|adorable|sweet|fun|giggling|laughing)\b)/,
  /\bbetter off without me\b/,
];

const plain = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/\b(im|ill|cant|dont)\b/g, (w) => ({ im: "i'm", ill: "i'll", cant: "can't", dont: "don't" })[w] ?? w)
    .replace(/[^a-z' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** True for a sentence the practice must not score. See the note at the top of this file for its limits. */
export function isSafetyConcern(text: string): boolean {
  const s = plain(text);
  return PATTERNS.some((re) => re.test(s));
}
