import { BEER_SCALE_NONE } from "@/constants/beerSpecsConstants";
import {
  CORRECTION_REASON_MAX_LENGTH,
  formValuesToNewCorrection,
  getCorrectionFormErrorKeys,
  getEmptyCorrectionForm,
} from "@/pages/beerDetail/utils/correctionFormValues";
import { BeerAromaEnum } from "@/types/enums/beer/beerAromaEnum";
import { BeerCharacteristicEnum } from "@/types/enums/beer/beerCharacteristicEnum";
import { BeerFormatEnum } from "@/types/enums/beer/beerFormatEnum";

const REQUIRED = "beer.characteristics.errors.required";
const RANGE = "beer.characteristics.errors.range";
const SAME_VALUE = "corrections.propose.errors.sameValue";
const REASON_LENGTH = "corrections.propose.errors.reasonLength";

describe("getEmptyCorrectionForm", () => {
  it("starts a number characteristic on NaN with an empty reason", () => {
    const form = getEmptyCorrectionForm(BeerCharacteristicEnum.IBU);

    expect(Number.isNaN(form.value)).toBe(true);
    expect(form.reason).toBe("");
  });

  it.each([BeerCharacteristicEnum.SWEETNESS, BeerCharacteristicEnum.ACIDITY, BeerCharacteristicEnum.BODY])(
    "starts the scale %s on the none step",
    (characteristic) => {
      expect(getEmptyCorrectionForm(characteristic)).toEqual({ value: BEER_SCALE_NONE, reason: "" });
    },
  );

  it.each([BeerCharacteristicEnum.AROMAS, BeerCharacteristicEnum.FORMATS])("starts the list %s empty, never shared between calls", (characteristic) => {
    const first = getEmptyCorrectionForm(characteristic);
    const second = getEmptyCorrectionForm(characteristic);

    expect(first).toEqual({ value: [], reason: "" });
    expect(first.value).not.toBe(second.value);
  });

  it("starts the degree on NaN too", () => {
    expect(Number.isNaN(getEmptyCorrectionForm(BeerCharacteristicEnum.ABV).value)).toBe(true);
  });
});

