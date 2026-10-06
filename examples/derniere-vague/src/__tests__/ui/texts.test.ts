export {};

const TEXTS_MODULE = "@/ui/texts";

const BUTTON_KEYS = ["labelFire", "labelAim", "labelReload", "labelKnife", "labelInteract", "labelSwap"];
const MAX_BUTTON_LABEL_CHARS = 8;

const loadTexts = async () => (await import(/* @vite-ignore */ TEXTS_MODULE)).TEXTS;

describe("TEXTS", () => {
  it("names the start and replay actions in French", async () => {
    const TEXTS = await loadTexts();
    expect(TEXTS.play).toBe("Jouer");
    expect(TEXTS.replay).toBe("Rejouer");
  });

  it("formats the round, points and ammo readouts", async () => {
    const TEXTS = await loadTexts();
    expect(TEXTS.round(3)).toBe("Manche 3");
    expect(TEXTS.points(1250)).toContain("1250");
    expect(TEXTS.ammo(8, 32)).toBe("8 / 32");
  });

  it("reports the round reached on the end screen", async () => {
    const TEXTS = await loadTexts();
    expect(TEXTS.gameOver(7)).toContain("7");
    expect(TEXTS.gameOver(7)).not.toBe(TEXTS.gameOver(8));
  });

  it("asks the player to rotate the device", async () => {
    const TEXTS = await loadTexts();
    expect(TEXTS.rotateDevice.length).toBeGreaterThan(0);
    expect(TEXTS.rotateDevice).toMatch(/paysage/i);
  });

  it("labels the six touch buttons with short non empty French words", async () => {
    const TEXTS = await loadTexts();
    expect(Object.keys(TEXTS.buttonLabels).sort()).toEqual([...BUTTON_KEYS].sort());
    for (const key of BUTTON_KEYS) {
      const label = TEXTS.buttonLabels[key] as string;
      expect(label.length).toBeGreaterThan(0);
      expect(label.length).toBeLessThanOrEqual(MAX_BUTTON_LABEL_CHARS);
    }
  });
});
