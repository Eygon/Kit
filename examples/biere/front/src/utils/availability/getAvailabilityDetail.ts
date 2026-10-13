const DAY_MS = 24 * 60 * 60 * 1000;

export type AvailabilityDetail = Readonly<{
  key: string;
  values: Readonly<Record<string, number>>;
}>;

export const getAvailabilityDetail = (
  lastConfirmedAt: Date | null,
  recentVoterCount: number,
  now: Date,
): AvailabilityDetail => {
  if (lastConfirmedAt === null) {
    return recentVoterCount > 0
      ? { key: "venue.detail.neverConfirmedWithVoters", values: { count: recentVoterCount } }
      : { key: "venue.detail.neverConfirmed", values: {} };
  }
  const days = Math.max(0, Math.floor((now.getTime() - lastConfirmedAt.getTime()) / DAY_MS));
  return days === 0
    ? { key: "venue.detail.confirmedToday", values: { voters: recentVoterCount } }
    : { key: "venue.detail.confirmedDaysAgo", values: { count: days, voters: recentVoterCount } };
};
