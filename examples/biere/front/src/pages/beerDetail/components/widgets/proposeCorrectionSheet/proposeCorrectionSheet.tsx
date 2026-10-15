import { Button, Drawer, FieldError, Form, Label, TextArea, TextField } from "@heroui/react";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { CharacteristicField } from "@/components/elements/characteristicField/characteristicField";
import { SubmitButton } from "@/components/elements/submitButton/submitButton";
import { BEER_CHARACTERISTIC_BOUNDS } from "@/constants/beerSpecsConstants";
import { useFocusFirstInvalidField } from "@/hooks/form/useFocusFirstInvalidField";
import { useProposeCorrectionMutation } from "@/pages/beerDetail/hooks/useProposeCorrectionMutation";
import type { CorrectionFormValues } from "@/pages/beerDetail/types/correctionFormValues";
import type { ProposeCorrectionSheetProps } from "@/pages/beerDetail/types/proposeCorrectionSheet";
import {
  CORRECTION_REASON_MAX_LENGTH,
  formValuesToNewCorrection,
  getCorrectionFormErrorKeys,
  getEmptyCorrectionForm,
} from "@/pages/beerDetail/utils/correctionFormValues";
import type { CharacteristicFormValue } from "@/types/components/characteristicFormValue";
import { BEER_CHARACTERISTIC_LABEL_KEYS } from "@/types/enums/beer/beerCharacteristicEnum";
import { formatCharacteristicValue } from "@/utils/beer/formatCharacteristicValue";

export const ProposeCorrectionSheet = ({ beerId, characteristic, currentValue }: ProposeCorrectionSheetProps) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [values, setValues] = useState<CorrectionFormValues>(() => getEmptyCorrectionForm(characteristic));
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const { mutateAsync, isPending } = useProposeCorrectionMutation(beerId);
  const { formRef, focusFirstInvalidField } = useFocusFirstInvalidField();
  const isSubmitting = useRef(false);
  const name = t(BEER_CHARACTERISTIC_LABEL_KEYS[characteristic]);
  const formId = `propose-correction-${characteristic}`;
  const errorKeys = getCorrectionFormErrorKeys(characteristic, values, currentValue);
  const valueError =
    hasAttemptedSubmit && errorKeys.value !== undefined
      ? t(errorKeys.value, BEER_CHARACTERISTIC_BOUNDS[characteristic])
      : null;
  const reasonError = hasAttemptedSubmit && errorKeys.reason !== undefined ? t(errorKeys.reason) : null;

  const resetForm = () => {
    setValues(getEmptyCorrectionForm(characteristic));
    setHasAttemptedSubmit(false);
  };

  const close = () => {
    resetForm();
    setIsOpen(false);
  };

  const send = async () => {
    const isSent = await mutateAsync(formValuesToNewCorrection(characteristic, values)).then(
      () => true,
      () => false,
    );
    isSubmitting.current = false;
    if (!isSent) return;
    close();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting.current) return;
    setHasAttemptedSubmit(true);
    if (Object.keys(errorKeys).length > 0) {
      focusFirstInvalidField();
      return;
    }
    isSubmitting.current = true;
    void send();
  };

  return (
    <>
      <Button size="lg" variant="tertiary" aria-label={t("corrections.propose.openLabel", { name })} onPress={() => setIsOpen(true)}>
        {t("corrections.propose.open")}
      </Button>
      <Drawer isOpen={isOpen} onOpenChange={close}>
        <Drawer.Backdrop>
          <Drawer.Content placement="bottom">
            <Drawer.Dialog>
              <Drawer.Handle />
              <Drawer.Header>
                <Drawer.Heading>{t("corrections.propose.title", { name })}</Drawer.Heading>
              </Drawer.Header>
              <Drawer.Body className="flex max-h-[70dvh] min-w-0 flex-col gap-4 overflow-y-auto p-1">
                <p>
                  {t("corrections.propose.current", {
                    value: formatCharacteristicValue(characteristic, currentValue, t, i18n.language),
                  })}
                </p>
                <Form
                  ref={formRef}
                  id={formId}
                  validationBehavior="aria"
                  onSubmit={handleSubmit}
                  className="flex min-w-0 flex-col gap-4"
                >
                  <CharacteristicField
                    characteristic={characteristic}
                    value={values.value}
                    onChange={(value: CharacteristicFormValue) => setValues((previous) => ({ ...previous, value }))}
                    isRequired
                    errorMessage={valueError}
                  />
                  <TextField
                    name="reason"
                    value={values.reason}
                    onChange={(reason) => setValues((previous) => ({ ...previous, reason }))}
                    validate={() => reasonError}
                  >
                    <Label>{t("corrections.propose.reason")}</Label>
                    <TextArea maxLength={CORRECTION_REASON_MAX_LENGTH} />
                    <span className="text-sm text-muted">{t("corrections.propose.reasonCount", { count: values.reason.length })}</span>
                    <FieldError />
                  </TextField>
                </Form>
              </Drawer.Body>
              <Drawer.Footer>
                <Button slot="close" variant="secondary" size="lg">
                  {t("corrections.propose.close")}
                </Button>
                <SubmitButton label={t("corrections.propose.submit")} isPending={isPending} form={formId} isFullWidth={false} />
              </Drawer.Footer>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </>
  );
};