describe("getCorrectionFormErrorKeys", () => {
  it("asks for a value when the number is empty, whatever the current value", () => {
    expect(getCorrectionFormErrorKeys(BeerCharacteristicEnum.IBU, getEmptyCorrectionForm(BeerCharacteristicEnum.IBU), null)).toEqual({ value: REQUIRED });
    expect(getCorrectionFormErrorKeys(BeerCharacteristicEnum.IBU, getEmptyCorrectionForm(BeerCharacteristicEnum.IBU), 35)).toEqual({ value: REQUIRED });
  });

  it("asks for a level when a scale is on the none step and for a value when a list is empty", () => {
    expect(getCorrectionFormErrorKeys(BeerCharacteristicEnum.BODY, getEmptyCorrectionForm(BeerCharacteristicEnum.BODY), null)).toEqual({ value: REQUIRED });
    expect(getCorrectionFormErrorKeys(BeerCharacteristicEnum.AROMAS, getEmptyCorrectionForm(BeerCharacteristicEnum.AROMAS), null)).toEqual({ value: REQUIRED });
  });

  it("accepts the bounds of the bitterness and refuses one step beyond", () => {
    const check = (value: number) => getCorrectionFormErrorKeys(BeerCharacteristicEnum.IBU, { value, reason: "" }, null);

    expect(check(0)).toEqual({});
    expect(check(120)).toEqual({});
    expect(check(121)).toEqual({ value: RANGE });
    expect(check(-1)).toEqual({ value: RANGE });
  });

  it("accepts the bounds of the colour", () => {
    const check = (value: number) => getCorrectionFormErrorKeys(BeerCharacteristicEnum.EBC, { value, reason: "" }, null);

    expect(check(2)).toEqual({});
    expect(check(80)).toEqual({});
    expect(check(1)).toEqual({ value: RANGE });
    expect(check(81)).toEqual({ value: RANGE });
  });

  it("refuses a value equal to the current number and accepts a different one", () => {
    expect(getCorrectionFormErrorKeys(BeerCharacteristicEnum.IBU, { value: 35, reason: "" }, 35)).toEqual({ value: SAME_VALUE });
    expect(getCorrectionFormErrorKeys(BeerCharacteristicEnum.IBU, { value: 36, reason: "" }, 35)).toEqual({});
    expect(getCorrectionFormErrorKeys(BeerCharacteristicEnum.IBU, { value: 0, reason: "" }, 35)).toEqual({});
  });

  it("never calls a value the same when nothing is known yet, even zero", () => {
    expect(getCorrectionFormErrorKeys(BeerCharacteristicEnum.IBU, { value: 0, reason: "" }, null)).toEqual({});
  });

  it("refuses a list holding the same set as the current one, whatever the order", () => {
    const current = [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY];

    expect(getCorrectionFormErrorKeys(BeerCharacteristicEnum.AROMAS, { value: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY], reason: "" }, current)).toEqual({ value: SAME_VALUE });
    expect(getCorrectionFormErrorKeys(BeerCharacteristicEnum.AROMAS, { value: [BeerAromaEnum.HOPPY, BeerAromaEnum.FRUITY], reason: "" }, current)).toEqual({ value: SAME_VALUE });
  });

  it("accepts a list that is a subset, a superset or another set of the current one", () => {
    const current = [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY];

    expect(getCorrectionFormErrorKeys(BeerCharacteristicEnum.AROMAS, { value: [BeerAromaEnum.FRUITY], reason: "" }, current)).toEqual({});
    expect(getCorrectionFormErrorKeys(BeerCharacteristicEnum.AROMAS, { value: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY, BeerAromaEnum.MALTY], reason: "" }, current)).toEqual({});
    expect(getCorrectionFormErrorKeys(BeerCharacteristicEnum.AROMAS, { value: [BeerAromaEnum.MALTY], reason: "" }, current)).toEqual({});
  });

  it("accepts a list when nothing is known yet", () => {
    expect(getCorrectionFormErrorKeys(BeerCharacteristicEnum.FORMATS, { value: [BeerFormatEnum.CAN], reason: "" }, null)).toEqual({});
  });

  it("refuses a list above its maximum before looking at the current value", () => {
    const tooMany = [BeerFormatEnum.BOTTLE, BeerFormatEnum.CAN, BeerFormatEnum.DRAFT, "x"];

    expect(getCorrectionFormErrorKeys(BeerCharacteristicEnum.FORMATS, { value: tooMany, reason: "" }, tooMany)).toEqual({
      value: "beer.characteristics.errors.listSize",
    });
  });

  it("reports the range error before the same-value one when the current value is itself out of bounds", () => {
    expect(getCorrectionFormErrorKeys(BeerCharacteristicEnum.IBU, { value: 130, reason: "" }, 130)).toEqual({ value: RANGE });
  });

  it("accepts a reason of 200 characters and refuses 201", () => {
    const check = (reason: string) => getCorrectionFormErrorKeys(BeerCharacteristicEnum.IBU, { value: 35, reason }, null);

    expect(CORRECTION_REASON_MAX_LENGTH).toBe(200);
    expect(check("a".repeat(200))).toEqual({});
    expect(check("a".repeat(201))).toEqual({ reason: REASON_LENGTH });
    expect(check("")).toEqual({});
  });

  it("measures the reason after trimming: 200 characters with spaces around pass, 201 with spaces fail", () => {
    const check = (reason: string) => getCorrectionFormErrorKeys(BeerCharacteristicEnum.IBU, { value: 35, reason }, null);

    expect(check(`  ${"a".repeat(200)}  `)).toEqual({});
    expect(check(`  ${"a".repeat(201)}  `)).toEqual({ reason: REASON_LENGTH });
  });

  it("reports the value and the reason errors together", () => {
    expect(getCorrectionFormErrorKeys(BeerCharacteristicEnum.IBU, { value: Number.NaN, reason: "a".repeat(201) }, null)).toEqual({
      value: REQUIRED,
      reason: REASON_LENGTH,
    });
    expect(getCorrectionFormErrorKeys(BeerCharacteristicEnum.IBU, { value: 35, reason: "a".repeat(201) }, 35)).toEqual({
      value: SAME_VALUE,
      reason: REASON_LENGTH,
    });
  });
});

describe("formValuesToNewCorrection", () => {
  it("builds the correction with the characteristic, the value and the trimmed reason", () => {
    expect(formValuesToNewCorrection(BeerCharacteristicEnum.IBU, { value: 35, reason: "  Fiche du brasseur \n" })).toEqual({
      characteristic: BeerCharacteristicEnum.IBU,
      value: 35,
      reason: "Fiche du brasseur",
    });
  });

  it("keeps a list value and turns a blank reason into an empty one", () => {
    expect(formValuesToNewCorrection(BeerCharacteristicEnum.FORMATS, { value: [BeerFormatEnum.CAN], reason: "   " })).toEqual({
      characteristic: BeerCharacteristicEnum.FORMATS,
      value: [BeerFormatEnum.CAN],
      reason: "",
    });
  });
});
