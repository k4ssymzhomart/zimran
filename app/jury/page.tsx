'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/Bits';
import { ArrowRight, ChevronRight } from '@/components/Icons';
import { Rings } from '@/components/Rings';
import { Pill } from '@/components/ui';

/**
 * The jury guide: what to click in three minutes, what to type to test the rules,
 * and which parts are real. Static text only; every number here is also in the README.
 */

const PATH: { href: string; label: string; beta?: boolean; text: React.ReactNode }[] = [
  { href: '/', label: 'Landing page', text: 'One button, “Start practising”.' },
  { href: '/start', label: 'Pick Mia or Leo', text: 'Choose a simulated girl or boy, then answer in your own words.' },
  {
    href: '/play',
    label: 'Play',
    text: 'A 60-second round, a 30-second lesson, a second round, and the before and after. Type, or tap the microphone in Chrome or Edge.',
  },
  { href: '/dashboard', label: 'Dashboard', text: 'The plan, the streak, the calm check-in and the 28-day demo.' },
  {
    href: '/pricing',
    label: 'Pricing',
    text: (
      <>
        The paywall and the Stripe test checkout.
        <span className="mt-1 block">
          Test card <Code>4242 4242 4242 4242</Code>, any future date, any CVC.
        </span>
      </>
    ),
  },
  {
    href: '/live',
    label: 'Live',
    beta: true,
    text: 'Optional. Five minutes with your own child, spoken aloud. Needs Chrome or Edge and a microphone.',
  },
];

const TRY: { say: React.ReactNode; expect: string }[] = [
  { say: '“What are you building?”', expect: 'A question. It goes to the “to swap” tray.' },
  { say: '“Put it here.”', expect: 'A command. Also in the “to swap” tray.' },
  {
    say: 'Her words back, like “You made a tower!”',
    expect: 'A reflection only right after she speaks. At any other moment the same words are a description.',
  },
  {
    say: '“Good job!”, then “Good job stacking so gently”',
    expect: 'The first is general praise. The second is specific praise, and in the simulation it makes gentle play more likely.',
  },
  {
    say: '“Какая красивая башня”',
    expect:
      'A sentence in another script is not counted: it shows as “Not coded”. Another language typed in Latin letters is read by the English rules, usually as neutral talk; a question mark still makes it a question.',
  },
  {
    say: 'The “Disagree?” link',
    expect:
      'It sits next to your last three sentences during a round and next to every sentence in the round 1 result, and takes that sentence out of the count.',
  },
];

const REAL: { what: string; where: string }[] = [
  { what: 'The coding of every sentence. Rules, no LLM.', where: 'lib/coding/classify.ts' },
  { what: 'The child’s reactions, computed from your moves.', where: 'lib/child/model.ts' },
  { what: 'The clinic pace and the results.', where: 'lib/progress/targets.ts' },
  { what: 'The round, as a pure reducer.', where: 'lib/round/session.ts' },
  { what: 'The first visit, as a pure state machine.', where: 'lib/flow/journey.ts' },
  { what: 'Which spoken transcripts are passed on to the round.', where: 'lib/speech/speech.ts' },
  { what: 'The Stripe test checkout, confirmed on the server.', where: 'app/api/entitlement/route.ts' },
];

/** The clinic norm for five minutes, drawn with the same rings a round uses. */
const NORM = {
  specific_praise: { count: 10, target: 10 },
  reflection: { count: 10, target: 10 },
  description: { count: 10, target: 10 },
  avoid: { count: 3, max: 3 },
};

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="inline-block whitespace-nowrap rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[12.5px] leading-tight text-fg-2">
      {children}
    </code>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="card enter p-5 sm:p-7">
      <h2 id={id} className="text-[20px] font-bold leading-tight tracking-[-0.025em] text-fg text-balance sm:text-[22px]">
        {title}
      </h2>
      <div className="mt-4 text-[15px] leading-[1.55] text-fg-2">{children}</div>
    </section>
  );
}

export default function JuryPage() {
  // Same wrapper as every page: a link back here starts the page fresh.
  const { bfcacheId } = useRouter();
  return <Guide key={bfcacheId} />;
}

