export type VenueDiscoverySummaryProps = Readonly<{
  undiscoveredCount: number;
  isUndrunkOnly: boolean;
  onUndrunkOnlyChange: (isUndrunkOnly: boolean) => void;
}>;
