export {};

const STATS_MODULE = "@/logic/game/runStats";
const ZOMBIE_ID = 3;
const GAIN_POINTS = 60;
const SPEND_POINTS = -750;

const load = async () => {
  const statsModule = await import(/* @vite-ignore */ STATS_MODULE);
  return { createRunStats: statsModule.createRunStats, recordRunEvent: statsModule.recordRunEvent, recordPointsGain: statsModule.recordPointsGain };
};

describe("runStats", () => {
  it("starts with every counter at zero", async () => {
    const { createRunStats } = await load();
    expect(createRunStats()).toEqual({ kills: 0, headshots: 0, pointsEarned: 0 });
  });

  it("counts a body kill as a kill and not as a headshot", async () => {
    const { createRunStats, recordRunEvent } = await load();
    const stats = createRunStats();
    recordRunEvent(stats, { kind: "zombieKilled", id: ZOMBIE_ID, headshot: false });
    expect(stats).toEqual({ kills: 1, headshots: 0, pointsEarned: 0 });
  });

  it("counts a head kill as a kill and a headshot", async () => {
    const { createRunStats, recordRunEvent } = await load();
    const stats = createRunStats();
    recordRunEvent(stats, { kind: "zombieKilled", id: ZOMBIE_ID, headshot: true });
    recordRunEvent(stats, { kind: "zombieKilled", id: ZOMBIE_ID + 1, headshot: false });
    expect(stats).toEqual({ kills: 2, headshots: 1, pointsEarned: 0 });
  });

  it("ignores events that are not kills", async () => {
    const { createRunStats, recordRunEvent } = await load();
    const stats = createRunStats();
    recordRunEvent(stats, { kind: "zombieHit", id: ZOMBIE_ID, damage: 25, head: true, knife: false });
    recordRunEvent(stats, { kind: "shotFired" });
    expect(stats).toEqual({ kills: 0, headshots: 0, pointsEarned: 0 });
  });

  it("adds positive point gains", async () => {
    const { createRunStats, recordPointsGain } = await load();
    const stats = createRunStats();
    recordPointsGain(stats, GAIN_POINTS);
    recordPointsGain(stats, GAIN_POINTS);
    expect(stats.pointsEarned).toBe(GAIN_POINTS * 2);
  });

  it("ignores zero and negative deltas so spending is never counted", async () => {
    const { createRunStats, recordPointsGain } = await load();
    const stats = createRunStats();
    recordPointsGain(stats, GAIN_POINTS);
    recordPointsGain(stats, SPEND_POINTS);
    recordPointsGain(stats, 0);
    expect(stats.pointsEarned).toBe(GAIN_POINTS);
  });
});
