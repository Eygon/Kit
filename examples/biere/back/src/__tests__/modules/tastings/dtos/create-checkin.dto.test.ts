import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { BeerAromaEnum } from "@/modules/beers/enums/beer-aroma.enum";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";
import { CreateCheckinDto } from "@/modules/tastings/dtos/create-checkin.dto";

const VALID_FORM = {
  beerId: "12",
  drankAt: "2026-03-14T18:30:00.000Z",
  place: "Le Bistrot",
  rating: "4.5",
  aromas: "fruity,hoppy",
  format: "bottle",
  price: "6.5",
  comment: "Superbe",
};

const messagesFor = async (form: Record<string, unknown>): Promise<string[]> => {
  const errors = await validate(plainToInstance(CreateCheckinDto, form), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
};

describe("CreateCheckinDto", () => {
  it("accepts a complete form whose numbers and aromas arrive as strings and converts them", async () => {
    const dto = plainToInstance(CreateCheckinDto, VALID_FORM);

    expect(await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).toEqual([]);
    expect(dto).toMatchObject({
      beerId: 12,
      rating: 4.5,
      price: 6.5,
      aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY],
      format: BeerFormatEnum.BOTTLE,
    });
  });

  it("accepts a form with only the required fields", async () => {
    const form = { beerId: "1", drankAt: "2026-03-14T18:30:00Z", place: "Bar", format: "can" };

    expect(await messagesFor(form)).toEqual([]);
  });

  it("trims the place and turns an empty aromas string into an empty list", async () => {
    const dto = plainToInstance(CreateCheckinDto, { ...VALID_FORM, place: "  Le Bistrot  ", aromas: "" });

    expect(await validate(dto)).toEqual([]);
    expect(dto.place).toBe("Le Bistrot");
    expect(dto.aromas).toEqual([]);
  });

  it("normalizes the line endings of the comment before the length check", async () => {
    const dto = plainToInstance(CreateCheckinDto, { ...VALID_FORM, comment: `${"c".repeat(499)}\r\n` });

    expect(await validate(dto)).toEqual([]);
    expect(dto.comment).toBe(`${"c".repeat(499)}\n`);
    expect(await messagesFor({ ...VALID_FORM, comment: `${"c".repeat(500)}\r\n` })).not.toEqual([]);
  });

  it("keeps aromas sent as repeated parts and rejects a duplicate among them", async () => {
    const dto = plainToInstance(CreateCheckinDto, { ...VALID_FORM, aromas: ["fruity", "hoppy"] });

    expect(await validate(dto)).toEqual([]);
    expect(dto.aromas).toEqual([BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY]);
    expect(await messagesFor({ ...VALID_FORM, aromas: ["fruity", "fruity"] })).not.toEqual([]);
  });

  it("accepts a place of 80 characters surrounded by spaces and rejects 81 or only spaces", async () => {
    expect(await messagesFor({ ...VALID_FORM, place: ` ${"a".repeat(80)} ` })).toEqual([]);
    expect(await messagesFor({ ...VALID_FORM, place: ` ${"a".repeat(81)} ` })).not.toEqual([]);
    expect(await messagesFor({ ...VALID_FORM, place: "   " })).not.toEqual([]);
  });

  it.each([
    ["an empty place", { place: "" }],
    ["a missing place", { place: undefined }],
    ["a missing beerId", { beerId: undefined }],
    ["a beerId of 0", { beerId: "0" }],
    ["a non-numeric beerId", { beerId: "abc" }],
    ["a decimal beerId", { beerId: "1.5" }],
    ["a malformed date", { drankAt: "yesterday" }],
    ["a missing date", { drankAt: undefined }],
    ["a rating of 0", { rating: "0" }],
    ["a rating of 5.5", { rating: "5.5" }],
    ["a rating of 4.2", { rating: "4.2" }],
    ["a non-numeric rating", { rating: "great" }],
    ["six aromas", { aromas: "fruity,citrus,hoppy,floral,spicy,caramel" }],
    ["an unknown aroma", { aromas: "fruity,unknown" }],
    ["a duplicated aroma", { aromas: "fruity,fruity" }],
    ["an unknown format", { format: "keg" }],
    ["a missing format", { format: undefined }],
    ["a negative price", { price: "-1" }],
    ["a price of 1000.01", { price: "1000.01" }],
    ["a price with three decimals", { price: "6.505" }],
    ["a comment of 501 characters", { comment: "c".repeat(501) }],
    ["an unknown field", { ownerId: "3" }],
  ])("rejects %s", async (_label, override) => {
    const messages = await messagesFor({ ...VALID_FORM, ...override });

    expect(messages.length).toBeGreaterThan(0);
  });

  it.each([
    ["a rating of 0.5", { rating: "0.5" }],
    ["a rating of 5", { rating: "5" }],
    ["a price of 0", { price: "0" }],
    ["a price of 1000", { price: "1000" }],
    ["five aromas", { aromas: "fruity,citrus,hoppy,floral,spicy" }],
    ["a comment of 500 characters", { comment: "c".repeat(500) }],
  ])("accepts %s", async (_label, override) => {
    expect(await messagesFor({ ...VALID_FORM, ...override })).toEqual([]);
  });

  it("names the rating step in the message for a rating off the step", async () => {
    const messages = await messagesFor({ ...VALID_FORM, rating: "4.2" });

    expect(messages).toEqual(["rating must be divisible by 0.5"]);
  });
});
