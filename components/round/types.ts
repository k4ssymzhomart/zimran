/**
 * The contract of the round screen, frozen on day zero (docs/BUILD-PLAN.md).
 * The first-visit flow, the daily session, practice and live mode all mount the same screen through these props.
 */
import type { InputMode, PartnerId, RoundResult, SavedSentence } from '@/lib/types';

/** Records the parent's voice during a round. The default does nothing; recording is opt-in. */
export interface RecorderPort {
  readonly state: 'off' | 'recording' | 'denied';
  start(): Promise<void>;
  /** Stops and returns the key of the saved audio on this device, or null when nothing was kept. */
  stop(): Promise<string | null>;
  /** Stops and keeps nothing: the round was abandoned. A recorder without it is stopped and its key dropped. */
  cancel?(): Promise<void>;
}

/** Everything a finished round hands back. */
export interface RoundDone {
  result: RoundResult;
  sentences: SavedSentence[];
  input: InputMode;
  /** ISO date-time on this device when the round started. */
  startedAt: string;
  durationSec: number;
  /** What the child says as the round ends; null in live mode, where no simulated child is on screen. */
  farewell?: string | null;
  audioId?: string;
}

export interface RoundStageProps {
  /** `live` is play with the parent's own child: no simulated child on screen. */
  mode: 'practice' | 'live';
  sceneId: string;
  partner: PartnerId | null;
  durationSec: number;
  /** Same seed and same parent moves give the same child. */
  seed?: number;
  title?: string;
  /** The parent's guess from the quiz, shown against the real count at the end of round one. */
  guess?: number | null;
  recorder?: RecorderPort;
  onDone(done: RoundDone): void;
}
