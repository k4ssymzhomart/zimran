'use client';

import { loadDemoMonth } from '@/client/demoMonth';
import { Button } from '@/components/kit';

/** On the jury guide: four weeks in one tap, so the streak, the week, the trends and day 28 can be seen today. */
export function DemoMonthButton() {
  return (
    <div className="flex flex-col gap-[8px] rounded-[16px] bg-lilac p-[16px]">
      <p className="text-body-strong text-ink">See four weeks in one tap</p>
      <p className="text-label text-pretty text-gray">
        Loads 27 days of a simulated family, every sentence coded by the real rules, marked as demo on every screen.
        Today becomes day 28. Your own sessions stay, and Remove takes the demo off.
      </p>
      <Button variant="violet" onClick={loadDemoMonth}>
        Load a demo month
      </Button>
    </div>
  );
}
