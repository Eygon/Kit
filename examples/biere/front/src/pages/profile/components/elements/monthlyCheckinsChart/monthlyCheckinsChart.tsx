import { useTranslation } from "react-i18next";
import type { MonthlyCheckinsChartProps } from "@/pages/profile/types/monthlyCheckinsChart";

const MID_MONTH_DAY = 15;
const PERCENT_FACTOR = 100;

const getMonthDate = (month: string): Date => {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, MID_MONTH_DAY));
};

export const MonthlyCheckinsChart = ({ months }: MonthlyCheckinsChartProps) => {
  const { t, i18n } = useTranslation();
  const shortFormat = new Intl.DateTimeFormat(i18n.language, { month: "short", timeZone: "UTC" });
  const longFormat = new Intl.DateTimeFormat(i18n.language, { month: "long", year: "numeric", timeZone: "UTC" });
  const max = Math.max(0, ...months.map(({ count }) => count));

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm text-muted">{t("pages.profile.stats.monthsTitle")}</h3>
      <ol className="grid h-24 grid-cols-12 items-end gap-1">
        {months.map(({ month, count }) => {
          const date = getMonthDate(month);
          const percent = max === 0 ? 0 : (count / max) * PERCENT_FACTOR;
          return (
            <li
              key={month}
              aria-label={t("pages.profile.stats.monthBar", { month: longFormat.format(date), count })}
              className="flex h-full min-w-0 flex-col items-center justify-end gap-1"
            >
              <div className="flex min-h-0 w-full flex-1 items-end">
                <div data-testid="month-bar" className="w-full rounded-control bg-accent" style={{ height: `${percent}%` }} />
              </div>
              <span className="w-full truncate text-center text-xs">{shortFormat.format(date)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
