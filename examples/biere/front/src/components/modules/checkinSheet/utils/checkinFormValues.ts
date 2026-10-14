export const CHECKIN_PLACE_MAX_LENGTH = 80;
export const CHECKIN_COMMENT_MAX_LENGTH = 500;
export const CHECKIN_MAX_AROMAS = 5;
export const CHECKIN_MIN_RATING = 0;
export const CHECKIN_MAX_RATING = 5;
export const CHECKIN_RATING_STEP = 0.5;
export const CHECKIN_MIN_PRICE = 0;
export const CHECKIN_MAX_PRICE = 1000;
export const CHECKIN_PRICE_CURRENCY = "EUR";

import type { CheckinFormValues } from "@/components/modules/checkinSheet/types/checkinFormValues";
import type { Checkin } from "@/types/models/checkin/checkin";
import type { CheckinChanges } from "@/types/models/checkin/checkinChanges";
import type { NewCheckin } from "@/types/models/checkin/newCheckin";

const padTwoDigits = (value: number): string => String(value).padStart(2, "0");

const toDateTimeLocal = (date: Date): string =>
  `${date.getFullYear()}-${padTwoDigits(date.getMonth() + 1)}-${padTwoDigits(date.getDate())}T${padTwoDigits(date.getHours())}:${padTwoDigits(date.getMinutes())}`;

export const createEmptyCheckinForm = (now: Date): CheckinFormValues => ({
  drankAt: toDateTimeLocal(now),
  place: "",
  venueId: null,
  rating: 0,
  aromas: [],
  format: "",
  price: Number.NaN,
  comment: "",
  photo: null,
});

export const formValuesToNewCheckin = (values: CheckinFormValues, beerId: number): NewCheckin => ({
  beerId,
  drankAt: new Date(values.drankAt).toISOString(),
  place: values.place.trim(),
  venueId: values.venueId,
  format: values.format,
  rating: values.rating === 0 ? null : values.rating,
  aromas: values.aromas,
  price: Number.isNaN(values.price) ? null : values.price,
  comment: values.comment,
  photo: values.photo,
});

export const checkinToFormValues = (checkin: Checkin): CheckinFormValues => ({
  drankAt: toDateTimeLocal(new Date(checkin.drankAt)),
  place: checkin.place,
  venueId: checkin.venueId,
  rating: checkin.rating ?? 0,
  aromas: checkin.aromas,
  format: checkin.format ?? "",
  price: checkin.price ?? Number.NaN,
  comment: checkin.comment,
  photo: null,
});

const toSortedKey = (aromas: readonly string[]): string => [...aromas].sort().join(",");

export const formValuesToCheckinChanges = (values: CheckinFormValues, initial: CheckinFormValues): CheckinChanges => {
  const changes: CheckinChanges = {};
  const place = values.place.trim();
  if (values.drankAt !== initial.drankAt) changes.drankAt = new Date(values.drankAt).toISOString();
  if (place !== initial.place.trim() || values.venueId !== initial.venueId) {
    changes.place = place;
    changes.venueId = values.venueId;
  }
  if (values.rating !== initial.rating) changes.rating = values.rating === 0 ? null : values.rating;
  if (toSortedKey(values.aromas) !== toSortedKey(initial.aromas)) changes.aromas = values.aromas;
  if (values.format !== initial.format) changes.format = values.format;
  if (!Object.is(values.price, initial.price)) changes.price = Number.isNaN(values.price) ? null : values.price;
  if (values.comment !== initial.comment) changes.comment = values.comment;
  return changes;
};

export const isFutureDateTime = (value: string, now: Date): boolean => new Date(value).getTime() > now.getTime();
