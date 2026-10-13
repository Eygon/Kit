const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;

export const queryTimes = {
  default: { staleTime: 0, gcTime: 5 * MINUTE_MS },
  short: { staleTime: 30 * SECOND_MS, gcTime: 5 * MINUTE_MS },
  long: { staleTime: 15 * MINUTE_MS, gcTime: HOUR_MS },
  infinite: { staleTime: Infinity, gcTime: Infinity },
} as const;
