import fr from "@/i18n/locales/fr.json";
import { DEFAULT_MASCOT_MOOD, MASCOT_MOOD_ALT_KEYS, MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";
import { getDeepKeys } from "@/__tests__/utils/getDeepKeys";

describe("MascotMoodEnum", () => {
  it("lists the four moods of the art direction", () => {
    expect(Object.values(MascotMoodEnum)).toEqual(["searching", "captured", "confused", "loaded"]);
    expect(DEFAULT_MASCOT_MOOD).toBe(MascotMoodEnum.SEARCHING);
  });

  it("points every mood to an existing alternative text", () => {
    const keys = getDeepKeys(fr);
    Object.values(MascotMoodEnum).forEach((mood) => expect(keys).toContain(MASCOT_MOOD_ALT_KEYS[mood]));
  });
});
