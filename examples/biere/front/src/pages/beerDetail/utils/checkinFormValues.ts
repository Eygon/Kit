export const CHECKIN_PLACE_MAX_LENGTH = 80;
export const CHECKIN_COMMENT_MAX_LENGTH = 500;
export const CHECKIN_MAX_AROMAS = 5;
export const CHECKIN_MIN_RATING = 0;
export const CHECKIN_MAX_RATING = 5;
export const CHECKIN_RATING_STEP = 0.5;
export const CHECKIN_MIN_PRICE = 0;
export const CHECKIN_MAX_PRICE = 1000;
export const CHECKIN_PRICE_CURRENCY = "EUR";

import type { CheckinFormValues } from "@/pages/beerDetail/types/checkinFormValues";
import type { NewCheckin } from "@/types/models/checkin/newCheckin";

const padTwoDigits = (value: number): string => String(value).padStart(2, "0");

export const createEmptyCheckinForm = (now: Date): CheckinFormValues => ({
  drankAt: `${now.getFullYear()}-${padTwoDigits(now.getMonth() + 1)}-${padTwoDigits(now.getDate())}T${padTwoDigits(now.getHours())}:${padTwoDigits(now.getMinutes())}`,
  place: "",
  rating: 0,
  aromas: [],
  format: "",
  price: Number.NaN,
  comment: "",
});

export const formValuesToNewCheckin = (values: CheckinFormValues, beerId: number): NewCheckin => ({
  beerId,
  drankAt: new Date(values.drankAt).toISOString(),
  place: values.place.trim(),
  format: values.format,
  rating: values.rating === 0 ? null : values.rating,
  aromas: values.aromas,
  price: Number.isNaN(values.price) ? null : values.price,
  comment: values.comment,
});

export const isFutureDateTime = (value: string, now: Date): boolean => new Date(value).getTime() > now.getTime();
