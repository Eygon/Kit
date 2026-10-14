import type { ComponentType, LazyExoticComponent } from "react";

export type LazyPageComponentState = Readonly<{
  LazyComponent: LazyExoticComponent<ComponentType>;
  hasFailed: boolean;
  retry: () => void;
}>;
