import { toast } from "@heroui/react";
import type { VenueQuery } from "@/types/models/venue/venueQuery";
import { API_BASE_URL } from "@/config/apiConfig";
import { EMPTY_VENUE_QUERY } from "@/types/mappers/venue/venueQueryMapper";
import { VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import VenueService from "@/api/venues/venueService";
import { HttpError } from "@/api/httpError";
import { venueDtoToModel } from "@/types/mappers/venue/venueMapper";
import { VoteSenseEnum } from "@/types/enums/venue/voteSenseEnum";
import i18n from "@/i18n/i18n";
import type { NewVenue } from "@/types/models/venue/newVenue";
import { createVenue, reportVenueBeer, voteVenueBeer } from "@/utils/queryFunctions/venueQueryFunctions";

vi.mock("@heroui/react", () => ({
  toast: { danger: vi.fn() },
}));

const VENUES_URL = `${API_BASE_URL}/api/v1/venues`;
const mockFetch = vi.fn();

const venueDto = {
  id: 12,
  name: "Le Trappiste",
  type: "bar",
  city: "Paris",
  address: "1 rue de la Bière",
  latitude: 48.8566,
  longitude: 2.3522,
  description: "",
  distanceKm: null,
  checkinCount: 0,
  lastCheckinAt: null,
  status: "confirmed",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("VenueService.getAll", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests /venues with a GET and exactly the contract parameters of the query", async () => {
    const query: VenueQuery = {
      ...EMPTY_VENUE_QUERY,
      bounds: { north: 48.9, south: 48.8, east: 2.4, west: 2.2 },
      types: [VenueTypeEnum.BAR, VenueTypeEnum.BREWERY],
      family: BeerFamilyEnum.STOUT,
      beerId: 7,
      confirmedOnly: true,
      visited: true,
      position: { latitude: 48.85, longitude: 2.35 },
      radiusKm: 10,
    };
    mockFetch.mockImplementation(async () => json([venueDto]));

    await VenueService.getAll(query);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `${VENUES_URL}?north=48.9&south=48.8&east=2.4&west=2.2&type=bar&type=brewery&beer=7&family=stout&confirmedOnly=true&visited=true&latitude=48.85&longitude=2.35&radiusKm=10`,
    );
    expect(init.method).toBe("GET");
  });

  it("sends the trimmed search text as q next to the filters and without bounds", async () => {
    mockFetch.mockImplementation(async () => json([]));

    await VenueService.getAll({ ...EMPTY_VENUE_QUERY, types: [VenueTypeEnum.BAR], q: "  acad " });

    expect(mockFetch.mock.calls[0][0]).toBe(`${VENUES_URL}?type=bar&q=acad`);
  });

  it("sends no parameter for an empty query", async () => {
    mockFetch.mockImplementation(async () => json([]));

    await VenueService.getAll(EMPTY_VENUE_QUERY);

    expect(mockFetch.mock.calls[0][0]).toBe(`${VENUES_URL}?`);
  });

  it("returns the venues as models, with unknown type and status narrowed", async () => {
    mockFetch.mockImplementation(async () =>
      json([venueDto, { ...venueDto, id: 13, type: "pub", status: "available", distanceKm: 0.4 }]),
    );

    const venues = await VenueService.getAll(EMPTY_VENUE_QUERY);

    expect(venues).toHaveLength(2);
    expect(venues[0]).toEqual({ ...venueDto, type: "bar", status: "confirmed" });
    expect(venues[1]).toEqual({ ...venueDto, id: 13, type: null, status: "unknown", distanceKm: 0.4 });
  });

  it("returns an empty list on a 204 answer without a toast", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(VenueService.getAll(EMPTY_VENUE_QUERY)).resolves.toEqual([]);
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it.each([400, 401, 500])("rejects with the HttpError on status %s and shows no toast", async (status) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));

    const failure = await VenueService.getAll(EMPTY_VENUE_QUERY).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(HttpError);
    expect((failure as HttpError).status).toBe(status);
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("rejects with the original error on a network failure and shows no toast", async () => {
    const networkError = new TypeError("Failed to fetch");
    mockFetch.mockRejectedValue(networkError);

    await expect(VenueService.getAll(EMPTY_VENUE_QUERY)).rejects.toBe(networkError);
    expect(toast.danger).not.toHaveBeenCalled();
  });
});

