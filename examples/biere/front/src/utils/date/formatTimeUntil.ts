const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const formatTimeUntil = (iso: string, language: string, now: Date): string => {
  const remaining = new Date(iso).getTime() - now.getTime();
  const formatter = new Intl.RelativeTimeFormat(language, { numeric: "always", style: "long" });
  if (remaining >= DAY_MS) return formatter.format(Math.floor(remaining / DAY_MS), "day");
  return formatter.format(Math.max(1, Math.floor(remaining / HOUR_MS)), "hour");
};
