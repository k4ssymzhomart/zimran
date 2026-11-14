'use client';

import Link from 'next/link';
import { Shell } from '@/components/Bits';

/**
 * The jury guide: what to click in three minutes, what to type to test the rules,
 * and which parts are real. Static text only; every number here is also in the README.
 */

const PATH = [
  { href: '/', label: 'The home page', text: 'Answer Mia in your own words.' },
  {
    href: '/play',
    label: 'Play',
    text: 'A 60-second round, a 30-second lesson, a second round, and the before and after. Type, or tap "Speak instead" in Chrome or Edge.',
  },
  { href: '/dashboard', label: 'Dashboard', text: 'The plan, the streak, the calm check-in and the 28-day demo.' },
  { href: '/pricing', label: 'Pricing', text: 'The paywall and the Stripe test checkout.' },
  {
    href: '/live',
    label: 'Live (beta, optional)',
    text: 'Five minutes with your own child, spoken aloud. Needs Chrome or Edge and a microphone.',
  },
];

const TRY: { type: string; expect: string }[] = [
  { type: 'What are you building?', expect: 'A question. It goes to the "to swap" tray.' },
  { type: 'Put it here.', expect: 'A command. Also in the "to swap" tray.' },
  {
    type: 'Say her words back, e.g. "You made a tower!"',
    expect: 'A reflection only right after she speaks. At any other moment the same words are a description.',
  },
  {
    type: 'Good job!  then  Good job stacking so gently',
    expect: 'The first is general praise. The second is specific praise, and in the simulation it makes gentle play more likely.',
  },
  {
    type: 'Какая красивая башня',
    expect: 'A sentence in another script is not counted: it shows as "Not coded". Another language typed in Latin letters is read by the English rules, usually as neutral talk; a question mark still makes it a question.',
  },
  { type: 'The "Disagree?" link', expect: 'It sits next to your last three sentences during a round and next to every sentence in the round 1 result, and takes that sentence out of the count.' },
];

const REAL: { what: string; where: string }[] = [
  { what: 'The coding of every sentence. Rules, no LLM.', where: 'lib/coding/classify.ts' },
  { what: "The child's reactions, computed from your moves.", where: 'lib/child/model.ts' },
  { what: 'The clinic pace and the results.', where: 'lib/progress/targets.ts' },
  { what: 'The round, as a pure reducer.', where: 'lib/round/session.ts' },
  { what: 'The first visit, as a pure state machine.', where: 'lib/flow/journey.ts' },
  { what: 'Which spoken transcripts are passed on to the round.', where: 'lib/speech/speech.ts' },
  { what: 'The Stripe test checkout, confirmed on the server.', where: 'app/api/entitlement/route.ts' },
];

function Section({ id, title, children }: { id: string; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="sticker rise mt-6 bg-[#fffaf0] p-5">
      <h2 id={id} className="font-display text-xl font-semibold">
        {title}
      </h2>
      <div className="mt-3 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="break-words rounded-md border border-ink/30 bg-paper px-1.5 py-0.5 text-[12px]">{children}</code>
);

export default function JuryPage() {
  return (
    <Shell jury={false}>
      <h1 className="rise font-display text-4xl font-semibold leading-tight">
        Jury guide: <span className="italic text-tomato">three minutes</span>
      </h1>
      <p className="rise delay-1 mt-3 text-ink-soft">No login. Everything below is one tap away.</p>

      <Section id="path" title="Three minutes">
        <ol className="space-y-3">
          {PATH.map((step, i) => (
            <li key={step.href} className="flex gap-3">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-sun font-display font-semibold"
              >
                {i + 1}
              </span>
              <p>
                <Link href={step.href} className="font-bold underline decoration-tomato decoration-2 underline-offset-2">
                  {step.label}
                </Link>
                <span className="text-ink-soft"> ({step.href})</span>
                <br />
                {step.text}
                {step.href === '/pricing' && (
                  <>
                    {' '}
                    Test card <Code>4242 4242 4242 4242</Code>, any future date, any CVC.
                  </>
                )}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="try" title={<>Try to <span className="italic">break</span> it</>}>
        <p className="text-ink-soft">Six things worth typing, and what to expect.</p>
        <ul className="mt-3 space-y-3">
          {TRY.map((t) => (
            <li key={t.type} className="rounded-xl border-2 border-ink/80 bg-[#fffdf8] px-3 py-2">
              <p className="font-semibold">{t.type}</p>
              <p className="mt-1 text-ink-soft">{t.expect}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="real" title="What is real and what is simulated">
        <h3 className="inline-block rounded-full border-2 border-ink bg-leaf px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
          Real
        </h3>
        <ul className="mt-2 space-y-2">
          {REAL.map((r) => (
            <li key={r.where}>
              {r.what} <Code>{r.where}</Code>
            </li>
          ))}
        </ul>
        <h3 className="mt-4 inline-block rounded-full border-2 border-ink bg-plum px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
          Simulated, and labelled
        </h3>
        <ul className="mt-2 space-y-2">
          <li>Mia herself. She is a practice partner, not a real child.</li>
          <li>The 28-day demo family on the dashboard.</li>
        </ul>
        <h3 className="mt-4 inline-block rounded-full border-2 border-ink bg-sky px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
          Done by your browser
        </h3>
        <ul className="mt-2 space-y-2">
          <li>
            Speech to text, when you choose to speak. In Chrome the audio goes to Google&apos;s speech service. PlayReps
            receives the text only and does not record or store audio.
          </li>
        </ul>
      </Section>

      <Section id="numbers" title="Numbers we stand behind">
        <ul className="space-y-3">
          <li>
            <span className="font-display text-2xl font-semibold">321</span> unit tests. Run <Code>npm test</Code>.
          </li>
          <li>
            <span className="font-display text-2xl font-semibold">72 of 80</span> casual turns (90%) were coded as
            expected on the first run of a blind set, before any rule was changed. A separate reviewer wrote that set
            without seeing the rules. After generic fixes it is 80 of 80, so the set is no longer blind. An earlier
            check set of 48 was 40 of 48 on its first run and is 47 of 48 now. <Code>npm test</Code> prints both
            current numbers.
          </li>
          <li>
            The clinic norm used, in five minutes: <span className="font-semibold">10</span> specific praises,{' '}
            <span className="font-semibold">10</span> reflections, <span className="font-semibold">10</span>{' '}
            descriptions, and at most <span className="font-semibold">3</span> questions, commands and corrections.
          </li>
        </ul>
      </Section>

      <Section id="not-therapy" title="Not therapy">
        <p>
          PlayReps is skill practice for parents. It gives no diagnosis and makes no promise about any child&apos;s
          behaviour. Families who want a certified therapist can find one at{' '}
          <a
            href="https://www.pcit.org"
            target="_blank"
            rel="noreferrer"
            className="font-bold underline decoration-tomato decoration-2 underline-offset-2"
          >
            pcit.org
          </a>
          .
        </p>
      </Section>

      <div className="mt-6 flex justify-center">
        <Link href="/" className="btn btn-primary">
          Start with Mia
        </Link>
      </div>
    </Shell>
  );
}
