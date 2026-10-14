import { MONTHLY_CHECKINS_MONTHS, PARIS_TIME_ZONE } from "@/modules/profile/profile.constants";

const DAY_KEY_LENGTH = 10;
const MONTH_KEY_LENGTH = 7;
const MONTHS_PER_YEAR = 12;
const PARIS_DAY_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: PARIS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const toParisDayKey = (iso: string): string => PARIS_DAY_FORMAT.format(new Date(iso));

export const toParisMonthKey = (iso: string): string => toParisDayKey(iso).slice(0, MONTH_KEY_LENGTH);

export const addDaysToDayKey = (dayKey: string, days: number): string => {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, DAY_KEY_LENGTH);
};

export const computeDayStreaks = (dayKeys: readonly string[], todayKey: string): { current: number; best: number } => {
  const days = [...new Set(dayKeys)].sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of days) {
    run = previous !== null && addDaysToDayKey(previous, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  const endsRecently = previous === todayKey || previous === addDaysToDayKey(todayKey, -1);
  return { current: endsRecently ? run : 0, best };
};

export const lastTwelveMonthKeys = (now: Date): string[] => {
  const [year, month] = toParisMonthKey(now.toISOString()).split("-").map(Number);
  const currentIndex = year * MONTHS_PER_YEAR + (month - 1);
  return Array.from({ length: MONTHLY_CHECKINS_MONTHS }, (_, position) => {
    const index = currentIndex - (MONTHLY_CHECKINS_MONTHS - 1 - position);
    const monthNumber = (index % MONTHS_PER_YEAR) + 1;
    return `${Math.floor(index / MONTHS_PER_YEAR)}-${String(monthNumber).padStart(2, "0")}`;
  });
};

export const findStreakCompletionDayKey = (dayKeys: readonly string[], length: number): string | null => {
  const days = [...new Set(dayKeys)].sort();
  let run = 0;
  let previous: string | null = null;
  for (const day of days) {
    run = previous !== null && addDaysToDayKey(previous, 1) === day ? run + 1 : 1;
    if (run === length) {
      return day;
    }
    previous = day;
  }
  return null;
};
