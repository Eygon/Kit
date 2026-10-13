import en from "@/i18n/locales/en.json";
import fr from "@/i18n/locales/fr.json";
import { AvailabilityStatusEnum, isAvailabilityStatus, AVAILABILITY_STATUS_LABEL_KEYS } from "@/types/enums/venue/availabilityStatusEnum";

const readKey = (locale: unknown, path: string) =>
  path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], locale);

describe("AvailabilityStatusEnum", () => {
  it("carries the contract values verbatim, in the contract order", async () => {

    expect(Object.values(AvailabilityStatusEnum)).toEqual(["confirmed", "maybeGone", "gone", "unknown"]);
  });

  it("accepts every contract status and rejects anything else", async () => {

    Object.values(AvailabilityStatusEnum).forEach((value) => expect(isAvailabilityStatus(value)).toBe(true));
    ["", "Confirmed", "maybe_gone", "available", 0, null, undefined].forEach((value) =>
      expect(isAvailabilityStatus(value)).toBe(false),
    );
  });

  it("maps every status to a translated label key", async () => {
    const keys = Object.values(AvailabilityStatusEnum).map((value) => AVAILABILITY_STATUS_LABEL_KEYS[value]);

    expect(keys).toEqual([
      "venue.statuses.confirmed",
      "venue.statuses.maybeGone",
      "venue.statuses.gone",
      "venue.statuses.unknown",
    ]);
    keys.forEach((key) => {
      expect(readKey(fr, key)).toEqual(expect.any(String));
      expect(readKey(fr, key)).not.toBe("");
      expect(readKey(en, key)).toEqual(expect.any(String));
      expect(readKey(en, key)).not.toBe("");
    });
  });
});
