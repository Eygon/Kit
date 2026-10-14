import type { ReactNode } from "react";
import type { MapBannerMessage } from "@/pages/map/types/mapBannerMessage";

export type MapBannerProps = Readonly<{
  message: MapBannerMessage;
  children?: ReactNode;
}>;
