import { Button, Description, Form, Label, Slider, TextArea, TextField } from "@heroui/react";
import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { StarRating } from "@/pages/beerDetail/components/elements/starRating/starRating";
import type { ReviewFormProps } from "@/pages/beerDetail/types/reviewForm";
import type { ReviewFormValues } from "@/pages/beerDetail/types/reviewFormValues";
import {
  EMPTY_REVIEW_FORM,
  REVIEW_DEFAULT_RATING,
  REVIEW_MAX_RATING,
  REVIEW_MIN_RATING,
  REVIEW_NO_CRITERION,
  REVIEW_RATING_STEP,
  REVIEW_TEXT_MAX_LENGTH,
  formValuesToNewReview,
  reviewToFormValues,
} from "@/pages/beerDetail/utils/reviewFormValues";
import {
  REVIEW_CRITERIA,
  REVIEW_CRITERION_LABEL_KEYS,
  REVIEW_CRITERION_LEVEL_LABEL_KEYS,
} from "@/types/enums/review/reviewCriterionEnum";
import type { ReviewCriterionEnum } from "@/types/enums/review/reviewCriterionEnum";

export const ReviewForm = ({ initialReview, isSaving, onSubmit }: ReviewFormProps) => {
  const { t, i18n } = useTranslation();
  const [values, setValues] = useState<ReviewFormValues>(() =>
    initialReview === null ? EMPTY_REVIEW_FORM : reviewToFormValues(initialReview),
  );
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const isSubmitting = useRef(false);
  const ratingErrorId = useId();

  const updateValue = <TKey extends keyof ReviewFormValues>(key: TKey, value: ReviewFormValues[TKey]) => {
    setValues((previous) => ({ ...previous, [key]: value }));
  };

  const handleRatingChange = (value: number | number[]) => {
    if (!Array.isArray(value)) updateValue("rating", value);
  };

  const handleCriterionChange = (criterion: ReviewCriterionEnum, level: number | number[]) => {
    if (!Array.isArray(level)) updateValue(criterion, level);
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
    if (values.rating === null) return;
    isSubmitting.current = true;
    void send(values.rating);
  };

  const numberFormat = new Intl.NumberFormat(i18n.language);
  const ratingText =
    values.rating === null
      ? t("pages.beerDetail.reviews.form.noRating")
      : t("pages.beerDetail.reviews.form.ratingValue", { rating: numberFormat.format(values.rating) });
  const isRatingMissing = hasAttemptedSubmit && values.rating === null;

  const getCriterionText = (criterion: ReviewCriterionEnum, level: number): string =>
    level === REVIEW_NO_CRITERION
      ? t("pages.beerDetail.reviews.form.notRated")
      : t(REVIEW_CRITERION_LEVEL_LABEL_KEYS[criterion][level - 1]);

  return (
    <Form validationBehavior="aria" onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-4">
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
            <Slider.Thumb />
          </Slider.Track>
        </Slider>
        {isRatingMissing && (
          <p id={ratingErrorId} role="alert" className="text-sm text-danger">
            {t("pages.beerDetail.reviews.form.ratingRequired")}
          </p>
        )}
      </div>
      {REVIEW_CRITERIA.map((criterion) => (
        <Slider
          key={criterion}
          minValue={REVIEW_NO_CRITERION}
          maxValue={REVIEW_MAX_RATING}
          step={1}
          value={values[criterion]}
          onChange={(level) => handleCriterionChange(criterion, level)}
        >
          <Label>{t(REVIEW_CRITERION_LABEL_KEYS[criterion])}</Label>
          <Slider.Output>{getCriterionText(criterion, values[criterion])}</Slider.Output>
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb />
          </Slider.Track>
        </Slider>
      ))}
      <TextField maxLength={REVIEW_TEXT_MAX_LENGTH} value={values.text} onChange={(text) => updateValue("text", text)}>
        <Label>{t("pages.beerDetail.reviews.form.text")}</Label>
        <TextArea />
        <Description>{t("pages.beerDetail.reviews.form.textCount", { count: values.text.length })}</Description>
      </TextField>
      <Button type="submit" size="lg" fullWidth isPending={isSaving}>
        {t("pages.beerDetail.reviews.form.submit")}
      </Button>
    </Form>
  );
};