const venueBeerDto = {
  beerId: 7,
  beerName: "Houblon Chouffe",
  breweryName: "Chouffe",
  styleName: "Double IPA",
  family: "ipa",
  status: "maybeGone",
  lastConfirmedAt: "2026-10-01T10:00:00.000Z",
  recentVoterCount: 3,
  nextVoteAt: null,
  drunk: false,
  checkinCount: 0,
  lastCheckinAt: null,
};

describe("VenueService.search", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests /venues with a GET and the same parameters as the map, q included", async () => {
    mockFetch.mockImplementation(async () => json([]));

    await VenueService.search({ ...EMPTY_VENUE_QUERY, types: [VenueTypeEnum.BAR], confirmedOnly: true, q: "  taverne cluni " });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${VENUES_URL}?type=bar&confirmedOnly=true&q=taverne+cluni`);
    expect(init.method).toBe("GET");
  });

  it("is not approximate when no venue carries the flag or when it is false", async () => {
    mockFetch.mockImplementation(async () => json([venueDto, { ...venueDto, id: 13, isApproximateMatch: false }]));

    const result = await VenueService.search({ ...EMPTY_VENUE_QUERY, q: "trappiste" });

    expect(result).toEqual({
      venues: [venueDtoToModel(venueDto), venueDtoToModel({ ...venueDto, id: 13 })],
      isApproximate: false,
    });
  });

  it("is approximate when a single venue is flagged, whatever its position in the list", async () => {
    const flagged = { ...venueDto, id: 14, name: "La Taverne de Cluny", isApproximateMatch: true };
    mockFetch.mockImplementation(async () => json([venueDto, flagged]));
    const first = await VenueService.search({ ...EMPTY_VENUE_QUERY, q: "taverne cluni" });
    mockFetch.mockImplementation(async () => json([flagged, venueDto]));
    const second = await VenueService.search({ ...EMPTY_VENUE_QUERY, q: "taverne cluni" });

    expect(first.isApproximate).toBe(true);
    expect(second.isApproximate).toBe(true);
    expect(first.venues).toHaveLength(2);
    expect(first.venues[1]).toEqual(venueDtoToModel(flagged));
    expect(first.venues[1]).not.toHaveProperty("isApproximateMatch");
  });

  it("returns no venue and no approximation on an empty body", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(VenueService.search({ ...EMPTY_VENUE_QUERY, q: "zzzz" })).resolves.toEqual({
      venues: [],
      isApproximate: false,
    });
  });

  it("returns no venue and no approximation on an empty list", async () => {
    mockFetch.mockImplementation(async () => json([]));

    await expect(VenueService.search({ ...EMPTY_VENUE_QUERY, q: "zzzz" })).resolves.toEqual({
      venues: [],
      isApproximate: false,
    });
  });
});

describe("VenueService.getBeers", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests /venues/{id}/beers with a GET and no query string", async () => {
    mockFetch.mockImplementation(async () => json([venueBeerDto]));

    await VenueService.getBeers(12);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${VENUES_URL}/12/beers`);
    expect(init.method).toBe("GET");
  });

  it("returns the beers as models in the received order, with unknown family and status narrowed and dates parsed", async () => {
    mockFetch.mockImplementation(async () =>
      json([venueBeerDto, { ...venueBeerDto, beerId: 8, family: "mead", status: "available", lastConfirmedAt: null }]),
    );

    const beers = await VenueService.getBeers(12);

    expect(beers).toHaveLength(2);
    expect(beers[0]).toEqual({
      ...venueBeerDto,
      family: "ipa",
      status: "maybeGone",
      lastConfirmedAt: new Date("2026-10-01T10:00:00.000Z"),
      nextVoteAt: null,
    });
    expect(beers[1]).toEqual({ ...venueBeerDto, beerId: 8, family: null, status: "unknown", lastConfirmedAt: null, nextVoteAt: null });
  });

  it("returns an empty list on a 204 answer without a toast", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(VenueService.getBeers(12)).resolves.toEqual([]);
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it.each([400, 401, 404, 500])("rejects with the HttpError on status %s and shows no toast", async (status) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));

    const failure = await VenueService.getBeers(12).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(HttpError);
    expect((failure as HttpError).status).toBe(status);
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("rejects with the original error on a network failure and shows no toast", async () => {
    const networkError = new TypeError("Failed to fetch");
    mockFetch.mockRejectedValue(networkError);

    await expect(VenueService.getBeers(12)).rejects.toBe(networkError);
    expect(toast.danger).not.toHaveBeenCalled();
  });
});

