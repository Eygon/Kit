import {
  Button,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  NumberField,
  Radio,
  RadioGroup,
  Slider,
  Tag,
  TagGroup,
  TextArea,
  TextField,
} from "@heroui/react";
import type { Selection } from "@heroui/react";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { PhotoPicker } from "@/pages/beerDetail/components/elements/photoPicker/photoPicker";
import { VenuePlaceField } from "@/pages/beerDetail/components/elements/venuePlaceField/venuePlaceField";
import { useCreateCheckinMutation } from "@/pages/beerDetail/hooks/useCreateCheckinMutation";
import type { CheckinFormProps } from "@/pages/beerDetail/types/checkinForm";
import type { CheckinFormValues } from "@/pages/beerDetail/types/checkinFormValues";
import {
  CHECKIN_COMMENT_MAX_LENGTH,
  CHECKIN_MAX_AROMAS,
  CHECKIN_MAX_PRICE,
  CHECKIN_MAX_RATING,
  CHECKIN_MIN_PRICE,
  CHECKIN_MIN_RATING,
  CHECKIN_PRICE_CURRENCY,
  CHECKIN_RATING_STEP,
  createEmptyCheckinForm,
  formValuesToNewCheckin,
  isFutureDateTime,
} from "@/pages/beerDetail/utils/checkinFormValues";
import { FILTER_CHIPS_ROW_CLASSES, FILTER_CHIP_CLASSES } from "@/pages/encyclopedia/utils/encyclopediaConstants";
import { BEER_AROMA_LABEL_KEYS, BeerAromaEnum, isBeerAroma } from "@/types/enums/beer/beerAromaEnum";
import { BEER_FORMAT_LABEL_KEYS, BeerFormatEnum } from "@/types/enums/beer/beerFormatEnum";

const PRICE_FORMAT_OPTIONS: Intl.NumberFormatOptions = { style: "currency", currency: CHECKIN_PRICE_CURRENCY };

