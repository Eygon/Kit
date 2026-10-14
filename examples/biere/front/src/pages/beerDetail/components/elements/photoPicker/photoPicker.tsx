import { Button, Input } from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import type { PhotoPickerProps } from "@/pages/beerDetail/types/photoPicker";
import { PHOTO_ACCEPTED_TYPES, PHOTO_MAX_SIZE_BYTES } from "@/pages/beerDetail/utils/beerDetailConstants";

const ACCEPT_ATTRIBUTE = PHOTO_ACCEPTED_TYPES.join(",");

export const PhotoPicker = ({ file, onChange }: PhotoPickerProps) => {
  const { t } = useTranslation();
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file === null) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (chosen === undefined) return;
    if (chosen.size > PHOTO_MAX_SIZE_BYTES) {
      setErrorKey("pages.beerDetail.checkin.photo.tooLarge");
      onChange(null);
      return;
    }
    if (!PHOTO_ACCEPTED_TYPES.includes(chosen.type)) {
      setErrorKey("pages.beerDetail.checkin.photo.badType");
      onChange(null);
      return;
    }
    setErrorKey(null);
    onChange(chosen);
  };

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="tertiary" size="lg" onPress={() => cameraInput.current?.click()}>
          {t("pages.beerDetail.checkin.photo.take")}
        </Button>
        <Button type="button" variant="tertiary" size="lg" onPress={() => galleryInput.current?.click()}>
          {t("pages.beerDetail.checkin.photo.pick")}
        </Button>
      </div>
      <Input
        ref={cameraInput}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        capture="environment"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleChange}
      />
      <Input
        ref={galleryInput}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleChange}
      />
      {errorKey !== null && (
        <p role="alert" className="text-danger">
          {t(errorKey)}
        </p>
      )}
      {previewUrl !== null && (
        <div className="flex min-w-0 flex-col items-start gap-2">
          <img
            src={previewUrl}
            alt={t("pages.beerDetail.checkin.photo.preview")}
            className="max-h-60 max-w-full rounded-mousse border-mousse"
          />
          <Button type="button" variant="ghost" size="lg" onPress={() => onChange(null)}>
            {t("pages.beerDetail.checkin.photo.remove")}
          </Button>
        </div>
      )}
    </div>
  );
};
