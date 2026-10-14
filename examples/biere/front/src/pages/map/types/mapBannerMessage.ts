export type MapBannerMessage = Readonly<{
  key: string;
  isError: boolean;
}>;

export type MapBannerInput = Readonly<{
  locateErrorKey: string | null;
  tilesUnavailable: boolean;
  hasPointPrompt: boolean;
  isPointPicked: boolean;
}>;
