import type { MonthlyCount } from "@/types/models/stats/monthlyCount";

export type MonthlyCheckinsChartProps = Readonly<{
  months: MonthlyCount[];
}>;
