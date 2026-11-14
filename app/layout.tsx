import type { Metadata, Viewport } from 'next';
import { Figtree, Fraunces } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', axes: ['SOFT', 'WONK', 'opsz'] });
const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree' });

export const metadata: Metadata = {
  title: 'PlayReps — practise the five-minute play skill clinics teach',
  description:
    'Rehearse with a simulated four-year-old, get every sentence coded live, and see how close you are to the clinic numbers.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#fbf3e4',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${figtree.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <div className="flex-1">{children}</div>
        <footer className="mx-auto w-full max-w-[460px] px-5 pb-8 pt-6 text-center text-xs leading-relaxed text-ink-soft">
          Skill practice for parents. Not therapy and not a diagnosis. Mia is a simulated child for practice; real
          children vary. Worried about your child? Talk to your paediatrician.
        </footer>
      </body>
    </html>
  );
}
