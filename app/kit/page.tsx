import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Gallery } from './Gallery';

export const metadata: Metadata = { title: 'Fammy kit' };

/**
 * The kit gallery: every kit and shell component on one page, to check by eye against Figma.
 * A development tool only. The production build answers 404 here.
 */
export default function KitPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <Gallery />;
}
