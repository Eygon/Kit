import { useTranslation } from "react-i18next";
import { TabBarItem } from "@/components/elements/tabBarItem/tabBarItem";
import { TAB_BAR_ENTRIES } from "@/constants/tabBarConstants";

export const BottomTabBar = () => {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t("nav.label")}
      className="fixed inset-x-0 bottom-0 z-40 border-t-mousse bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-xl items-stretch gap-1.5 px-2 pt-2 pb-3">
        {TAB_BAR_ENTRIES.map((entry) => (
          <TabBarItem
            key={entry.to}
            to={entry.to}
            label={t(entry.labelKey)}
            icon={entry.icon}
            activePaths={entry.activePaths}
          />
        ))}
      </ul>
    </nav>
  );
};
