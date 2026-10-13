import en from "@/i18n/locales/en.json";
import fr from "@/i18n/locales/fr.json";
import {
  VOTE_SENSE_ARIA_LABEL_KEYS,
  VOTE_SENSE_BUTTON_VARIANTS,
  VOTE_SENSE_LABEL_KEYS,
  VoteSenseEnum,
} from "@/types/enums/venue/voteSenseEnum";

const readKey = (locale: unknown, path: string) =>
  path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], locale);

describe("VoteSenseEnum", () => {
  it("carries the contract values verbatim, still first", () => {
    expect(Object.values(VoteSenseEnum)).toEqual(["still", "gone"]);
  });

  it("gives still the secondary variant and gone the tertiary variant", () => {
    expect(VOTE_SENSE_BUTTON_VARIANTS).toEqual({ still: "secondary", gone: "tertiary" });
  });

  it("maps each sense to translated label and aria label keys in every locale", () => {
    Object.values(VoteSenseEnum).forEach((sense) => {
      [fr, en].forEach((locale) => {
        expect(readKey(locale, VOTE_SENSE_LABEL_KEYS[sense])).toEqual(expect.stringMatching(/\S/));
        expect(readKey(locale, VOTE_SENSE_ARIA_LABEL_KEYS[sense])).toContain("{{beer}}");
      });
    });
    expect(readKey(fr, VOTE_SENSE_LABEL_KEYS[VoteSenseEnum.STILL])).toBe("Toujours là");
    expect(readKey(fr, VOTE_SENSE_LABEL_KEYS[VoteSenseEnum.GONE])).toBe("Plus là");
    expect(readKey(fr, VOTE_SENSE_ARIA_LABEL_KEYS[VoteSenseEnum.STILL])).toBe("Toujours là : {{beer}}");
    expect(readKey(fr, VOTE_SENSE_ARIA_LABEL_KEYS[VoteSenseEnum.GONE])).toBe("Plus là : {{beer}}");
  });
});
