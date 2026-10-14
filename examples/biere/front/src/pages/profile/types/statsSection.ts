import type { Stats } from "@/types/models/stats/stats";

export type StatsSectionProps = Readonly<{
  stats: Stats | null;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
}>;
