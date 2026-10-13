const TAB_BAR_ITEM_BASE_CLASSES =
  "flex min-h-14 min-w-11 flex-col items-center justify-center gap-1 rounded-control border-mousse px-0.5 py-1 text-[.6875rem] font-bold tracking-tight no-highlight transition-[background-color,box-shadow] focus-visible:focus-ring";

export const getTabBarItemClasses = (isActive: boolean): string =>
  `${TAB_BAR_ITEM_BASE_CLASSES} ${isActive ? "border-border bg-accent text-accent-foreground shadow-mousse" : "border-transparent text-foreground"}`;
