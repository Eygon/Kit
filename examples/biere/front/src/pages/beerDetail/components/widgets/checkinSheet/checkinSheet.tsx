import { Button, Drawer } from "@heroui/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Mascot } from "@/components/elements/mascot/mascot";
import { CheckinForm } from "@/pages/beerDetail/components/elements/checkinForm/checkinForm";
import type { CheckinSheetProps } from "@/pages/beerDetail/types/checkinSheet";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";
import { MascotSizeEnum } from "@/types/enums/mascot/mascotSizeEnum";
import type { CreatedCheckin } from "@/types/models/checkin/createdCheckin";

export const CheckinSheet = ({ beer }: CheckinSheetProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [captured, setCaptured] = useState<CreatedCheckin | null>(null);

  const handleOpenChange = (nextIsOpen: boolean) => {
    if (nextIsOpen) setCaptured(null);
    setIsOpen(nextIsOpen);
  };

  const handleSaved = (created: CreatedCheckin) => {
    if (created.isFirstDiscovery) setCaptured(created);
    else setIsOpen(false);
  };

  return (
    <Drawer isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Button variant="primary" size="lg" className="bg-highlight text-highlight-foreground">
        {t("pages.beerDetail.checkin.open")}
      </Button>
      <Drawer.Backdrop>
        <Drawer.Content placement="bottom" className="h-dvh md:h-auto">
          <Drawer.Dialog>
            <Drawer.Handle />
            <Drawer.Header>
              <Drawer.Heading className="break-words">{t("pages.beerDetail.checkin.title", { name: beer.name })}</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="flex max-h-[calc(100dvh-8rem)] min-w-0 flex-col gap-4 overflow-y-auto p-1 md:max-h-[60dvh]">
              {captured === null ? (
                <CheckinForm beerId={beer.id} onSaved={handleSaved} />
              ) : (
                <div className="flex min-w-0 flex-col items-center gap-4 text-center">
                  <Mascot mood={MascotMoodEnum.CAPTURED} size={MascotSizeEnum.LG} isDecorative />
                  <h3 className="font-display text-xl">{t("pages.beerDetail.checkin.capturedTitle")}</h3>
                  <p className="break-words">{t("pages.beerDetail.checkin.capturedDescription", { name: beer.name })}</p>
                  <Button slot="close" variant="primary" size="lg">
                    {t("common.close")}
                  </Button>
                </div>
              )}
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
};
