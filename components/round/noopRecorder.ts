import type { RecorderPort } from './types';

/** The default recorder. Recording is opt-in: until the parent turns it on, nothing is captured and nothing is kept. */
export const noopRecorder: RecorderPort = {
  state: 'off',
  start: async () => {},
  stop: async () => null,
};
