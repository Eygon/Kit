import { formatTimeUntil } from "@/utils/date/formatTimeUntil";

const NOW = new Date("2026-10-14T12:00:00.000Z");

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const inFuture = (milliseconds: number) => new Date(NOW.getTime() + milliseconds).toISOString();

const format = (milliseconds: number, language: string) =>
  formatTimeUntil(inFuture(milliseconds), language, NOW).replace(/\s/g, " ");

describe("formatTimeUntil", () => {
  it("counts whole days from 24 hours, dropping the hours left", () => {
    expect(format(3 * DAY + 2 * HOUR, "fr")).toBe("dans 3 jours");
    expect(format(3 * DAY + 2 * HOUR, "en")).toBe("in 3 days");
    expect(format(7 * DAY, "fr")).toBe("dans 7 jours");
  });

  it("counts hours under 24 hours", () => {
    expect(format(5 * HOUR, "fr")).toBe("dans 5 heures");
    expect(format(5 * HOUR, "en")).toBe("in 5 hours");
    expect(format(5 * HOUR + 59 * MINUTE, "fr")).toBe("dans 5 heures");
  });

  it("switches from hours to days exactly at 24 hours", () => {
    expect(format(24 * HOUR - 1, "fr")).toBe("dans 23 heures");
    expect(format(24 * HOUR, "fr")).toBe("dans 1 jour");
    expect(format(DAY + 23 * HOUR, "en")).toBe("in 1 day");
  });

  it("says one hour for less than an hour and for a date already reached", () => {
    expect(format(HOUR, "fr")).toBe("dans 1 heure");
    expect(format(30 * MINUTE, "fr")).toBe("dans 1 heure");
    expect(format(1, "en")).toBe("in 1 hour");
    expect(format(0, "fr")).toBe("dans 1 heure");
    expect(format(-2 * DAY, "en")).toBe("in 1 hour");
  });
});
