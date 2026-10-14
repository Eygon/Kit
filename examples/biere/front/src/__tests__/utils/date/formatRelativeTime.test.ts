import { formatRelativeTime } from "@/utils/date/formatRelativeTime";

const NOW = new Date("2026-10-14T12:00:00.000Z");

const ago = (milliseconds: number) => new Date(NOW.getTime() - milliseconds).toISOString();
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const format = async (iso: string, language: string) => {
  return (formatRelativeTime(iso, language, NOW) as string).replace(/\s/g, " ");
};

describe("formatRelativeTime", () => {
  it("says just now under one minute", async () => {
    expect(await format(ago(59 * SECOND), "fr")).toBe("à l'instant");
    expect(await format(ago(0), "en")).toBe("just now");
  });

  it("says just now for a date slightly in the future", async () => {
    expect(await format(ago(-30 * SECOND), "fr")).toBe("à l'instant");
  });

  it("counts minutes from one minute", async () => {
    expect(await format(ago(MINUTE), "fr")).toBe("il y a 1 min");
    expect(await format(ago(5 * MINUTE + 20 * SECOND), "fr")).toBe("il y a 5 min");
    expect(await format(ago(59 * MINUTE), "en")).toBe("59 min. ago");
  });

  it("counts hours from one hour, in French and in English", async () => {
    expect(await format(ago(2 * HOUR + 10 * MINUTE), "fr")).toBe("il y a 2 h");
    expect(await format(ago(2 * HOUR), "en")).toBe("2 hr. ago");
    expect(await format(ago(23 * HOUR + 59 * MINUTE), "fr")).toBe("il y a 23 h");
  });

  it("counts days from one day up to seven days", async () => {
    expect(await format(ago(DAY), "fr")).toBe("hier");
    expect(await format(ago(3 * DAY), "fr")).toBe("il y a 3 j");
    expect(await format(ago(7 * DAY), "en")).toBe("7 days ago");
  });

  it("falls back to the short date beyond seven days", async () => {
    expect(await format("2026-10-06T11:00:00.000Z", "fr")).toBe("06/10/2026");
    expect(await format("2026-10-06T11:00:00.000Z", "en")).toBe("10/6/26");
  });
});
