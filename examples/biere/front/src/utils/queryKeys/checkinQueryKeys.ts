export const checkinKeys = {
  all: () => ["checkins"] as const,
  list: (beerId: number | null) => [...checkinKeys.all(), "list", beerId] as const,
};
