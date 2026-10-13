import i18n from "@/i18n/i18n";
import { getAvailabilityDetail } from "@/utils/availability/getAvailabilityDetail";

const NOW = new Date("2026-10-13T12:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const ago = (ms: number) => new Date(NOW.getTime() - ms);

const render = (lastConfirmedAt: Date | null, recentVoterCount: number) => {
  const { key, values } = getAvailabilityDetail(lastConfirmedAt, recentVoterCount, NOW);
  return i18n.t(key, values);
};

describe("getAvailabilityDetail", () => {
  it("AC1 reads Confirmée il y a 2 jours par 5 personnes for a confirmation 2 days old with 5 voters", () => {
    const detail = getAvailabilityDetail(ago(2 * DAY_MS), 5, NOW);

    expect(detail.key).toBe("venue.detail.confirmedDaysAgo");
    expect(detail.values).toEqual({ count: 2, voters: 5 });
    expect(render(ago(2 * DAY_MS), 5)).toBe("Confirmée il y a 2 jours par 5 personnes");
  });

  it("AC1 uses the singular for one day and one voter", () => {
    expect(render(ago(DAY_MS), 1)).toBe("Confirmée il y a 1 jour par 1 personne");
  });

  it("AC1 reads aujourd'hui at 0 day, with the voter count singular or plural", () => {
    const detail = getAvailabilityDetail(ago(2 * HOUR_MS), 3, NOW);

    expect(detail.key).toBe("venue.detail.confirmedToday");
    expect(detail.values).toEqual({ voters: 3 });
    expect(render(ago(2 * HOUR_MS), 3)).toBe("Confirmée aujourd'hui par 3 personnes");
    expect(render(ago(2 * HOUR_MS), 1)).toBe("Confirmée aujourd'hui par 1 personne");
  });

  it("counts whole elapsed days with a floor: 23 h 59 is today, 2 days 23 h is 2 days", () => {
    expect(getAvailabilityDetail(ago(DAY_MS - 60_000), 2, NOW).key).toBe("venue.detail.confirmedToday");
    expect(getAvailabilityDetail(ago(DAY_MS), 2, NOW).values).toEqual({ count: 1, voters: 2 });
    expect(getAvailabilityDetail(ago(2 * DAY_MS + 23 * HOUR_MS), 2, NOW).values).toEqual({ count: 2, voters: 2 });
  });

  it("treats a confirmation in the future of the device clock as today", () => {
    expect(getAvailabilityDetail(new Date(NOW.getTime() + HOUR_MS), 2, NOW).key).toBe("venue.detail.confirmedToday");
  });

  it("AC2 reads Jamais confirmée alone for a never confirmed beer without recent voters", () => {
    const detail = getAvailabilityDetail(null, 0, NOW);

    expect(detail.key).toBe("venue.detail.neverConfirmed");
    expect(render(null, 0)).toBe("Jamais confirmée");
  });

  it("AC2 follows Jamais confirmée with the recent voters when there are some", () => {
    const detail = getAvailabilityDetail(null, 4, NOW);

    expect(detail.key).toBe("venue.detail.neverConfirmedWithVoters");
    expect(detail.values).toEqual({ count: 4 });
    expect(render(null, 4)).toBe("Jamais confirmée · 4 personnes récemment");
    expect(render(null, 1)).toBe("Jamais confirmée · 1 personne récemment");
  });
});
