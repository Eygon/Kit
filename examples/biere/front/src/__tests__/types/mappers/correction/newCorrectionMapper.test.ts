import { BeerAromaEnum } from "@/types/enums/beer/beerAromaEnum";
import { BeerCharacteristicEnum } from "@/types/enums/beer/beerCharacteristicEnum";
import { newCorrectionToDto } from "@/types/mappers/correction/newCorrectionMapper";

describe("newCorrectionToDto", () => {
  it("writes the characteristic, the number and the reason, and nothing else", () => {
    expect(
      newCorrectionToDto({ characteristic: BeerCharacteristicEnum.IBU, value: 35, reason: "Fiche du brasseur" }),
    ).toEqual({ characteristic: "ibu", value: 35, reason: "Fiche du brasseur" });
  });

  it("keeps a list value as the same list of strings", () => {
    const dto = newCorrectionToDto({
      characteristic: BeerCharacteristicEnum.AROMAS,
      value: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY],
      reason: "",
    });

    expect(dto).toEqual({ characteristic: "aromas", value: ["fruity", "hoppy"], reason: "" });
    expect(Object.keys(dto)).toEqual(["characteristic", "value", "reason"]);
  });

  it("keeps a zero value, which is a real number and not an absent one", () => {
    expect(newCorrectionToDto({ characteristic: BeerCharacteristicEnum.ABV, value: 0, reason: "r" })).toEqual({
      characteristic: "abv",
      value: 0,
      reason: "r",
    });
  });
});
