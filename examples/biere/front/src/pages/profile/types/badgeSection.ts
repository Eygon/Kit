import type { Badge } from "@/types/models/badge/badge";

export type BadgeSectionProps = Readonly<{
  badges: Badge[];
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
}>;
