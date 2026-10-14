import { Button, Drawer } from "@heroui/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DeleteReviewButton } from "@/pages/beerDetail/components/elements/deleteReviewButton/deleteReviewButton";
import { ReviewForm } from "@/pages/beerDetail/components/elements/reviewForm/reviewForm";
import { useSaveReviewMutation } from "@/pages/beerDetail/hooks/useSaveReviewMutation";
import type { ReviewSheetProps } from "@/pages/beerDetail/types/reviewSheet";
import type { NewReview } from "@/types/models/review/newReview";

export const ReviewSheet = ({ beer, mine, isDisabled }: ReviewSheetProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const { saveReview, isSaving } = useSaveReviewMutation();

  const handleSubmit = async (review: NewReview) => {
    await saveReview({ beerId: beer.id, review });
    setIsOpen(false);
  };

  return (
    <Drawer isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button variant="primary" size="lg" isDisabled={isDisabled}>
        {mine === null ? t("pages.beerDetail.reviews.sheet.open") : t("pages.beerDetail.reviews.sheet.edit")}
      </Button>
      <Drawer.Backdrop>
        <Drawer.Content placement="bottom" className="h-dvh md:h-auto">
          <Drawer.Dialog>
            <Drawer.Handle />
            <Drawer.Header>
              <Drawer.Heading className="break-words">
                {t("pages.beerDetail.reviews.sheet.title", { name: beer.name })}
              </Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="flex max-h-[calc(100dvh-10rem)] min-w-0 flex-col gap-4 overflow-y-auto p-1 md:max-h-[60dvh]">
              <ReviewForm initialReview={mine} isSaving={isSaving} onSubmit={handleSubmit} />
            </Drawer.Body>
            <Drawer.Footer>
              {mine !== null && <DeleteReviewButton beerId={beer.id} onDeleted={() => setIsOpen(false)} />}
              <Button slot="close" variant="tertiary" size="lg">
                {t("common.close")}
              </Button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
};