describe("VenueService.vote", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    [VoteSenseEnum.STILL, "still"],
    [VoteSenseEnum.GONE, "gone"],
  ])("posts the sense %s as the only body field to /venues/{id}/beers/{beerId}/votes", async (sense, expected) => {
    mockFetch.mockImplementation(async () => json(venueBeerDto, 201));

    await VenueService.vote(12, 7, sense);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${VENUES_URL}/12/beers/7/votes`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ sense: expected });
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("returns the recomputed beer as a model with dates parsed and no toast", async () => {
    mockFetch.mockImplementation(async () =>
      json({ ...venueBeerDto, status: "confirmed", nextVoteAt: "2026-10-14T10:00:00.000Z" }, 201),
    );

    const beer = await VenueService.vote(12, 7, VoteSenseEnum.STILL);

    expect(beer).toEqual({
      ...venueBeerDto,
      status: "confirmed",
      family: "ipa",
      lastConfirmedAt: new Date("2026-10-01T10:00:00.000Z"),
      nextVoteAt: new Date("2026-10-14T10:00:00.000Z"),
    });
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("AC5 on a 409 shows one toast with the dedicated already voted text and rethrows the HttpError", async () => {
    mockFetch.mockImplementation(async () => json({ message: "You already voted" }, 409));

    const failure = await VenueService.vote(12, 7, VoteSenseEnum.STILL).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(HttpError);
    expect((failure as HttpError).status).toBe(409);
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith("Vous avez déjà voté pour cette bière ici dans les dernières 24 h.");
  });

  it.each([
    [400, "errors.badRequest"],
    [401, "errors.unauthorized"],
    [404, "errors.notFound"],
    [500, "errors.generic"],
  ])("AC6 on status %s shows one toast with the text of %s and rethrows", async (status, key) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));

    const failure = await VenueService.vote(12, 7, VoteSenseEnum.GONE).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(HttpError);
    expect((failure as HttpError).status).toBe(status);
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith(i18n.t(key));
    expect(toast.danger).not.toHaveBeenCalledWith("Vous avez déjà voté pour cette bière ici dans les dernières 24 h.");
  });

  it("AC6 on a network failure shows one generic toast and rethrows the original error", async () => {
    const networkError = new TypeError("Failed to fetch");
    mockFetch.mockRejectedValue(networkError);

    await expect(VenueService.vote(12, 7, VoteSenseEnum.STILL)).rejects.toBe(networkError);
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith("Une erreur est survenue. Réessayez.");
  });

  it("treats an answer without a body as a failure: one generic toast and a rethrow", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(VenueService.vote(12, 7, VoteSenseEnum.STILL)).rejects.toBeInstanceOf(Error);
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith("Une erreur est survenue. Réessayez.");
  });

  it("is reached through the voteVenueBeer query function with the same arguments", async () => {
    mockFetch.mockImplementation(async () => json(venueBeerDto, 201));

    const beer = await voteVenueBeer(12, 7, VoteSenseEnum.GONE);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${VENUES_URL}/12/beers/7/votes`);
    expect(JSON.parse(init.body as string)).toEqual({ sense: "gone" });
    expect(beer.beerId).toBe(7);
  });
});