function Guide() {
  return (
    <Shell wide>
      <h1 className="title enter text-[32px] text-fg sm:text-[40px]">Jury guide</h1>
      <p className="lede enter d1 mt-2">No login. Everything below is one tap away.</p>

      <div className="mt-7 space-y-4 sm:space-y-5">
        <Section id="path" title="Three minutes">
          <ol className="-mx-2">
            {PATH.map((step, i) => (
              <li key={step.href} className="group relative flex gap-3.5 rounded-2xl px-2 py-3 transition-colors hover:bg-surface-2">
                <span
                  aria-hidden="true"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet/16 text-[14px] font-bold tabular-nums text-lilac"
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex min-h-7 flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                      href={step.href}
                      className="font-semibold text-fg after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:outline-violet/50"
                    >
                      {step.label}
                    </Link>
                    <Code>{step.href}</Code>
                    {step.beta && <Pill>Beta</Pill>}
                    <ChevronRight size={18} className="ml-auto shrink-0 text-fg-faint transition-colors group-hover:text-lilac" />
                  </p>
                  <p className="mt-0.5 text-fg-soft">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="try" title="Try to break it">
          <ul className="divide-y divide-stroke">
            {TRY.map((t, i) => (
              <li key={i} className="py-3.5 first:pt-0 last:pb-0">
                <p className="font-semibold text-fg">{t.say}</p>
                <p className="mt-1 text-fg-soft">{t.expect}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="real" title="What is real and what is simulated">
          <h3>
            <Pill tone="mint">Real</Pill>
          </h3>
          <ul className="mt-2 divide-y divide-stroke">
            {REAL.map((r) => (
              <li key={r.where} className="py-2.5 sm:flex sm:items-baseline sm:justify-between sm:gap-4">
                <p>{r.what}</p>
                <p className="mt-1 shrink-0 sm:mt-0">
                  <Code>{r.where}</Code>
                </p>
              </li>
            ))}
          </ul>

          <h3 className="mt-6">
            <Pill tone="dark">Simulated, and labelled</Pill>
          </h3>
          <ul className="mt-2 divide-y divide-stroke">
            <li className="py-2.5">Mia and Leo themselves. They are practice partners, not real children.</li>
            <li className="py-2.5">The 28-day demo family on the dashboard.</li>
          </ul>

          <h3 className="mt-6">
            <Pill tone="mist">Done by your browser</Pill>
          </h3>
          <p className="mt-2 py-2.5">
            Speech to text, when you choose to speak. In Chrome the audio goes to Google’s speech service. PlayReps
            receives the text only and does not record or store audio.
          </p>
        </Section>

        <Section id="numbers" title="Numbers we stand behind">
          <ul className="divide-y divide-stroke">
            <li className="pb-4">
              <p className="text-[34px] font-extrabold leading-none tabular-nums tracking-[-0.04em] text-lilac">321</p>
              <p className="mt-2">
                Unit tests. Run <Code>npm test</Code>.
              </p>
            </li>
            <li className="py-4">
              <p className="text-[34px] font-extrabold leading-none tabular-nums tracking-[-0.04em] text-lilac">72 of 80</p>
              <p className="mt-2">
                Casual turns (90%) were coded as expected on the first run of a blind set, before any rule was changed. A
                separate reviewer wrote that set without seeing the rules.
              </p>
              <p className="mt-2 text-fg-soft">
                After generic fixes it is 80 of 80, so the set is no longer blind. An earlier check set of 48 was 40 of 48
                on its first run and is 47 of 48 now. <Code>npm test</Code> prints both current numbers.
              </p>
            </li>
            <li className="pt-5">
              <Rings rings={NORM} />
              <p className="mt-4">
                The clinic norm used, in five minutes: <b className="font-semibold text-fg">10</b> specific praises,{' '}
                <b className="font-semibold text-fg">10</b> reflections, <b className="font-semibold text-fg">10</b>{' '}
                descriptions, and at most <b className="font-semibold text-fg">3</b> questions, commands and corrections.
              </p>
            </li>
          </ul>
        </Section>

        <Section id="not-therapy" title="Not therapy">
          <p>
            PlayReps is skill practice for parents. It gives no diagnosis and makes no promise about any child’s
            behaviour. Families who want a certified therapist can find one at{' '}
            <a
              href="https://www.pcit.org"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-lilac underline decoration-violet/50 decoration-2 underline-offset-2 hover:decoration-lilac"
            >
              pcit.org
            </a>
            .
          </p>
        </Section>
      </div>

      <div className="enter mt-8 sm:max-w-[320px]">
        <Link href="/start" className="btn btn-primary btn-block">
          Start practising
          <ArrowRight size={20} />
        </Link>
      </div>
    </Shell>
  );
}
