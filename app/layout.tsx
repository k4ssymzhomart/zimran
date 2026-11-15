import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ChildProvider } from '@/components/child';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

// Link previews need an absolute origin: the Vercel production domain when deployed, localhost otherwise.
const origin = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: 'PlayReps — practise the five minutes of play clinics teach',
  description:
    'Practise with Mia or Leo, a simulated four-year-old. Every sentence you say is coded as you say it, and three rings fill toward the clinic pace.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // On Android the keyboard shrinks the layout, so the round screen keeps Mia and the input in view together.
  interactiveWidget: 'resizes-content',
  themeColor: '#09081b',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <ChildProvider>
          <div className="flex-1">{children}</div>
        </ChildProvider>
        <footer className="mx-auto w-full max-w-[520px] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8 text-center text-[12px] leading-relaxed text-fg-faint">
          Skill practice for parents. Not therapy and not a diagnosis. Mia and Leo are simulated children; real children vary. Worried
          about your child? Talk to your paediatrician.
        </footer>
      </body>
    </html>
  );
}
