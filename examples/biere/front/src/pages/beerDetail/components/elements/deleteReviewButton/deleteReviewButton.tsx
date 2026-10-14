import { AlertDialog, Button } from "@heroui/react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDeleteReviewMutation } from "@/pages/beerDetail/hooks/useDeleteReviewMutation";
import type { DeleteReviewButtonProps } from "@/pages/beerDetail/types/deleteReviewButton";

export const DeleteReviewButton = ({ beerId, onDeleted }: DeleteReviewButtonProps) => {
  const { t } = useTranslation();
  const { removeReview, isRemoving } = useDeleteReviewMutation();
  const [isOpen, setIsOpen] = useState(false);
  const isInFlight = useRef(false);

  const confirmRemoval = async () => {
    if (isInFlight.current) return;
    isInFlight.current = true;
    try {
      await removeReview(beerId);
      onDeleted();
    } catch {
      return;
    } finally {
      isInFlight.current = false;
      setIsOpen(false);
    }
  };

  return (
    <AlertDialog isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button variant="danger-soft" size="lg" className="shrink-0">
        {t("pages.beerDetail.reviews.delete.action")}
      </Button>
      <AlertDialog.Backdrop isKeyboardDismissDisabled={false}>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Heading>{t("pages.beerDetail.reviews.delete.confirmTitle")}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <Button size="lg" variant="tertiary" slot="close">
                {t("pages.beerDetail.reviews.delete.cancel")}
              </Button>
              <Button size="lg" variant="danger" isPending={isRemoving} onPress={() => void confirmRemoval()}>
                {t("pages.beerDetail.reviews.delete.confirm")}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
};
