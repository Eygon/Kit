export type VenuePlaceFieldProps = Readonly<{
  place: string;
  venueId: number | null;
  errorMessage: string | null;
  onChange: (place: string, venueId: number | null) => void;
}>;
