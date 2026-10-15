import { BeerCharacteristicEnum } from "@/types/enums/beer/beerCharacteristicEnum";
import { getCharacteristicErrorKey } from "@/utils/beer/getCharacteristicErrorKey";

const REQUIRED = "beer.characteristics.errors.required";
const RANGE = "beer.characteristics.errors.range";
const STEP = "beer.characteristics.errors.step";
const LIST_SIZE = "beer.characteristics.errors.listSize";

const { ABV, IBU, EBC, SWEETNESS, ACIDITY, BODY, AROMAS, FORMATS } = BeerCharacteristicEnum;

describe("getCharacteristicErrorKey", () => {
  it("accepts an empty number when optional and asks for it when required", () => {
    expect(getCharacteristicErrorKey(IBU, Number.NaN, false)).toBeUndefined();
    expect(getCharacteristicErrorKey(EBC, Number.NaN, false)).toBeUndefined();
    expect(getCharacteristicErrorKey(IBU, Number.NaN, true)).toBe(REQUIRED);
    expect(getCharacteristicErrorKey(ABV, Number.NaN, true)).toBe(REQUIRED);
  });

  it("accepts IBU 0 and 120, refuses -1 and 121", () => {
    expect(getCharacteristicErrorKey(IBU, 0, false)).toBeUndefined();
    expect(getCharacteristicErrorKey(IBU, 120, false)).toBeUndefined();
    expect(getCharacteristicErrorKey(IBU, 35, false)).toBeUndefined();
    expect(getCharacteristicErrorKey(IBU, -1, false)).toBe(RANGE);
    expect(getCharacteristicErrorKey(IBU, 121, false)).toBe(RANGE);
    expect(getCharacteristicErrorKey(IBU, 130, false)).toBe(RANGE);
  });

  it("accepts EBC 2 and 80, refuses 1 and 81", () => {
    expect(getCharacteristicErrorKey(EBC, 2, false)).toBeUndefined();
    expect(getCharacteristicErrorKey(EBC, 80, false)).toBeUndefined();
    expect(getCharacteristicErrorKey(EBC, 1, false)).toBe(RANGE);
    expect(getCharacteristicErrorKey(EBC, 81, false)).toBe(RANGE);
  });

  it("accepts the degree 0 and 20 with one decimal, refuses 20.1, -0.1 and two decimals", () => {
    expect(getCharacteristicErrorKey(ABV, 0, true)).toBeUndefined();
    expect(getCharacteristicErrorKey(ABV, 20, true)).toBeUndefined();
    expect(getCharacteristicErrorKey(ABV, 7.3, true)).toBeUndefined();
    expect(getCharacteristicErrorKey(ABV, 20.1, true)).toBe(RANGE);
    expect(getCharacteristicErrorKey(ABV, -0.1, true)).toBe(RANGE);
    expect(getCharacteristicErrorKey(ABV, 7.25, true)).toBe(STEP);
  });

  it("only accepts whole IBU and EBC values", () => {
    expect(getCharacteristicErrorKey(IBU, 35.5, false)).toBe(STEP);
    expect(getCharacteristicErrorKey(EBC, 10.5, false)).toBe(STEP);
  });

  it("reports the range before the step", () => {
    expect(getCharacteristicErrorKey(IBU, 130.5, false)).toBe(RANGE);
  });

  it("treats the scale none value as empty: fine when optional, required otherwise", () => {
    [SWEETNESS, ACIDITY, BODY].forEach((characteristic) => {
      expect(getCharacteristicErrorKey(characteristic, 0, false)).toBeUndefined();
      expect(getCharacteristicErrorKey(characteristic, 0, true)).toBe(REQUIRED);
    });
  });

  it("accepts a scale from 1 to 5, refuses 6 and a fraction", () => {
    [SWEETNESS, ACIDITY, BODY].forEach((characteristic) => {
      expect(getCharacteristicErrorKey(characteristic, 1, false)).toBeUndefined();
      expect(getCharacteristicErrorKey(characteristic, 5, false)).toBeUndefined();
      expect(getCharacteristicErrorKey(characteristic, 6, false)).toBe(RANGE);
      expect(getCharacteristicErrorKey(characteristic, 2.5, false)).toBe(STEP);
    });
  });

  it("accepts 0 to 5 aromas when optional, refuses 6", () => {
    const aromas = ["fruity", "citrus", "hoppy", "floral", "spicy", "caramel"];

    expect(getCharacteristicErrorKey(AROMAS, [], false)).toBeUndefined();
    expect(getCharacteristicErrorKey(AROMAS, aromas.slice(0, 1), false)).toBeUndefined();
    expect(getCharacteristicErrorKey(AROMAS, aromas.slice(0, 5), false)).toBeUndefined();
    expect(getCharacteristicErrorKey(AROMAS, aromas, false)).toBe(LIST_SIZE);
  });

  it("accepts 0 to 3 formats when optional, refuses 4", () => {
    expect(getCharacteristicErrorKey(FORMATS, [], false)).toBeUndefined();
    expect(getCharacteristicErrorKey(FORMATS, ["can"], false)).toBeUndefined();
    expect(getCharacteristicErrorKey(FORMATS, ["can", "bottle", "draft"], false)).toBeUndefined();
    expect(getCharacteristicErrorKey(FORMATS, ["can", "bottle", "draft", "other"], false)).toBe(LIST_SIZE);
  });

  it("asks for at least one item of a list when required", () => {
    expect(getCharacteristicErrorKey(AROMAS, [], true)).toBe(REQUIRED);
    expect(getCharacteristicErrorKey(FORMATS, [], true)).toBe(REQUIRED);
    expect(getCharacteristicErrorKey(FORMATS, ["can"], true)).toBeUndefined();
  });

  it("answers a wrong kind of value for the characteristic as a required value", () => {
    expect(getCharacteristicErrorKey(IBU, ["fruity"], false)).toBe(REQUIRED);
    expect(getCharacteristicErrorKey(AROMAS, 3, false)).toBe(REQUIRED);
  });
});
