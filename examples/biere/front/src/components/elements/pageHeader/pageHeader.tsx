import type { PageHeaderProps } from "@/types/components/pageHeader";

export const PageHeader = ({ title, subtitle }: PageHeaderProps) => (
  <header className="flex flex-col gap-1">
    <h1 className="font-display text-3xl leading-tight break-words text-foreground">{title}</h1>
    {subtitle && <p className="text-sm break-words text-muted">{subtitle}</p>}
  </header>
);
