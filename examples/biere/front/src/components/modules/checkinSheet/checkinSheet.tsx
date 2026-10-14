import Pencil from "@gravity-ui/icons/Pencil";
import { Button, Drawer } from "@heroui/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Mascot } from "@/components/elements/mascot/mascot";
import { CheckinForm } from "@/components/modules/checkinSheet/components/checkinForm/checkinForm";
import { useCreateCheckinMutation } from "@/components/modules/checkinSheet/hooks/useCreateCheckinMutation";
import { useCheckinDraft } from "@/components/modules/checkinSheet/hooks/useCheckinDraft";
import { useUpdateCheckinMutation } from "@/components/modules/checkinSheet/hooks/useUpdateCheckinMutation";
import type { CheckinFormValues } from "@/components/modules/checkinSheet/types/checkinFormValues";
import {
  checkinToFormValues,
  createEmptyCheckinForm,
  formValuesToCheckinChanges,
  formValuesToNewCheckin,
} from "@/components/modules/checkinSheet/utils/checkinFormValues";
import type { CheckinSheetProps } from "@/types/components/checkinSheet";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";
import { MascotSizeEnum } from "@/types/enums/mascot/mascotSizeEnum";
import type { CreatedCheckin } from "@/types/models/checkin/createdCheckin";

export const CheckinSheet = (props: CheckinSheetProps) => {
  const { t } = useTranslation();
  const { saveCheckin, isSaving } = useCreateCheckinMutation();
  const { updateCheckin, isUpdating } = useUpdateCheckinMutation();
  const { draft, saveDraft, clearDraft } = useCheckinDraft("checkin" in props ? props.checkin.beerId : props.beer.id);
  const [isOpen, setIsOpen] = useState(false);
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [captured, setCaptured] = useState<CreatedCheckin | null>(null);
  const buildInitialValues = (): CheckinFormValues =>
    "checkin" in props ? checkinToFormValues(props.checkin) : (draft ?? createEmptyCheckinForm(new Date()));
  const [initialValues, setInitialValues] = useState(buildInitialValues);

  const close = () => setIsOpen(false);

  const handleOpenChange = (nextIsOpen: boolean) => {
    if (nextIsOpen) {
      setCaptured(null);
      setIsDraftRestored("checkin" in props ? false : draft !== null);
      setInitialValues(buildInitialValues());
    }
    setIsOpen(nextIsOpen);
  };

  const handleClearDraft = () => {
    clearDraft();
    setInitialValues(createEmptyCheckinForm(new Date()));
    setIsDraftRestored(false);
    setFormKey((previous) => previous + 1);
  };

  const handleCreate = async (values: CheckinFormValues, beerId: number) => {
    const created = await saveCheckin(formValuesToNewCheckin(values, beerId));
    clearDraft();
    if (created.isFirstDiscovery) setCaptured(created);
    else close();
  };

  const handleUpdate = async (values: CheckinFormValues, checkinId: number) => {
    const changes = formValuesToCheckinChanges(values, initialValues);
    if (Object.keys(changes).length > 0) await updateCheckin({ checkinId, changes });
    close();
  };

  if ("checkin" in props) {
    return (
      <Drawer isOpen={isOpen} onOpenChange={handleOpenChange}>
        <Button isIconOnly variant="ghost" size="lg" aria-label={t("checkinSheet.edit.open")} className="shrink-0">
          <Pencil aria-hidden="true" />
        </Button>
        <Drawer.Backdrop>
          <Drawer.Content placement="bottom" className="h-dvh md:h-auto">
            <Drawer.Dialog>
              <Drawer.Handle />
              <Drawer.Header>
                <Drawer.Heading className="break-words">
                  {t("checkinSheet.edit.title", { name: props.checkin.beerName })}
                </Drawer.Heading>
              </Drawer.Header>
              <Drawer.Body className="flex max-h-[calc(100dvh-8rem)] min-w-0 flex-col gap-4 overflow-y-auto p-1 md:max-h-[60dvh]">
                <CheckinForm
                  initialValues={initialValues}
                  isPhotoEditable={false}
                  submitLabel={t("checkinSheet.edit.submit")}
                  isSaving={isUpdating}
                  onSubmit={(values) => handleUpdate(values, props.checkin.id)}
                />
                {props.renderDeleteAction(close)}
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    );
  }

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
              <Drawer.Heading className="break-words">{t("pages.beerDetail.checkin.title", { name: props.beer.name })}</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="flex max-h-[calc(100dvh-8rem)] min-w-0 flex-col gap-4 overflow-y-auto p-1 md:max-h-[60dvh]">
              {captured === null && isDraftRestored && (
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <p aria-live="polite" className="min-w-0 text-muted">
                    {t("checkinSheet.draft.restored")}
                  </p>
                  <Button variant="tertiary" className="min-h-11 shrink-0" onPress={handleClearDraft}>
                    {t("checkinSheet.draft.clear")}
                  </Button>
                </div>
              )}
              {captured === null ? (
                <CheckinForm
                  key={formKey}
                  initialValues={initialValues}
                  isPhotoEditable
                  submitLabel={t("pages.beerDetail.checkin.submit")}
                  isSaving={isSaving}
                  onSubmit={(values) => handleCreate(values, props.beer.id)}
                  onValuesChange={saveDraft}
                />
              ) : (
                <div className="flex min-w-0 flex-col items-center gap-4 text-center">
                  <Mascot mood={MascotMoodEnum.CAPTURED} size={MascotSizeEnum.LG} isDecorative />
                  <h3 className="font-display text-xl">{t("pages.beerDetail.checkin.capturedTitle")}</h3>
                  <p className="break-words">{t("pages.beerDetail.checkin.capturedDescription", { name: props.beer.name })}</p>
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
