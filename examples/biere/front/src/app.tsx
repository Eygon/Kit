import { Toast } from "@heroui/react";
import { Navigate, Route, Routes } from "react-router";
import { BottomTabBar } from "@/components/widgets/bottomTabBar/bottomTabBar";
import { EncyclopediaPage } from "@/pages/encyclopedia/encyclopedia";
import { JournalPage } from "@/pages/journal/journal";
import { MapPage } from "@/pages/map/map";
import { ProfilePage } from "@/pages/profile/profile";
import { RoutePathEnum } from "@/types/enums/routing/routePathEnum";

export const App = () => (
  <div className="flex min-h-dvh flex-col bg-background text-foreground">
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 overflow-x-hidden px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))] md:max-w-3xl md:px-6 lg:max-w-5xl">
      <Routes>
        <Route path={RoutePathEnum.ENCYCLOPEDIA} element={<EncyclopediaPage />} />
        <Route path={RoutePathEnum.MAP} element={<MapPage />} />
        <Route path={RoutePathEnum.JOURNAL} element={<JournalPage />} />
        <Route path={RoutePathEnum.PROFILE} element={<ProfilePage />} />
        <Route path="*" element={<Navigate to={RoutePathEnum.ENCYCLOPEDIA} replace />} />
      </Routes>
    </main>
    <BottomTabBar />
    <Toast.Provider placement="top" />
  </div>
);
