import { Badge } from "@heroui/react";
import { Link, matchPath, useLocation } from "react-router";
import { getTabBarItemClasses } from "@/components/elements/tabBarItem/utils/getTabBarItemClasses";
import type { TabBarItemProps } from "@/types/components/tabBarItem";

export const TabBarItem = ({ to, label, icon: Icon, activePaths = [], badgeCount = 0, badgeLabel }: TabBarItemProps) => {
  const { pathname } = useLocation();
  const isCurrent = [to, ...activePaths].some((path) => matchPath({ path, end: true }, pathname) !== null);

  return (
    <li className="min-w-0 flex-1">
      <Link to={to} aria-current={isCurrent ? "page" : undefined} className={getTabBarItemClasses(isCurrent)}>
        {badgeCount > 0 ? (
          <Badge.Anchor>
            <Icon aria-hidden="true" className="size-6 shrink-0" />
            <Badge aria-hidden="true" color="warning" size="sm" variant="primary">
              {badgeCount}
            </Badge>
          </Badge.Anchor>
        ) : (
          <Icon aria-hidden="true" className="size-6 shrink-0" />
        )}
        <span className="max-w-full truncate">{label}</span>
        {badgeCount > 0 && <span className="sr-only">{`, ${badgeLabel}`}</span>}
      </Link>
    </li>
  );
};