describe("VenueService.reportBeer", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the beerId as the only body field to /venues/{id}/beers", async () => {
    mockFetch.mockImplementation(async () => json({ ...venueBeerDto, status: "unknown", recentVoterCount: 0 }, 201));

    await VenueService.reportBeer(12, 7);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${VENUES_URL}/12/beers`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ beerId: 7 });
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("returns the created link as a model with no toast", async () => {
    mockFetch.mockImplementation(async () =>
      json({ ...venueBeerDto, status: "unknown", lastConfirmedAt: null, recentVoterCount: 0 }, 201),
    );

    const beer = await VenueService.reportBeer(12, 7);

    expect(beer).toEqual({
      ...venueBeerDto,
      status: "unknown",
      family: "ipa",
      lastConfirmedAt: null,
      recentVoterCount: 0,
      nextVoteAt: null,
    });
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("AC2 on a 409 shows one toast with the dedicated already listed text and rethrows the HttpError", async () => {
    mockFetch.mockImplementation(async () => json({ message: "already linked" }, 409));

    const failure = await VenueService.reportBeer(12, 7).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(HttpError);
    expect((failure as HttpError).status).toBe(409);
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith("Cette bière est déjà signalée ici");
  });

  it.each([
    [400, "errors.badRequest"],
    [401, "errors.unauthorized"],
    [404, "errors.notFound"],
    [500, "errors.generic"],
  ])("on status %s shows one toast with the text of %s and rethrows", async (status, key) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));

    const failure = await VenueService.reportBeer(12, 7).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(HttpError);
    expect((failure as HttpError).status).toBe(status);
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith(i18n.t(key));
    expect(toast.danger).not.toHaveBeenCalledWith("Cette bière est déjà signalée ici");
  });

  it("on a network failure shows one generic toast and rethrows the original error", async () => {
    const networkError = new TypeError("Failed to fetch");
    mockFetch.mockRejectedValue(networkError);

    await expect(VenueService.reportBeer(12, 7)).rejects.toBe(networkError);
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith("Une erreur est survenue. Réessayez.");
  });

  it("treats an answer without a body as a failure: one generic toast and a rethrow", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(VenueService.reportBeer(12, 7)).rejects.toBeInstanceOf(Error);
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith("Une erreur est survenue. Réessayez.");
  });

  it("is reached through the reportVenueBeer query function with the same arguments", async () => {
    mockFetch.mockImplementation(async () => json({ ...venueBeerDto, status: "unknown" }, 201));

    const beer = await reportVenueBeer(12, 7);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${VENUES_URL}/12/beers`);
    expect(JSON.parse(init.body as string)).toEqual({ beerId: 7 });
    expect(beer.beerId).toBe(7);
  });
});

const NEW_VENUE: NewVenue = {
  name: "Le Trappiste",
  type: VenueTypeEnum.BAR,
  address: "1 rue de la Bière",
  city: "Paris",
  description: "Vingt pressions.",
  latitude: 48.8566,
  longitude: 2.3522,
};

describe("VenueService.create", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts exactly the contract fields of the new venue to /venues", async () => {
    mockFetch.mockImplementation(async () => json({ ...venueDto, status: "unknown" }, 201));

    await VenueService.create(NEW_VENUE);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(VENUES_URL);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      name: "Le Trappiste",
      type: "bar",
      address: "1 rue de la Bière",
      city: "Paris",
      description: "Vingt pressions.",
      latitude: 48.8566,
      longitude: 2.3522,
    });
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("returns the created venue as a model with no toast", async () => {
    mockFetch.mockImplementation(async () => json({ ...venueDto, id: 40, status: "unknown" }, 201));

    const venue = await VenueService.create(NEW_VENUE);

    expect(venue).toEqual({ ...venueDto, id: 40, status: "unknown" });
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("AC3 on a 409 shows one toast with the dedicated already existing text and rethrows the HttpError", async () => {
    mockFetch.mockImplementation(async () => json({ message: "name taken" }, 409));

    const failure = await VenueService.create(NEW_VENUE).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(HttpError);
    expect((failure as HttpError).status).toBe(409);
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith("Ce lieu existe déjà");
  });

  it.each([
    [400, "errors.badRequest"],
    [401, "errors.unauthorized"],
    [500, "errors.generic"],
  ])("on status %s shows one toast with the text of %s and rethrows", async (status, key) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));

    const failure = await VenueService.create(NEW_VENUE).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(HttpError);
    expect((failure as HttpError).status).toBe(status);
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith(i18n.t(key));
    expect(toast.danger).not.toHaveBeenCalledWith("Ce lieu existe déjà");
  });

  it("on a network failure shows one generic toast and rethrows the original error", async () => {
    const networkError = new TypeError("Failed to fetch");
    mockFetch.mockRejectedValue(networkError);

    await expect(VenueService.create(NEW_VENUE)).rejects.toBe(networkError);
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith("Une erreur est survenue. Réessayez.");
  });

  it("treats an answer without a body as a failure: one generic toast and a rethrow", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(VenueService.create(NEW_VENUE)).rejects.toBeInstanceOf(Error);
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith("Une erreur est survenue. Réessayez.");
  });

  it("is reached through the createVenue query function with the same argument", async () => {
    mockFetch.mockImplementation(async () => json({ ...venueDto, status: "unknown" }, 201));

    const venue = await createVenue(NEW_VENUE);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(VENUES_URL);
    expect(JSON.parse(init.body as string)).toMatchObject({ name: "Le Trappiste", latitude: 48.8566 });
    expect(venue.id).toBe(12);
  });
});

