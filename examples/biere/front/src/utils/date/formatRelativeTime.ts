import i18n from "@/i18n/i18n";
import { formatCheckinDate } from "@/utils/date/formatCheckinDate";

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MAX_RELATIVE_DAYS = 7;

export const formatRelativeTime = (iso: string, language: string, now: Date): string => {
  const elapsed = now.getTime() - new Date(iso).getTime();
  if (elapsed < MINUTE_MS) return i18n.t("common.time.justNow", { lng: language });

  const formatter = new Intl.RelativeTimeFormat(language, { numeric: "auto", style: "short" });
  if (elapsed < HOUR_MS) return formatter.format(-Math.floor(elapsed / MINUTE_MS), "minute");
  if (elapsed < DAY_MS) return formatter.format(-Math.floor(elapsed / HOUR_MS), "hour");
  if (elapsed <= MAX_RELATIVE_DAYS * DAY_MS) return formatter.format(-Math.floor(elapsed / DAY_MS), "day");
  return formatCheckinDate(iso, language);
};
