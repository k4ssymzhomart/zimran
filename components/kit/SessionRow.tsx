import Link from 'next/link';
import { cn, colorMotion, focusRing } from './cn';
import { Tag, type TagTone } from './Tag';

export interface SessionRowProps {
  /** The day of the session: "Mon 9 Nov". */
  title: string;
  /** One gray line: "31 skills, 2 to swap". */
  detail: string;
  /** The session's review. The whole row opens it. */
  href: string;
  /** At most one tag: "Pace met" as a skill tag, "Live" as a quiet one. */
  tag?: { label: string; tone: TagTone };
  /** Give it only when the session has a recording: it adds the play button. */
  onPlay?(): void;
  className?: string;
}

/** One session in the list on Progress. */
export function SessionRow({ title, detail, href, tag, onPlay, className }: SessionRowProps) {
  return (
    <div className={cn('relative flex min-h-[68px] items-center gap-[12px]', className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <div className="flex items-center gap-[8px]">
          {/* The link stretches over the row, so the row is one target and the play button stays a separate one. */}
          <Link
            href={href}
            className="text-body-strong text-ink outline-none after:absolute after:inset-0 after:rounded-[12px] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-violet"
          >
            {title}
          </Link>
          {tag && <Tag tone={tag.tone}>{tag.label}</Tag>}
        </div>
        <p className="text-small text-gray">{detail}</p>
      </div>
      {onPlay && (
        <button
          type="button"
          onClick={onPlay}
          aria-label={`Play the recording of ${title}`}
          className={cn('relative -m-[2px] grid size-[44px] shrink-0 place-items-center rounded-full', focusRing)}
        >
          <span className={cn('grid size-[40px] place-items-center rounded-full bg-lilac text-violet active:bg-lilac-2', colorMotion)}>
            <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
              <path d="M6 4.125v9.75L14.25 9 6 4.125Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      )}
      <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true" className="shrink-0 text-faint">
        <path d="m7.5 5 5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
