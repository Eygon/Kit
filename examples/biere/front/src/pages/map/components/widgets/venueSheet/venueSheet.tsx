import { Button, Chip, Drawer } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { VenueBeerList } from "@/pages/map/components/widgets/venueBeerList/venueBeerList";
import type { VenueSheetProps } from "@/pages/map/types/venueSheet";
import { VENUE_TYPE_LABEL_KEYS } from "@/types/enums/venue/venueTypeEnum";

export const VenueSheet = ({ venue, onClose }: VenueSheetProps) => {
  const { t } = useTranslation();

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  return (
    <Drawer isOpen={venue !== null} onOpenChange={handleOpenChange}>
      <Drawer.Backdrop>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog>
            {venue !== null && (
              <>
                <Drawer.Handle />
                <Drawer.Header>
                  <Drawer.Heading className="min-w-0 break-words">{venue.name}</Drawer.Heading>
                </Drawer.Header>
                <Drawer.Body className="flex max-h-[70dvh] min-w-0 flex-col gap-3 overflow-y-auto p-1">
                  {venue.type !== null && (
                    <div className="flex">
                      <Chip size="sm">{t(VENUE_TYPE_LABEL_KEYS[venue.type])}</Chip>
                    </div>
                  )}
                  {(venue.address !== "" || venue.city !== "") && (
                    <dl className="flex min-w-0 flex-col gap-2">
                      {venue.address !== "" && (
                        <div className="flex min-w-0 flex-col">
                          <dt className="text-sm text-muted">{t("pages.map.venue.address")}</dt>
                          <dd className="min-w-0 break-words text-foreground">{venue.address}</dd>
                        </div>
                      )}
                      {venue.city !== "" && (
                        <div className="flex min-w-0 flex-col">
                          <dt className="text-sm text-muted">{t("pages.map.venue.city")}</dt>
                          <dd className="min-w-0 break-words text-foreground">{venue.city}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                  {venue.description !== "" && <p className="min-w-0 break-words text-foreground">{venue.description}</p>}
                  <section className="flex min-w-0 flex-col gap-2">
                    <h3 className="font-bold text-foreground">{t("pages.map.venueBeers.title")}</h3>
                    <VenueBeerList venueId={venue.id} />
                  </section>
                </Drawer.Body>
                <Drawer.Footer>
                  <Button slot="close" variant="secondary" size="lg">
                    {t("pages.map.venue.close")}
                  </Button>
                </Drawer.Footer>
              </>
            )}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
};
