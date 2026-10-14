import Picture from "@gravity-ui/icons/Picture";
import { Button, Modal } from "@heroui/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CheckinPhotoProps } from "@/types/components/checkinPhoto";
import { PHOTO_BY_ID } from "@/utils/apiURL/apiURL";

export const CheckinPhoto = ({ photoId, alt }: CheckinPhotoProps) => {
  const { t } = useTranslation();
  const [hasLoadFailed, setHasLoadFailed] = useState(false);

  if (hasLoadFailed)
    return (
      <span className="flex size-16 shrink-0 items-center justify-center rounded-control border-mousse bg-surface text-muted">
        <Picture aria-hidden="true" />
      </span>
    );

  return (
    <Modal>
      <Button
        isIconOnly
        variant="ghost"
        aria-label={t("common.photo.open")}
        className="size-16 shrink-0 overflow-hidden p-0"
      >
        <img
          src={PHOTO_BY_ID(photoId)}
          alt={alt}
          onError={() => setHasLoadFailed(true)}
          className="aspect-square size-full object-cover"
        />
      </Button>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{alt}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <img src={PHOTO_BY_ID(photoId)} alt={alt} className="max-h-[60dvh] max-w-full object-contain" />
            </Modal.Body>
            <Modal.Footer>
              <Button size="lg" slot="close">
                {t("common.close")}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
