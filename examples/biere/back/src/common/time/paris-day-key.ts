import { PARIS_TIME_ZONE } from "@/common/time/time.constants";

const PARIS_DAY_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: PARIS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const toParisDayKey = (iso: string): string => PARIS_DAY_FORMAT.format(new Date(iso));
