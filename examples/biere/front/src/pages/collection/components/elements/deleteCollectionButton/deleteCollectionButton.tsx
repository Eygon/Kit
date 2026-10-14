import { AlertDialog, Button } from "@heroui/react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDeleteCollectionMutation } from "@/pages/collection/hooks/useDeleteCollectionMutation";
import type { DeleteCollectionButtonProps } from "@/pages/collection/types/deleteCollectionButton";

export const DeleteCollectionButton = ({ collectionId, onDeleted }: DeleteCollectionButtonProps) => {
  const { t } = useTranslation();
  const { removeCollection, isRemoving } = useDeleteCollectionMutation();
  const [isOpen, setIsOpen] = useState(false);
  const isInFlight = useRef(false);

  const confirmRemoval = async () => {
    if (isInFlight.current) return;
    isInFlight.current = true;
    try {
      await removeCollection(collectionId);
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
        {t("pages.collection.delete")}
      </Button>
      <AlertDialog.Backdrop isKeyboardDismissDisabled={false}>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Heading>{t("pages.collection.deleteTitle")}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <Button size="lg" variant="tertiary" slot="close">
                {t("pages.collection.deleteCancel")}
              </Button>
              <Button size="lg" variant="danger" isPending={isRemoving} onPress={() => void confirmRemoval()}>
                {t("pages.collection.deleteConfirm")}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
};
