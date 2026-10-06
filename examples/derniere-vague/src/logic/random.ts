export type Random = {
  next: () => number;
  range: (min: number, max: number) => number;
  int: (minInclusive: number, maxExclusive: number) => number;
  pick: <T>(items: readonly T[]) => T;
};

export const createRandom = (seed: number): Random => {
  let state = seed >>> 0 || 0x9e3779b9;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const range = (min: number, max: number): number => min + (max - min) * next();
  const int = (minInclusive: number, maxExclusive: number): number => Math.floor(range(minInclusive, maxExclusive));
  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error("pick on empty list");
    return items[int(0, items.length)] as T;
  };
  return { next, range, int, pick };
};
