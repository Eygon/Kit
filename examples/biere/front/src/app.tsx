import { Toast } from "@heroui/react";
import { Route, Routes } from "react-router";
import { LazyPage } from "@/components/modules/lazyPage/lazyPage";
import { BottomTabBar } from "@/components/widgets/bottomTabBar/bottomTabBar";
import { EncyclopediaPage } from "@/pages/encyclopedia/encyclopedia";
import { HomePage } from "@/pages/home/home";
import { JournalPage } from "@/pages/journal/journal";
import { NotFoundPage } from "@/pages/notFound/notFound";
import { ProfilePage } from "@/pages/profile/profile";
import { RoutePathEnum } from "@/types/enums/routing/routePathEnum";

const loadMapPage = () => import("@/pages/map/map").then((module) => ({ default: module.MapPage }));
const loadBeerDetailPage = () => import("@/pages/beerDetail/beerDetail").then((module) => ({ default: module.BeerDetailPage }));
const loadCollectionPage = () => import("@/pages/collection/collection").then((module) => ({ default: module.CollectionPage }));
const loadUserProfilePage = () => import("@/pages/userProfile/userProfile").then((module) => ({ default: module.UserProfilePage }));
const loadPeoplePage = () => import("@/pages/people/people").then((module) => ({ default: module.PeoplePage }));
const loadVotesPage = () => import("@/pages/votes/votes").then((module) => ({ default: module.VotesPage }));

export const App = () => (
  <div className="flex min-h-dvh flex-col bg-background text-foreground">
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 overflow-x-hidden px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))] md:max-w-3xl md:px-6 lg:max-w-5xl">
      <Routes>
        <Route path={RoutePathEnum.HOME} element={<HomePage />} />
        <Route path={RoutePathEnum.ENCYCLOPEDIA} element={<EncyclopediaPage />} />
        <Route path={RoutePathEnum.MAP} element={<LazyPage loader={loadMapPage} />} />
        <Route path={RoutePathEnum.JOURNAL} element={<JournalPage />} />
        <Route path={RoutePathEnum.PROFILE} element={<ProfilePage />} />
        <Route path={RoutePathEnum.VOTES} element={<LazyPage loader={loadVotesPage} />} />
        <Route path={RoutePathEnum.PEOPLE} element={<LazyPage loader={loadPeoplePage} />} />
        <Route path={RoutePathEnum.USER_PROFILE} element={<LazyPage loader={loadUserProfilePage} />} />
        <Route path={RoutePathEnum.USER_COLLECTION} element={<LazyPage loader={loadCollectionPage} />} />
        <Route path={RoutePathEnum.USER_WISHLIST} element={<LazyPage loader={loadCollectionPage} />} />
        <Route path={RoutePathEnum.BEER_DETAIL} element={<LazyPage loader={loadBeerDetailPage} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </main>
    <BottomTabBar />
    <Toast.Provider placement="top" />
  </div>
);
