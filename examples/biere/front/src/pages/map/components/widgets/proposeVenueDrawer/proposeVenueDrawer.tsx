import { Button, Drawer, FieldError, Form, Input, Label, Radio, RadioGroup, TextArea, TextField } from "@heroui/react";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { HttpError } from "@/api/httpError";
import { useCreateVenueMutation } from "@/pages/map/hooks/useCreateVenueMutation";
import type { ProposeVenueDrawerProps } from "@/pages/map/types/proposeVenueDrawer";
import type { VenueFormValues } from "@/pages/map/types/venueFormValues";
import { FILTER_CHIPS_ROW_CLASSES, FILTER_CHIP_CLASSES } from "@/pages/map/utils/mapConstants";
import {
  EMPTY_VENUE_FORM,
  POINT_COORDINATE_DIGITS,
  PROPOSE_VENUE_FORM_ID,
  VENUE_ADDRESS_MAX_LENGTH,
  VENUE_CITY_MAX_LENGTH,
  VENUE_DESCRIPTION_MAX_LENGTH,
  VENUE_NAME_MAX_LENGTH,
  formValuesToNewVenue,
  getVenueFormErrorKeys,
} from "@/pages/map/utils/venueFormValues";
import { HttpStatusCodeEnum } from "@/types/enums/http/httpStatusCodeEnum";
import { VENUE_TYPE_LABEL_KEYS, VenueTypeEnum, isVenueType } from "@/types/enums/venue/venueTypeEnum";

export const ProposeVenueDrawer = ({ position, isOpen, onOpenChange, onCreated }: ProposeVenueDrawerProps) => {
  const { t } = useTranslation();
  const [values, setValues] = useState<VenueFormValues>(EMPTY_VENUE_FORM);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const { mutateAsync, isPending } = useCreateVenueMutation();
  const isSubmitting = useRef(false);
  const errorKeys = getVenueFormErrorKeys(values);

  const updateValue = <TKey extends keyof VenueFormValues>(key: TKey, value: VenueFormValues[TKey]) => {
    setValues((previous) => ({ ...previous, [key]: value }));
    setServerErrors({});
  };

  const shownError = (errorKey: string | undefined): string | null =>
    hasAttemptedSubmit && errorKey !== undefined ? t(errorKey) : null;

  const resetForm = () => {
    setValues(EMPTY_VENUE_FORM);
    setServerErrors({});
    setHasAttemptedSubmit(false);
  };

  const handleOpenChange = (nextIsOpen: boolean) => {
    if (!nextIsOpen) resetForm();
    onOpenChange(nextIsOpen);
  };

  const handleTypeChange = (type: string) => {
    if (isVenueType(type)) updateValue("type", type);
  };

  const send = async (point: NonNullable<ProposeVenueDrawerProps["position"]>) => {
    try {
      await mutateAsync(formValuesToNewVenue(values, point));
    } catch (error) {
      if (error instanceof HttpError && error.status === HttpStatusCodeEnum.CONFLICT) {
        setServerErrors({ name: t("pages.map.propose.nameTaken") });
      }
      return;
    } finally {
      isSubmitting.current = false;
    }
    resetForm();
    onOpenChange(false);
    onCreated();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting.current || position === null) return;
    setHasAttemptedSubmit(true);
    if (Object.keys(errorKeys).length > 0) return;
    isSubmitting.current = true;
    void send(position);
  };

  return (
    <Drawer isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Drawer.Backdrop>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog>
            <Drawer.Handle />
            <Drawer.Header>
              <Drawer.Heading>{t("pages.map.propose.title")}</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="flex max-h-[70dvh] min-w-0 flex-col gap-4 overflow-y-auto p-1">
              {position !== null && (
                <p className="text-sm text-muted">
                  {t("pages.map.propose.point", {
                    latitude: position.latitude.toFixed(POINT_COORDINATE_DIGITS),
                    longitude: position.longitude.toFixed(POINT_COORDINATE_DIGITS),
                  })}
                </p>
              )}
              <Form
                id={PROPOSE_VENUE_FORM_ID}
                validationBehavior="aria"
                validationErrors={serverErrors}
                onSubmit={handleSubmit}
                className="flex min-w-0 flex-col gap-4"
              >
                <TextField
                  isRequired
                  name="name"
                  maxLength={VENUE_NAME_MAX_LENGTH}
                  value={values.name}
                  onChange={(name) => updateValue("name", name)}
                  validate={() => shownError(errorKeys.name)}
                >
                  <Label>{t("pages.map.propose.name")}</Label>
                  <Input className="min-h-11" />
                  <FieldError />
                </TextField>
                <RadioGroup name="type" value={values.type} onChange={handleTypeChange} className="gap-1">
                  <Label>{t("pages.map.propose.type")}</Label>
                  <div className={FILTER_CHIPS_ROW_CLASSES}>
                    {Object.values(VenueTypeEnum).map((type) => (
                      <Radio key={type} value={type} className="mt-0 max-w-full min-w-0">
                        <Radio.Content className={FILTER_CHIP_CLASSES}>{t(VENUE_TYPE_LABEL_KEYS[type])}</Radio.Content>
                      </Radio>
                    ))}
                  </div>
                </RadioGroup>
                <TextField
                  isRequired
                  name="address"
                  maxLength={VENUE_ADDRESS_MAX_LENGTH}
                  value={values.address}
                  onChange={(address) => updateValue("address", address)}
                  validate={() => shownError(errorKeys.address)}
                >
                  <Label>{t("pages.map.propose.address")}</Label>
                  <Input className="min-h-11" />
                  <FieldError />
                </TextField>
                <TextField
                  name="city"
                  maxLength={VENUE_CITY_MAX_LENGTH}
                  value={values.city}
                  onChange={(city) => updateValue("city", city)}
                >
                  <Label>{t("pages.map.propose.city")}</Label>
                  <Input className="min-h-11" />
                </TextField>
                <TextField
                  name="description"
                  maxLength={VENUE_DESCRIPTION_MAX_LENGTH}
                  value={values.description}
                  onChange={(description) => updateValue("description", description)}
                >
                  <Label>{t("pages.map.propose.description")}</Label>
                  <TextArea />
                </TextField>
              </Form>
            </Drawer.Body>
            <Drawer.Footer>
              <Button slot="close" variant="secondary" size="lg">
                {t("pages.map.propose.close")}
              </Button>
              <Button type="submit" form={PROPOSE_VENUE_FORM_ID} variant="primary" size="lg" isPending={isPending}>
                {t("pages.map.propose.submit")}
              </Button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
};
