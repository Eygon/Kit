import { describe, expect, it } from "vitest";
import { CorrectionVoteSenseEnum } from "@/modules/beers/enums/correction-vote-sense.enum";
import { CORRECTION_VOTE_DURATION_MS } from "@/modules/beers/beers.constants";
import { BeerAromaEnum } from "@/modules/beers/enums/beer-aroma.enum";
import { BeerCharacteristicEnum, isBeerCharacteristic } from "@/modules/beers/enums/beer-characteristic.enum";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";
import { CorrectionStatusEnum } from "@/modules/beers/enums/correction-status.enum";
import { BeerSourceEnum } from "@/modules/beers/enums/beer-source.enum";
import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import {
  readCharacteristicValue,
  toCorrectionBoardDto,
  toCorrectionDto,
  toBeerCharacteristicChange,
  toCorrectionRecordDto,
  toNewCorrection,
  toNewCorrectionVote,
} from "@/modules/beers/mappers/correction.mapper";

const NOW = new Date("2026-06-01T08:00:00.000Z");
const CLOSES_AT = new Date(NOW.getTime() + CORRECTION_VOTE_DURATION_MS);

const BEER: BeerDto = {
  id: 4,
  name: "Orval",
  breweryName: "Brasserie d'Orval",
  country: "BE",
  styleId: 2,
  styleName: "Pale ale trappiste",
  family: BeerFamilyEnum.TRAPPIST,
  abv: 6.2,
  ibu: 35,
  ebc: null,
  sweetness: 2,
  acidity: null,
  body: 5,
  aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY],
  formats: [],
  description: "Trappiste.",
  bitternessLevel: 3,
  colorLevel: null,
  styleColorRange: null,
  source: BeerSourceEnum.OFFICIAL,
  createdBy: null,
};

const ENTITY = {
  id: 9,
  beerId: 4,
  characteristic: BeerCharacteristicEnum.AROMAS,
  proposedValue: '["fruity","citrus"]',
  reason: "Fiche du brasseur",
  proposedBy: 1,
  createdAt: NOW,
  closesAt: CLOSES_AT,
  status: CorrectionStatusEnum.OPEN,
  resolvedAt: null,
  previousValue: null,
};

const RESOLVED_AT = new Date("2026-06-08T09:00:00.000Z");

const RECORD = {
  id: 9,
  beerId: 4,
  characteristic: BeerCharacteristicEnum.AROMAS,
  proposedValue: ["fruity", "citrus"],
  reason: "Fiche du brasseur",
  proposedBy: 1,
  createdAt: NOW.toISOString(),
  closesAt: CLOSES_AT.toISOString(),
  status: CorrectionStatusEnum.OPEN,
  resolvedAt: null,
  previousValue: null,
};

