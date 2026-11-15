'use client';

import { Suspense, use } from 'react';
import { Button, Icon, IconButton, PageScreen } from '@/components/kit';
import { SessionReview } from '@/components/screens/progress/SessionReview';
import { useSessions } from '@/hooks/useSessions';
import { ROUTES } from '@/lib/routes';

type Params = Promise<{ session: string }>;

/**
 * Session review (Figma 48:1117, 54:725): one saved session read back from this device. A pushed screen: no tab
 * bar, no rail, its own way back. The id is not known until the request, so the part that reads it waits in Suspense.
 * The screen lives in components/screens/progress/SessionReview.tsx.
 */
export default function SessionPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={null}>
      <Review params={params} />
    </Suspense>
  );
}

function Review({ params }: { params: Params }) {
  const { session: id } = use(params);
  const { sessions, ready } = useSessions();
  if (!ready) return null;

  const index = sessions.findIndex((s) => s.id === id);
  if (index === -1) {
    return (
      <PageScreen
        embedded
        bar={
          <IconButton href={ROUTES.progress} label="Back to Progress">
            <Icon name="back" />
          </IconButton>
        }
        title="Session not found"
      >
        <p className="text-body text-gray">It is not saved on this device.</p>
        <Button href={ROUTES.progress} fullWidth className="mt-auto lg:mx-auto lg:w-[342px]">
          Back to Progress
        </Button>
      </PageScreen>
    );
  }

  return <SessionReview session={sessions[index]} previous={index > 0 ? sessions[index - 1] : undefined} />;
}
