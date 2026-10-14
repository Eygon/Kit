import { describe, expect, it } from "vitest";
import type { CreateVenueDto } from "@/modules/venues/dtos/create-venue.dto";
import { AvailabilityStatusEnum } from "@/modules/venues/enums/availability-status.enum";
import { VenueTypeEnum } from "@/modules/venues/enums/venue-type.enum";
import { toNewVenue, toVenueDto, toVenueRecordDto, toVenueSearchKeys } from "@/modules/venues/mappers/venue.mapper";

const FULL_ENTITY = {
  id: 7,
  name: "La Fine Mousse",
  type: VenueTypeEnum.BAR,
  city: "Paris",
  address: "6 rue Louis Bonnet, 75011 Paris",
  latitude: 48.8688,
  longitude: 2.3806,
  description: "Un bar a bieres.",
  nameKey: "la fine mousse",
  searchName: "la fine mousse",
  searchCity: "paris",
};

describe("toVenueRecordDto", () => {
  it("lists every public field explicitly and leaves the name key out", () => {
    expect(toVenueRecordDto(FULL_ENTITY)).toEqual({
      id: 7,
      name: "La Fine Mousse",
      type: VenueTypeEnum.BAR,
      city: "Paris",
      address: "6 rue Louis Bonnet, 75011 Paris",
      latitude: 48.8688,
      longitude: 2.3806,
      description: "Un bar a bieres.",
    });
  });

  it("turns an absent city and an absent description into empty strings", () => {
    const record = toVenueRecordDto({ ...FULL_ENTITY, city: null, description: null });

    expect(record.city).toBe("");
    expect(record.description).toBe("");
  });
});

describe("toVenueDto", () => {
  const RECORD = {
    id: 7,
    name: "La Fine Mousse",
    type: VenueTypeEnum.BAR,
    city: "Paris",
    address: "6 rue Louis Bonnet, 75011 Paris",
    latitude: 48.8688,
    longitude: 2.3806,
    description: "Un bar a bieres.",
  };

  it("adds the status and a null distance to the record", () => {
    expect(toVenueDto(RECORD, AvailabilityStatusEnum.MAYBE_GONE, null)).toEqual({
      ...RECORD,
      distanceKm: null,
      status: AvailabilityStatusEnum.MAYBE_GONE,
    });
  });

  it("keeps a given distance", () => {
    expect(toVenueDto(RECORD, AvailabilityStatusEnum.GONE, 1.25)).toEqual({
      ...RECORD,
      distanceKm: 1.25,
      status: AvailabilityStatusEnum.GONE,
    });
  });
});

describe("toVenueSearchKeys", () => {
  it("folds accents, case and whitespace runs of the name and the city", () => {
    expect(toVenueSearchKeys("Café  Ébène", "Liège")).toEqual({ searchName: "cafe ebene", searchCity: "liege" });
  });

  it("gives an empty city key when the city is absent", () => {
    expect(toVenueSearchKeys("Café  Ébène", null)).toEqual({ searchName: "cafe ebene", searchCity: "" });
  });
});

describe("toNewVenue", () => {
  const DTO: CreateVenueDto = {
    name: "Chez Mousse",
    type: VenueTypeEnum.SHOP,
    address: "12 rue de la Biere, 59000 Lille",
    latitude: 50.63,
    longitude: 3.06,
    city: "Lille",
    description: "Une cave.",
  };

  it("lists every column explicitly with the lower-cased name as key", () => {
    expect(toNewVenue(DTO)).toEqual({
      name: "Chez Mousse",
      type: VenueTypeEnum.SHOP,
      city: "Lille",
      address: "12 rue de la Biere, 59000 Lille",
      latitude: 50.63,
      longitude: 3.06,
      description: "Une cave.",
      nameKey: "chez mousse",
      searchName: "chez mousse",
      searchCity: "lille",
    });
  });

  it("trims the name and the address and derives the key from the trimmed name", () => {
    const venue = toNewVenue({ ...DTO, name: "  Académie de la Bière  ", address: "  1 rue A  " });

    expect(venue.name).toBe("Académie de la Bière");
    expect(venue.address).toBe("1 rue A");
    expect(venue.nameKey).toBe("académie de la bière");
  });

  it("folds the case of non ASCII letters in the key", () => {
    expect(toNewVenue({ ...DTO, name: "ÉCOLE" }).nameKey).toBe("école");
  });

  it("derives the search keys from the trimmed name and the city", () => {
    const venue = toNewVenue({ ...DTO, name: "  Café  Ébène ", city: "Liège" });

    expect(venue.searchName).toBe("cafe ebene");
    expect(venue.searchCity).toBe("liege");
  });

  it("gives an empty city search key and a filled name key when the city is absent", () => {
    const venue = toNewVenue({
      name: DTO.name,
      type: DTO.type,
      address: DTO.address,
      latitude: DTO.latitude,
      longitude: DTO.longitude,
    });

    expect(venue.searchCity).toBe("");
    expect(venue.searchName).toBe("chez mousse");
  });

  it("turns an absent city and an absent description into null", () => {
    const venue = toNewVenue({
      name: DTO.name,
      type: DTO.type,
      address: DTO.address,
      latitude: DTO.latitude,
      longitude: DTO.longitude,
    });

    expect(venue.city).toBeNull();
    expect(venue.description).toBeNull();
  });
});
