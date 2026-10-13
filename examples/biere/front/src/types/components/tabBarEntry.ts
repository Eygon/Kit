import type { SvgIcon } from "@/types/components/svgIcon";
import type { RoutePathEnum } from "@/types/enums/routing/routePathEnum";

export type TabBarEntry = Readonly<{
  to: RoutePathEnum;
  labelKey: string;
  icon: SvgIcon;
}>;
