import type { Mock } from "vitest";
import VenueService from "@/api/venues/venueService";
import { EMPTY_VENUE_QUERY } from "@/types/mappers/venue/venueQueryMapper";
import { fetchVenueBeers, fetchVenues } from "@/utils/queryFunctions/venueQueryFunctions";

vi.mock("@/api/venues/venueService", () => ({
  default: { getAll: vi.fn(), getBeers: vi.fn() },
}));

describe("fetchVenues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to VenueService.getAll with the query and returns its venues", async () => {
    const venues = [{ id: 1, name: "Le Trappiste" }];
    (VenueService.getAll as Mock).mockResolvedValue(venues);
    const query = { ...EMPTY_VENUE_QUERY, beerId: 7 };

    await expect(fetchVenues(query)).resolves.toBe(venues);
    expect(VenueService.getAll).toHaveBeenCalledTimes(1);
    expect(VenueService.getAll).toHaveBeenCalledWith(query);
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