export const CheckinForm = ({ beerId, onSaved }: CheckinFormProps) => {
  const { t, i18n } = useTranslation();
  const { saveCheckin, isSaving } = useCreateCheckinMutation();
  const [initialValues] = useState(() => createEmptyCheckinForm(new Date()));
  const [values, setValues] = useState<CheckinFormValues>(initialValues);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const isSubmitting = useRef(false);

  const updateValue = <TKey extends keyof CheckinFormValues>(key: TKey, value: CheckinFormValues[TKey]) => {
    setValues((previous) => ({ ...previous, [key]: value }));
  };

  const getDrankAtError = (): string | null => {
    if (values.drankAt === "") return t("pages.beerDetail.checkin.drankAtRequired");
    if (isFutureDateTime(values.drankAt, new Date())) return t("pages.beerDetail.checkin.drankAtFuture");
    return null;
  };
  const getPlaceError = (): string | null => (values.place.trim() === "" ? t("pages.beerDetail.checkin.placeRequired") : null);
  const getFormatError = (): string | null => (values.format === "" ? t("pages.beerDetail.checkin.formatRequired") : null);

  const shownError = (error: string | null): string | null => (hasAttemptedSubmit ? error : null);

  const handleAromasChange = (selection: Selection) => {
    if (selection === "all") return;
    updateValue("aromas", [...selection].filter(isBeerAroma));
  };

  const handleRatingChange = (value: number | number[]) => {
    if (!Array.isArray(value)) updateValue("rating", value);
  };

  const send = async () => {
    let created;
    try {
      created = await saveCheckin(formValuesToNewCheckin(values, beerId));
    } catch {
      return;
    } finally {
      isSubmitting.current = false;
    }
    onSaved(created);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting.current) return;
    setHasAttemptedSubmit(true);
    if (getDrankAtError() !== null || getPlaceError() !== null || getFormatError() !== null) return;
    isSubmitting.current = true;
    void send();
  };

  const numberFormat = new Intl.NumberFormat(i18n.language);
  const ratingText =
    values.rating === 0
      ? t("pages.beerDetail.checkin.noRating")
      : t("pages.beerDetail.checkin.ratingValue", { rating: numberFormat.format(values.rating) });
  const disabledAromas =
    values.aromas.length >= CHECKIN_MAX_AROMAS
      ? Object.values(BeerAromaEnum).filter((aroma) => !values.aromas.includes(aroma))
      : [];

  return (
    <Form validationBehavior="aria" onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-4">
      <TextField
        isRequired
        value={values.drankAt}
        onChange={(drankAt) => updateValue("drankAt", drankAt)}
        validate={() => shownError(getDrankAtError())}
      >
        <Label>{t("pages.beerDetail.checkin.drankAt")}</Label>
        <Input type="datetime-local" max={initialValues.drankAt} className="min-h-11" />
        <FieldError />
      </TextField>
      <VenuePlaceField
        place={values.place}
        venueId={values.venueId}
        errorMessage={shownError(getPlaceError())}
        onChange={(place, venueId) => setValues((previous) => ({ ...previous, place, venueId }))}
      />
      <Slider
        minValue={CHECKIN_MIN_RATING}
        maxValue={CHECKIN_MAX_RATING}
        step={CHECKIN_RATING_STEP}
        value={values.rating}
        onChange={handleRatingChange}
      >
        <Label>{t("pages.beerDetail.checkin.rating")}</Label>
        <Slider.Output>{ratingText}</Slider.Output>
        <Slider.Track>
          <Slider.Fill />
          <Slider.Thumb />
        </Slider.Track>
      </Slider>
      <TagGroup
        selectionMode="multiple"
        selectedKeys={values.aromas}
        onSelectionChange={handleAromasChange}
        disabledKeys={disabledAromas}
      >
        <Label>{t("pages.beerDetail.checkin.aromas")}</Label>
        <TagGroup.List className="flex flex-wrap gap-2 p-1">
          {Object.values(BeerAromaEnum).map((aroma) => (
            <Tag key={aroma} id={aroma} className="min-h-11">
              {t(BEER_AROMA_LABEL_KEYS[aroma])}
            </Tag>
          ))}
        </TagGroup.List>
      </TagGroup>
      <RadioGroup
        isRequired
        value={values.format}
        onChange={(format) => updateValue("format", format)}
        validate={() => shownError(getFormatError())}
        className="gap-1"
      >
        <Label>{t("pages.beerDetail.checkin.format")}</Label>
        <div className={FILTER_CHIPS_ROW_CLASSES}>
          {Object.values(BeerFormatEnum).map((format) => (
            <Radio key={format} value={format} className="mt-0 max-w-full min-w-0">
              <Radio.Content className={FILTER_CHIP_CLASSES}>{t(BEER_FORMAT_LABEL_KEYS[format])}</Radio.Content>
            </Radio>
          ))}
        </div>
        <FieldError />
      </RadioGroup>
      <NumberField
        value={values.price}
        onChange={(price) => updateValue("price", price)}
        minValue={CHECKIN_MIN_PRICE}
        maxValue={CHECKIN_MAX_PRICE}
        formatOptions={PRICE_FORMAT_OPTIONS}
      >
        <Label>{t("pages.beerDetail.checkin.price")}</Label>
        <NumberField.Group className="min-h-11">
          <NumberField.Input />
        </NumberField.Group>
      </NumberField>
      <TextField
        maxLength={CHECKIN_COMMENT_MAX_LENGTH}
        value={values.comment}
        onChange={(comment) => updateValue("comment", comment)}
      >
        <Label>{t("pages.beerDetail.checkin.comment")}</Label>
        <TextArea />
        <Description>{t("pages.beerDetail.checkin.commentCount", { count: values.comment.length })}</Description>
      </TextField>
      <PhotoPicker file={values.photo} onChange={(photo) => updateValue("photo", photo)} />
      <Button type="submit" size="lg" fullWidth isPending={isSaving}>
        {t("pages.beerDetail.checkin.submit")}
      </Button>
    </Form>
  );
};
