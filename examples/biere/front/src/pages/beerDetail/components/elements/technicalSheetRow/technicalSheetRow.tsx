import type { TechnicalSheetRowProps } from "@/pages/beerDetail/types/technicalSheetRow";

export const TechnicalSheetRow = ({ label, children }: TechnicalSheetRowProps) => (
  <div className="flex min-w-0 flex-col">
    <dt className="text-sm text-muted">{label}</dt>
    <dd className="flex min-w-0 flex-wrap items-center gap-2 break-words">{children}</dd>
  </div>
);
