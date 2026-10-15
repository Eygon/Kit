export const correctionKeys = {
  all: () => ["corrections"] as const,
  board: () => [...correctionKeys.all(), "board"] as const,
  forBeer: (beerId: number) => [...correctionKeys.all(), "forBeer", beerId] as const,
};
