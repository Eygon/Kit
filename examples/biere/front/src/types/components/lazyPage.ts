import type { ComponentType } from "react";

export type LazyPageLoader = () => Promise<{ default: ComponentType }>;

export type LazyPageProps = Readonly<{
  loader: LazyPageLoader;
}>;
