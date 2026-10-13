import { formatAbv } from "@/utils/beer/formatAbv";

const NO_BREAK_SPACE = "\u00a0";

describe("formatAbv", () => {
  it("drops the decimals of a whole degree", () => {
    expect(formatAbv(7, "fr")).toBe(`7${NO_BREAK_SPACE}%`);
    expect(formatAbv(7, "en")).toBe(`7${NO_BREAK_SPACE}%`);
  });

  it("uses the decimal comma in French", () => {
    expect(formatAbv(11.3, "fr")).toBe(`11,3${NO_BREAK_SPACE}%`);
  });

  it("uses the decimal point in English", () => {
    expect(formatAbv(11.3, "en")).toBe(`11.3${NO_BREAK_SPACE}%`);
  });

  it("keeps one decimal at most", () => {
    expect(formatAbv(5.26, "fr")).toBe(`5,3${NO_BREAK_SPACE}%`);
    expect(formatAbv(0, "fr")).toBe(`0${NO_BREAK_SPACE}%`);
  });
});
