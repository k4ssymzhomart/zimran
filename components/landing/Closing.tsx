import { Art, Button, Pattern } from '@/components/kit';
import { ANSWER_HREF } from './anchors';
import { Section } from './Section';

/**
 * The closing band of the landing (Figma 66:1835 on phones, 64:597 from 1024px): one line and the one action,
 * on violet with the bars pattern. The action leads back up to the answer field, as every "Try one answer" does.
 * The two toys are drawn in the desktop frame only. They keep their distance from the line, so they show from
 * 1200px, where both fit beside it.
 */
export function Closing() {
  return (
    <Section tone="violet" className="overflow-clip lg:pt-[128px] lg:pb-[128px]">
      <Pattern kind="bars" className="lg:[--pattern-size:1440px]" />

      <div className="relative flex flex-col items-start gap-[20px] lg:items-center lg:gap-[32px]">
        <h2 className="text-display lg:text-center lg:text-display-xl">Start with one answer.</h2>
        {/* The black pill sits on violet here, so its focus ring is white. */}
        <Button href={ANSWER_HREF} fullWidth className="focus-visible:outline-white! lg:w-[240px]">
          Try one answer
        </Button>
      </div>

      {/* 75rem is 1200px. Both sit where the frame has them, measured from the middle of the band. */}
      <Art name="ball" size={130} className="pointer-events-none absolute top-[240px] left-[calc(50%-570px)] hidden min-[75rem]:block" />
      <Art name="teddy" size={140} className="pointer-events-none absolute top-[80px] left-[calc(50%+430px)] hidden min-[75rem]:block" />
    </Section>
  );
}
