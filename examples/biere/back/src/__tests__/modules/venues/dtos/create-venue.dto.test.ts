import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { CreateVenueDto } from "@/modules/venues/dtos/create-venue.dto";
import { VenueTypeEnum } from "@/modules/venues/enums/venue-type.enum";
import {
  VENUE_ADDRESS_MAX_LENGTH,
  VENUE_CITY_MAX_LENGTH,
  VENUE_DESCRIPTION_MAX_LENGTH,
  VENUE_NAME_MAX_LENGTH,
} from "@/modules/venues/venues.constants";

const VALID_BODY = {
  name: "Chez Mousse",
  type: "bar",
  address: "12 rue de la Bière, 59000 Lille",
  latitude: 50.63,
  longitude: 3.06,
};

const validateBody = async (body: object) => {
  const dto = plainToInstance(CreateVenueDto, body);
  const errors = await validate(dto);
  return { dto, errors };
};

const messagesOf = (errors: { property: string; constraints?: Record<string, string> }[], property: string): string[] =>
  Object.values(errors.find((error) => error.property === property)?.constraints ?? {});

describe("CreateVenueDto", () => {
  it("accepts a venue with only the required fields", async () => {
    const { errors } = await validateBody(VALID_BODY);

    expect(errors).toEqual([]);
  });

  it("accepts a venue with a city and a description and keeps them", async () => {
    const { dto, errors } = await validateBody({ ...VALID_BODY, city: "Lille", description: "Un bar." });

    expect(errors).toEqual([]);
    expect(dto).toMatchObject({ city: "Lille", description: "Un bar." });
  });

  it.each(Object.values(VenueTypeEnum))("accepts the type %s", async (type) => {
    const { errors } = await validateBody({ ...VALID_BODY, type });

    expect(errors).toEqual([]);
  });

  it("trims the name and the address before validating them", async () => {
    const { dto, errors } = await validateBody({ ...VALID_BODY, name: "  Chez Mousse  ", address: "  1 rue A  " });

    expect(errors).toEqual([]);
    expect(dto).toMatchObject({ name: "Chez Mousse", address: "1 rue A" });
  });

  it("accepts a name of the maximum length surrounded by spaces", async () => {
    const name = "a".repeat(VENUE_NAME_MAX_LENGTH);

    const { dto, errors } = await validateBody({ ...VALID_BODY, name: `  ${name}  ` });

    expect(errors).toEqual([]);
    expect(dto.name).toBe(name);
  });

  it("accepts an address of the maximum length surrounded by spaces", async () => {
    const { errors } = await validateBody({ ...VALID_BODY, address: ` ${"a".repeat(VENUE_ADDRESS_MAX_LENGTH)} ` });

    expect(errors).toEqual([]);
  });

  it.each([
    ["an empty name", { name: "" }, "name"],
    ["a name made of spaces", { name: "   " }, "name"],
    ["a missing name", { name: undefined }, "name"],
    ["a numeric name", { name: 12 }, "name"],
    ["a name one character too long", { name: ` ${"a".repeat(VENUE_NAME_MAX_LENGTH + 1)} ` }, "name"],
    ["an unknown type", { type: "restaurant" }, "type"],
    ["a missing type", { type: undefined }, "type"],
    ["an empty address", { address: "" }, "address"],
    ["an address made of spaces", { address: "  " }, "address"],
    ["an address one character too long", { address: ` ${"a".repeat(VENUE_ADDRESS_MAX_LENGTH + 1)} ` }, "address"],
    ["a latitude above 90", { latitude: 90.1 }, "latitude"],
    ["a latitude below -90", { latitude: -90.1 }, "latitude"],
    ["a latitude given as text", { latitude: "50.6" }, "latitude"],
    ["a missing latitude", { latitude: undefined }, "latitude"],
    ["a longitude above 180", { longitude: 180.1 }, "longitude"],
    ["a longitude below -180", { longitude: -180.1 }, "longitude"],
    ["a longitude given as text", { longitude: "3.06" }, "longitude"],
    ["a missing longitude", { longitude: undefined }, "longitude"],
    ["a city one character too long", { city: "a".repeat(VENUE_CITY_MAX_LENGTH + 1) }, "city"],
    ["a city that is not text", { city: 5 }, "city"],
    [
      "a description one character too long",
      { description: "a".repeat(VENUE_DESCRIPTION_MAX_LENGTH + 1) },
      "description",
    ],
    ["a description that is not text", { description: 5 }, "description"],
  ])("rejects %s with a message", async (_label, patch, property) => {
    const { errors } = await validateBody({ ...VALID_BODY, ...patch });

    expect(messagesOf(errors, property).length).toBeGreaterThan(0);
    expect(messagesOf(errors, property).every((message) => message.length > 0)).toBe(true);
  });

  it.each([
    ["latitude", 90],
    ["latitude", -90],
    ["longitude", 180],
    ["longitude", -180],
    ["latitude", 0],
    ["longitude", 0],
  ])("accepts the %s value %s", async (property, value) => {
    const { errors } = await validateBody({ ...VALID_BODY, [property]: value });

    expect(errors).toEqual([]);
  });

  it("accepts a city and a description of the maximum length", async () => {
    const { errors } = await validateBody({
      ...VALID_BODY,
      city: "a".repeat(VENUE_CITY_MAX_LENGTH),
      description: "a".repeat(VENUE_DESCRIPTION_MAX_LENGTH),
    });

    expect(errors).toEqual([]);
  });
});