describe("correction mapper", () => {
  it("lists the eight characteristics of the contract and recognizes only them", () => {
    expect(Object.values(BeerCharacteristicEnum)).toEqual(["abv", "ibu", "ebc", "sweetness", "acidity", "body", "aromas", "formats"]);
    expect(isBeerCharacteristic("body")).toBe(true);
    expect(isBeerCharacteristic("color")).toBe(false);
    expect(isBeerCharacteristic("")).toBe(false);
  });

  it("builds a new row with the value stored as JSON, the reason cleaned and the closing seven days later", () => {
    expect(
      toNewCorrection(4, { characteristic: BeerCharacteristicEnum.AROMAS, value: ["fruity", "citrus"], reason: "  Fiche\r\ndu brasseur \n" }, 1, NOW),
    ).toStrictEqual({
      beerId: 4,
      characteristic: BeerCharacteristicEnum.AROMAS,
      proposedValue: '["fruity","citrus"]',
      reason: "Fiche\ndu brasseur",
      proposedBy: 1,
      createdAt: NOW,
      closesAt: CLOSES_AT,
    });
    expect(CLOSES_AT.toISOString()).toBe("2026-06-08T08:00:00.000Z");
  });

  it("stores a number as JSON and an absent reason as the empty text", () => {
    expect(toNewCorrection(4, { characteristic: BeerCharacteristicEnum.IBU, value: 35 }, 2, NOW)).toMatchObject({
      proposedValue: "35",
      reason: "",
      proposedBy: 2,
    });
  });

  it("maps an entity to a record with ISO dates and the value read back from JSON", () => {
    expect(toCorrectionRecordDto(ENTITY)).toStrictEqual(RECORD);
    expect(toCorrectionRecordDto({ ...ENTITY, proposedValue: "7.5" }).proposedValue).toBe(7.5);
  });

  it.each([
    [BeerCharacteristicEnum.ABV, 6.2],
    [BeerCharacteristicEnum.IBU, 35],
    [BeerCharacteristicEnum.EBC, null],
    [BeerCharacteristicEnum.SWEETNESS, 2],
    [BeerCharacteristicEnum.ACIDITY, null],
    [BeerCharacteristicEnum.BODY, 5],
    [BeerCharacteristicEnum.AROMAS, [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY]],
    [BeerCharacteristicEnum.FORMATS, null],
  ])("reads the %s of a beer as %j, an empty list being null", (characteristic, expected) => {
    expect(readCharacteristicValue(BEER, characteristic)).toEqual(expected);
  });

  it("reads an empty list of aromas as null, not as an empty list", () => {
    expect(readCharacteristicValue({ ...BEER, aromas: [] }, BeerCharacteristicEnum.AROMAS)).toBeNull();
  });

  it("reads a non-empty list of formats", () => {
    expect(readCharacteristicValue({ ...BEER, formats: [BeerFormatEnum.CAN] }, BeerCharacteristicEnum.FORMATS)).toEqual(["can"]);
  });

  it("builds the correction with the counters, the names and the ownership of the caller", () => {
    const record = { ...RECORD, characteristic: BeerCharacteristicEnum.IBU, proposedValue: 35 };

    expect(toCorrectionDto(record, "Orval", null, "Alice", 1, 1, 0, null)).toStrictEqual({
      id: 9,
      beerId: 4,
      beerName: "Orval",
      characteristic: BeerCharacteristicEnum.IBU,
      currentValue: null,
      proposedValue: 35,
      reason: "Fiche du brasseur",
      proposedBy: 1,
      proposedByName: "Alice",
      createdAt: NOW.toISOString(),
      closesAt: CLOSES_AT.toISOString(),
      status: "open",
      resolvedAt: null,
      agreeCount: 1,
      disagreeCount: 0,
      myVote: null,
      isMine: true,
    });
  });

  it("declares the three statuses of a correction with their contract values", () => {
    expect(Object.values(CorrectionStatusEnum)).toEqual(["open", "accepted", "rejected"]);
  });

  it("reads the resolution of a closed entity: ISO date and the previous value parsed from JSON", () => {
    const accepted = { ...ENTITY, status: CorrectionStatusEnum.ACCEPTED, resolvedAt: RESOLVED_AT, previousValue: '["fruity"]' };

    expect(toCorrectionRecordDto(accepted)).toStrictEqual({
      ...RECORD,
      status: "accepted",
      resolvedAt: RESOLVED_AT.toISOString(),
      previousValue: ["fruity"],
    });
    expect(toCorrectionRecordDto({ ...accepted, status: CorrectionStatusEnum.REJECTED, previousValue: "null" })).toMatchObject({
      status: "rejected",
      previousValue: null,
    });
    expect(toCorrectionRecordDto({ ...accepted, previousValue: "35" }).previousValue).toBe(35);
  });

  it("answers the live current value of an open correction and the kept previous value of a closed one", () => {
    const closed = { ...RECORD, status: CorrectionStatusEnum.ACCEPTED, resolvedAt: RESOLVED_AT.toISOString(), previousValue: 20 };

    expect(toCorrectionDto({ ...RECORD, previousValue: 99 }, "Orval", 35, "Alice", 2, 2, 1, null)).toMatchObject({
      status: "open",
      resolvedAt: null,
      currentValue: 35,
    });
    expect(toCorrectionDto(closed, "Orval", 35, "Alice", 2, 2, 1, null)).toMatchObject({
      status: "accepted",
      resolvedAt: RESOLVED_AT.toISOString(),
      currentValue: 20,
    });
    expect(toCorrectionDto({ ...closed, status: CorrectionStatusEnum.REJECTED, previousValue: null }, "Orval", 35, "Alice", 2, 1, 0, null)).toMatchObject({
      status: "rejected",
      currentValue: null,
    });
    expect(toCorrectionDto({ ...closed, previousValue: ["fruity"] }, "Orval", ["hoppy"], "Alice", 2, 2, 0, null).currentValue).toEqual(["fruity"]);
  });

  it.each([
    [BeerCharacteristicEnum.ABV, 7.5, { abv: 7.5 }],
    [BeerCharacteristicEnum.IBU, 35, { ibu: 35 }],
    [BeerCharacteristicEnum.EBC, 20, { ebc: 20 }],
    [BeerCharacteristicEnum.SWEETNESS, 2, { sweetness: 2 }],
    [BeerCharacteristicEnum.ACIDITY, 3, { acidity: 3 }],
    [BeerCharacteristicEnum.BODY, 5, { body: 5 }],
    [BeerCharacteristicEnum.AROMAS, ["fruity", "citrus"], { aromas: ["fruity", "citrus"] }],
    [BeerCharacteristicEnum.FORMATS, ["can"], { formats: ["can"] }],
  ])("turns a %s value into a change of that single key of the beer", (characteristic, value, expected) => {
    expect(toBeerCharacteristicChange(characteristic, value)).toStrictEqual(expected);
  });

  it("flags a correction proposed by someone else as not mine and carries the counters", () => {
    expect(toCorrectionDto(RECORD, "Orval", ["fruity"], "Alice", 2, 3, 4, null)).toMatchObject({
      currentValue: ["fruity"],
      agreeCount: 3,
      disagreeCount: 4,
      myVote: null,
      isMine: false,
    });
  });

  it("carries the vote of the caller in both senses", () => {
    const sense = CorrectionVoteSenseEnum;

    expect(toCorrectionDto(RECORD, "Orval", null, "Alice", 2, 2, 0, sense.AGREE).myVote).toBe("agree");
    expect(toCorrectionDto(RECORD, "Orval", null, "Alice", 2, 1, 1, sense.DISAGREE).myVote).toBe("disagree");
  });

  it("declares the two senses of a vote with their contract values", () => {
    const sense = CorrectionVoteSenseEnum;

    expect(Object.values(sense)).toEqual(["agree", "disagree"]);
  });

  it("builds a new vote row with the correction, the voter, the sense and the instant", () => {
    const sense = CorrectionVoteSenseEnum;

    expect(toNewCorrectionVote(9, 2, sense.DISAGREE, NOW)).toStrictEqual({ correctionId: 9, userId: 2, sense: "disagree", votedAt: NOW });
    expect(toNewCorrectionVote(10, 3, sense.AGREE, CLOSES_AT)).toStrictEqual({ correctionId: 10, userId: 3, sense: "agree", votedAt: CLOSES_AT });
  });

  it("builds the board from the open corrections, the recently closed ones and the pending count", () => {
    const open = [toCorrectionDto(RECORD, "Orval", null, "Alice", 2, 1, 0, null)];

    expect(toCorrectionBoardDto(open, [], 1)).toStrictEqual({ open, recentlyClosed: [], pendingCount: 1 });
    expect(toCorrectionBoardDto([], [], 0)).toStrictEqual({ open: [], recentlyClosed: [], pendingCount: 0 });
  });
});
