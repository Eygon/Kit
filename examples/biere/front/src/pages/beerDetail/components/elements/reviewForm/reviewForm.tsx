import { Description, Form, Label, Slider, TextArea, TextField } from "@heroui/react";
import { useId, useLayoutEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { SubmitButton } from "@/components/elements/submitButton/submitButton";
import { useFocusFirstInvalidField } from "@/hooks/form/useFocusFirstInvalidField";
import { StarRating } from "@/pages/beerDetail/components/elements/starRating/starRating";
import type { ReviewFormProps } from "@/pages/beerDetail/types/reviewForm";
import type { ReviewFormValues } from "@/pages/beerDetail/types/reviewFormValues";
import {
  EMPTY_REVIEW_FORM,
  REVIEW_DEFAULT_RATING,
  REVIEW_MAX_RATING,
  REVIEW_MIN_RATING,
  REVIEW_RATING_STEP,
  REVIEW_TEXT_MAX_LENGTH,
  formValuesToNewReview,
  reviewToFormValues,
} from "@/pages/beerDetail/utils/reviewFormValues";

export const ReviewForm = ({ initialReview, isSaving, onSubmit }: ReviewFormProps) => {
  const { t, i18n } = useTranslation();
  const [values, setValues] = useState<ReviewFormValues>(() =>
    initialReview === null ? EMPTY_REVIEW_FORM : reviewToFormValues(initialReview),
  );
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const isSubmitting = useRef(false);
  const ratingErrorId = useId();
  const ratingInputRef = useRef<HTMLInputElement>(null);
  const { formRef, focusFirstInvalidField } = useFocusFirstInvalidField();

  const updateValue = <TKey extends keyof ReviewFormValues>(key: TKey, value: ReviewFormValues[TKey]) => {
    setValues((previous) => ({ ...previous, [key]: value }));
  };

  const handleRatingChange = (value: number | number[]) => {
    if (!Array.isArray(value)) updateValue("rating", value);
  };

  const send = async (rating: number) => {
    try {
      await onSubmit(formValuesToNewReview({ ...values, rating }));
    } catch {
      return;
    } finally {
      isSubmitting.current = false;
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting.current) return;
    setHasAttemptedSubmit(true);
    if (values.rating === null) {
      focusFirstInvalidField();
      return;
    }
    isSubmitting.current = true;
    void send(values.rating);
  };

  const numberFormat = new Intl.NumberFormat(i18n.language);
  const ratingText =
    values.rating === null
      ? t("pages.beerDetail.reviews.form.noRating")
      : t("pages.beerDetail.reviews.form.ratingValue", { rating: numberFormat.format(values.rating) });
  const isRatingMissing = hasAttemptedSubmit && values.rating === null;

  useLayoutEffect(() => {
    if (isRatingMissing) ratingInputRef.current?.setAttribute("aria-invalid", "true");
    else ratingInputRef.current?.removeAttribute("aria-invalid");
  }, [isRatingMissing]);

  return (
    <Form ref={formRef} validationBehavior="aria" onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-2">
        <StarRating value={values.rating ?? 0} />
        <Slider
          minValue={REVIEW_MIN_RATING}
          maxValue={REVIEW_MAX_RATING}
          step={REVIEW_RATING_STEP}
          value={values.rating ?? REVIEW_DEFAULT_RATING}
          onChange={handleRatingChange}
          aria-describedby={isRatingMissing ? ratingErrorId : undefined}
        >
          <Label>{t("pages.beerDetail.reviews.form.rating")}</Label>
          <Slider.Output>{ratingText}</Slider.Output>
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb inputRef={ratingInputRef} />
          </Slider.Track>
        </Slider>
        {isRatingMissing && (
          <p id={ratingErrorId} role="alert" className="text-sm text-danger">
            {t("pages.beerDetail.reviews.form.ratingRequired")}
          </p>
        )}
      </div>
      <TextField maxLength={REVIEW_TEXT_MAX_LENGTH} value={values.text} onChange={(text) => updateValue("text", text)}>
        <Label>{t("pages.beerDetail.reviews.form.text")}</Label>
        <TextArea />
        <Description>{t("pages.beerDetail.reviews.form.textCount", { count: values.text.length })}</Description>
      </TextField>
      <SubmitButton label={t("pages.beerDetail.reviews.form.submit")} isPending={isSaving} />
    </Form>
  );
};
