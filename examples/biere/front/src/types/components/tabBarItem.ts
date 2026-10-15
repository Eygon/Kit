import type { SvgIcon } from "@/types/components/svgIcon";
import type { RoutePathEnum } from "@/types/enums/routing/routePathEnum";

export type TabBarItemProps = Readonly<{
  to: RoutePathEnum;
  label: string;
  icon: SvgIcon;
  activePaths?: readonly RoutePathEnum[];
  badgeCount?: number;
  badgeLabel?: string;
}>;
