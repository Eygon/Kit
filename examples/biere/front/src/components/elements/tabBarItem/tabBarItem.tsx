import { NavLink } from "react-router";
import { getTabBarItemClasses } from "@/components/elements/tabBarItem/utils/getTabBarItemClasses";
import type { TabBarItemProps } from "@/types/components/tabBarItem";

export const TabBarItem = ({ to, label, icon: Icon }: TabBarItemProps) => (
  <li className="min-w-0 flex-1">
    <NavLink to={to} end className={({ isActive }) => getTabBarItemClasses(isActive)}>
      <Icon aria-hidden="true" className="size-6 shrink-0" />
      <span className="max-w-full truncate">{label}</span>
    </NavLink>
  </li>
);
