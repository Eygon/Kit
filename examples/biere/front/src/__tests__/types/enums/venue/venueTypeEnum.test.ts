import en from "@/i18n/locales/en.json";
import fr from "@/i18n/locales/fr.json";
import { VenueTypeEnum, isVenueType, VENUE_TYPE_LABEL_KEYS } from "@/types/enums/venue/venueTypeEnum";

const readKey = (locale: unknown, path: string) =>
  path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], locale);

describe("VenueTypeEnum", () => {
  it("carries the contract values verbatim, in the contract order", async () => {

    expect(Object.values(VenueTypeEnum)).toEqual(["bar", "shop", "brewery"]);
  });

  it("accepts every contract type and rejects anything else", async () => {

    Object.values(VenueTypeEnum).forEach((value) => expect(isVenueType(value)).toBe(true));
    ["", "Bar", "pub", "cave", 1, null, undefined].forEach((value) => expect(isVenueType(value)).toBe(false));
  });

  it("maps every type to a translated label key", async () => {
    const keys = Object.values(VenueTypeEnum).map((value) => VENUE_TYPE_LABEL_KEYS[value]);

    expect(keys).toEqual(["venue.types.bar", "venue.types.shop", "venue.types.brewery"]);
    keys.forEach((key) => {
      expect(readKey(fr, key)).toEqual(expect.any(String));
      expect(readKey(fr, key)).not.toBe("");
      expect(readKey(en, key)).toEqual(expect.any(String));
      expect(readKey(en, key)).not.toBe("");
    });
  });
});
