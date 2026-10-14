import type { Mock } from "vitest";
import VenueService from "@/api/venues/venueService";
import { EMPTY_VENUE_QUERY } from "@/types/mappers/venue/venueQueryMapper";
import { fetchVenue, fetchVenueBeers, fetchVenues, searchVenues } from "@/utils/queryFunctions/venueQueryFunctions";

vi.mock("@/api/venues/venueService", () => ({
  default: { getAll: vi.fn(), getBeers: vi.fn(), getById: vi.fn(), search: vi.fn() },
}));

describe("fetchVenues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to VenueService.getAll with the query and returns its venues", async () => {
    const venues = [{ id: 1, name: "Le Trappiste" }];
    (VenueService.getAll as Mock).mockResolvedValue(venues);
    const query = { ...EMPTY_VENUE_QUERY, beerId: 7, visited: true };

    await expect(fetchVenues(query)).resolves.toBe(venues);
    expect(VenueService.getAll).toHaveBeenCalledTimes(1);
    expect(VenueService.getAll).toHaveBeenCalledWith(query);
  });
});

describe("searchVenues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to VenueService.search with the query and returns its result, not the plain list", async () => {
    const result = { venues: [{ id: 1, name: "La Taverne de Cluny" }], isApproximate: true };
    (VenueService.search as Mock).mockResolvedValue(result);
    const query = { ...EMPTY_VENUE_QUERY, q: "taverne cluni" };

    await expect(searchVenues(query)).resolves.toBe(result);
    expect(VenueService.search).toHaveBeenCalledTimes(1);
    expect(VenueService.search).toHaveBeenCalledWith(query);
    expect(VenueService.getAll).not.toHaveBeenCalled();
  });
});

describe("fetchVenueBeers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to VenueService.getBeers with the venue id and returns its beers", async () => {
    const beers = [{ beerId: 7 }];
    (VenueService.getBeers as Mock).mockResolvedValue(beers);

    await expect(fetchVenueBeers(12)).resolves.toBe(beers);
    expect(VenueService.getBeers).toHaveBeenCalledTimes(1);
    expect(VenueService.getBeers).toHaveBeenCalledWith(12);
  });
});

describe("fetchVenue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to VenueService.getById with the venue id and returns its venue", async () => {
    const venue = { id: 12, name: "Le Trappiste" };
    (VenueService.getById as Mock).mockResolvedValue(venue);

    await expect(fetchVenue(12)).resolves.toBe(venue);
    expect(VenueService.getById).toHaveBeenCalledTimes(1);
    expect(VenueService.getById).toHaveBeenCalledWith(12);
  });

  it("returns null when the service finds no venue", async () => {
    (VenueService.getById as Mock).mockResolvedValue(null);

    await expect(fetchVenue(99)).resolves.toBeNull();
  });
});
