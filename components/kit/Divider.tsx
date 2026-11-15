import { cn } from './cn';

export interface DividerProps {
  className?: string;
}

/** The 1px hairline between rows. */
export function Divider({ className }: DividerProps) {
  return <hr className={cn('h-px w-full shrink-0 border-0 bg-line', className)} />;
}
