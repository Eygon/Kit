import { ComboBox, FieldError, Input, Label, ListBox } from "@heroui/react";
import type { Key } from "@heroui/react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useVenueSearch } from "@/hooks/venue/useVenueSearch";
import type { VenuePlaceFieldProps } from "@/components/modules/checkinSheet/types/venuePlaceField";
import { CHECKIN_PLACE_MAX_LENGTH } from "@/components/modules/checkinSheet/utils/checkinFormValues";
import { EMPTY_VENUE_QUERY } from "@/types/mappers/venue/venueQueryMapper";
import type { Venue } from "@/types/models/venue/venue";

export const VenuePlaceField = ({ place, venueId, errorMessage, onChange }: VenuePlaceFieldProps) => {
  const { t } = useTranslation();
  const { setSearchText, venues, isIdle, isPending, isError } = useVenueSearch(EMPTY_VENUE_QUERY);
  const chosenVenue = useRef<Pick<Venue, "id" | "name"> | null>(venueId === null ? null : { id: venueId, name: place });

  const handleInputChange = (text: string) => {
    setSearchText(text);
    const linkedVenue = chosenVenue.current?.name === text ? chosenVenue.current : null;
    chosenVenue.current = linkedVenue;
    onChange(text, linkedVenue === null ? null : linkedVenue.id);
  };

  const handleSelectionChange = (key: Key | null) => {
    const venueId = Number(key);
    if (!Number.isInteger(venueId) || venueId <= 0) return;
    const venue = venues.find((candidate) => candidate.id === venueId);
    if (venue === undefined) return;
    chosenVenue.current = venue;
    onChange(venue.name, venue.id);
  };

  const getEmptyStateText = (): string | null => {
    if (place.trim() === "") return null;
    if (isIdle || isPending) return t("pages.beerDetail.checkin.venue.searching");
    if (isError) return t("pages.beerDetail.checkin.venue.unavailable");
    return t("pages.beerDetail.checkin.venue.noMatch");
  };

  return (
    <ComboBox
      allowsCustomValue
      allowsEmptyCollection
      isRequired
      fullWidth
      menuTrigger="input"
      items={venues}
      inputValue={place}
      onInputChange={handleInputChange}
      onSelectionChange={handleSelectionChange}
      isInvalid={errorMessage !== null}
    >
      <Label>{t("pages.beerDetail.checkin.place")}</Label>
      <Input maxLength={CHECKIN_PLACE_MAX_LENGTH} className="min-h-11" />
      <ComboBox.Popover>
        <ListBox renderEmptyState={() => <p className="p-3 text-muted">{getEmptyStateText()}</p>}>
          {(venue: Venue) => (
            <ListBox.Item id={venue.id} textValue={venue.name} className="min-h-11 flex-col items-start gap-0">
              <span className="min-w-0 font-bold break-words">{venue.name}</span>
              <span className="min-w-0 text-sm break-words text-muted">{venue.city}</span>
            </ListBox.Item>
          )}
        </ListBox>
      </ComboBox.Popover>
      <FieldError>{errorMessage}</FieldError>
    </ComboBox>
  );
};
