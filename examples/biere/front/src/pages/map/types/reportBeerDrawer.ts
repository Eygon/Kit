export type ReportBeerDrawerProps = Readonly<{
  venueId: number;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}>;
