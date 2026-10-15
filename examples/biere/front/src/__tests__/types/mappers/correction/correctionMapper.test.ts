import { BeerCharacteristicEnum } from "@/types/enums/beer/beerCharacteristicEnum";
import { CorrectionStatusEnum } from "@/types/enums/correction/correctionStatusEnum";
import { CorrectionVoteSenseEnum } from "@/types/enums/correction/correctionVoteSenseEnum";
import type { CorrectionDto } from "@/types/dtos/correction/correctionDto";
import { correctionDtoToModel } from "@/types/mappers/correction/correctionMapper";

const DTO: CorrectionDto = {
  id: 5,
  beerId: 7,
  beerName: "Chimay Rouge",
  characteristic: "ibu",
  currentValue: null,
  proposedValue: 35,
  reason: "Fiche du brasseur",
  proposedBy: 2,
  proposedByName: "Bob",
  createdAt: "2026-10-10T10:00:00.000Z",
  closesAt: "2026-10-17T10:00:00.000Z",
  status: "open",
  resolvedAt: null,
  agreeCount: 2,
  disagreeCount: 1,
  myVote: null,
  isMine: false,
};

const withDto = (overrides: Partial<CorrectionDto>): CorrectionDto => ({ ...DTO, ...overrides });

describe("correctionDtoToModel", () => {
  it("maps every field of the model and keeps a null current value", () => {
    expect(correctionDtoToModel(DTO)).toEqual({
      id: 5,
      beerId: 7,
      beerName: "Chimay Rouge",
      characteristic: BeerCharacteristicEnum.IBU,
      currentValue: null,
      proposedValue: 35,
      reason: "Fiche du brasseur",
      proposedBy: 2,
      proposedByName: "Bob",
      createdAt: "2026-10-10T10:00:00.000Z",
      closesAt: "2026-10-17T10:00:00.000Z",
      status: CorrectionStatusEnum.OPEN,
      resolvedAt: null,
      agreeCount: 2,
      disagreeCount: 1,
      myVote: null,
      isMine: false,
    });
  });

  it.each([
    ["agree", CorrectionVoteSenseEnum.AGREE],
    ["disagree", CorrectionVoteSenseEnum.DISAGREE],
  ])("keeps the vote %s of the user", (myVote, expected) => {
    expect(correctionDtoToModel(withDto({ myVote: myVote as CorrectionDto["myVote"] }))?.myVote).toBe(expected);
  });

  it("reads an unknown vote as no vote", () => {
    expect(correctionDtoToModel(withDto({ myVote: "maybe" as CorrectionDto["myVote"] }))?.myVote).toBeNull();
  });

  it("keeps a numeric current value and the isMine flag", () => {
    const model = correctionDtoToModel(withDto({ currentValue: 20, isMine: true }));

    expect(model?.currentValue).toBe(20);
    expect(model?.isMine).toBe(true);
  });

  it("returns null for an unknown characteristic", () => {
    expect(correctionDtoToModel(withDto({ characteristic: "colour" }))).toBeNull();
  });

  it("filters the unknown aromas out of both lists of an aromas correction", () => {
    const model = correctionDtoToModel(
      withDto({ characteristic: "aromas", currentValue: ["fruity", "bogus"], proposedValue: ["hoppy", "nope", "citrus"] }),
    );

    expect(model?.characteristic).toBe(BeerCharacteristicEnum.AROMAS);
    expect(model?.currentValue).toEqual(["fruity"]);
    expect(model?.proposedValue).toEqual(["hoppy", "citrus"]);
  });

  it("filters the unknown formats out of both lists of a formats correction", () => {
    const model = correctionDtoToModel(
      withDto({ characteristic: "formats", currentValue: ["bottle", "keg"], proposedValue: ["can", "fruity"] }),
    );

    expect(model?.currentValue).toEqual(["bottle"]);
    expect(model?.proposedValue).toEqual(["can"]);
  });

  it("does not take an aroma for a format nor the other way round", () => {
    const model = correctionDtoToModel(withDto({ characteristic: "formats", currentValue: null, proposedValue: ["fruity", "draft"] }));

    expect(model?.currentValue).toBeNull();
    expect(model?.proposedValue).toEqual(["draft"]);
  });
});