const beerVenueDto = {
  venueId: 12,
  venueName: "Le Trappiste",
  venueType: "bar",
  city: "Paris",
  address: "1 rue de la Bière",
  latitude: 48.8566,
  longitude: 2.3522,
  status: "confirmed",
  lastConfirmedAt: "2026-10-01T10:00:00.000Z",
  recentVoterCount: 3,
  distanceKm: null,
};

describe("VenueService.getForBeer", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests /beers/{id}/venues with a GET and no query string", async () => {
    mockFetch.mockImplementation(async () => json([beerVenueDto]));

    await VenueService.getForBeer(7);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_BASE_URL}/api/v1/beers/7/venues`);
    expect(init.method).toBe("GET");
  });

  it("returns the venues as models in the received order, with unknown type and status narrowed and dates parsed", async () => {
    mockFetch.mockImplementation(async () =>
      json([
        beerVenueDto,
        { ...beerVenueDto, venueId: 13, venueType: "kiosk", status: "available", lastConfirmedAt: null, distanceKm: 1.2 },
      ]),
    );

    const venues = await VenueService.getForBeer(7);

    expect(venues).toHaveLength(2);
    expect(venues[0]).toEqual({ ...beerVenueDto, venueType: "bar", lastConfirmedAt: new Date("2026-10-01T10:00:00.000Z") });
    expect(venues[1]).toEqual({
      ...beerVenueDto,
      venueId: 13,
      venueType: null,
      status: "unknown",
      lastConfirmedAt: null,
      distanceKm: 1.2,
    });
  });

  it("returns an empty list on a 204 answer without a toast", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(VenueService.getForBeer(7)).resolves.toEqual([]);
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("returns an empty list on an empty array", async () => {
    mockFetch.mockImplementation(async () => json([]));

    await expect(VenueService.getForBeer(7)).resolves.toEqual([]);
  });

  it.each([400, 401, 404, 500])("rejects with the HttpError on status %s and shows no toast", async (status) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));

    const failure = await VenueService.getForBeer(7).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(HttpError);
    expect((failure as HttpError).status).toBe(status);
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("rejects with the original error on a network failure and shows no toast", async () => {
    const networkError = new TypeError("Failed to fetch");
    mockFetch.mockRejectedValue(networkError);

    await expect(VenueService.getForBeer(7)).rejects.toBe(networkError);
    expect(toast.danger).not.toHaveBeenCalled();
  });
});

describe("VenueService.getById", () => {
  const gone = "Ce lieu n'est plus sur la carte.";

  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("AC1 requests /venues/{id} with a GET and returns the whole venue as a model without a toast", async () => {
    const dto = { ...venueDto, checkinCount: 3, lastCheckinAt: "2026-03-02T21:30:00.000Z" };
    mockFetch.mockImplementation(async () => json(dto));

    const venue = await VenueService.getById(12);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${VENUES_URL}/12`);
    expect(init.method).toBe("GET");
    expect(venue).toEqual(venueDtoToModel(dto));
    expect(venue).toMatchObject({ id: 12, name: "Le Trappiste", checkinCount: 3 });
    expect(venue?.lastCheckinAt).toEqual(new Date("2026-03-02T21:30:00.000Z"));
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("returns null on a 204 answer without a toast", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(VenueService.getById(12)).resolves.toBeNull();
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("AC2 on a 404 returns null and shows one toast with the gone text only", async () => {
    mockFetch.mockImplementation(async () => json({ message: "unknown" }, 404));

    await expect(VenueService.getById(99)).resolves.toBeNull();

    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith(gone);
  });

  it.each([
    [400, "La demande est invalide."],
    [401, "Vous devez être identifié."],
    [500, "Une erreur est survenue. Réessayez."],
  ])("AC3 on status %s returns null and shows one toast with its own text, not the gone text", async (status, text) => {
    mockFetch.mockImplementation(async () => json({ message: "x" }, status));

    await expect(VenueService.getById(12)).resolves.toBeNull();

    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith(text);
    expect(toast.danger).not.toHaveBeenCalledWith(gone);
  });

  it("AC3 on a network failure returns null and shows one generic toast", async () => {
    mockFetch.mockImplementation(async () => {
      throw new TypeError("Failed to fetch");
    });

    await expect(VenueService.getById(12)).resolves.toBeNull();

    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith("Une erreur est survenue. Réessayez.");
  });
});
