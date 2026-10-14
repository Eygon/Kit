import TrashBin from "@gravity-ui/icons/TrashBin";
import { AlertDialog, Button } from "@heroui/react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDeleteCheckinMutation } from "@/pages/journal/hooks/useDeleteCheckinMutation";
import type { DeleteCheckinButtonProps } from "@/pages/journal/types/deleteCheckinButton";

export const DeleteCheckinButton = ({ checkinId, isTextTrigger = false, onDeleted }: DeleteCheckinButtonProps) => {
  const { t } = useTranslation();
  const { removeCheckin, isRemoving } = useDeleteCheckinMutation();
  const [isOpen, setIsOpen] = useState(false);
  const isInFlight = useRef(false);

  const confirmRemoval = async () => {
    if (isInFlight.current) return;
    isInFlight.current = true;
    try {
      await removeCheckin(checkinId);
      onDeleted?.();
    } catch {
      return;
    } finally {
      isInFlight.current = false;
      setIsOpen(false);
    }
  };

  return (
    <AlertDialog isOpen={isOpen} onOpenChange={setIsOpen}>
      {isTextTrigger ? (
        <Button variant="ghost" className="min-h-11">
          {t("pages.journal.delete.wrongBeer")}
        </Button>
      ) : (
        <Button isIconOnly variant="ghost" size="lg" aria-label={t("pages.journal.delete.action")} className="shrink-0">
          <TrashBin aria-hidden="true" />
        </Button>
      )}
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Heading>{t("pages.journal.delete.confirmTitle")}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <Button size="lg" variant="tertiary" slot="close">
                {t("pages.journal.delete.cancel")}
              </Button>
              <Button size="lg" variant="danger" isPending={isRemoving} onPress={() => void confirmRemoval()}>
                {t("pages.journal.delete.confirm")}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
};
