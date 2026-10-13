import BookOpen from "@gravity-ui/icons/BookOpen";
import MapPin from "@gravity-ui/icons/MapPin";
import PencilToSquare from "@gravity-ui/icons/PencilToSquare";
import Person from "@gravity-ui/icons/Person";
import type { TabBarEntry } from "@/types/components/tabBarEntry";
import { RoutePathEnum } from "@/types/enums/routing/routePathEnum";

export const TAB_BAR_ENTRIES: readonly TabBarEntry[] = [
  { to: RoutePathEnum.ENCYCLOPEDIA, labelKey: "nav.encyclopedia", icon: BookOpen, activePaths: [RoutePathEnum.BEER_DETAIL] },
  { to: RoutePathEnum.MAP, labelKey: "nav.map", icon: MapPin },
  { to: RoutePathEnum.JOURNAL, labelKey: "nav.journal", icon: PencilToSquare },
  { to: RoutePathEnum.PROFILE, labelKey: "nav.profile", icon: Person },
];
