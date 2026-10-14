import { HttpStatus } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { UNIDENTIFIED_USER_MESSAGE } from "@/common/exceptions/exception-messages.constants";
import venueBeersSeed from "@/database/seed/data/venue-beers.json";
import beersSeed from "@/database/seed/data/beers.json";
import stylesSeed from "@/database/seed/data/styles.json";
import venuesSeed from "@/database/seed/data/venues.json";
import { createTestApp } from "@/__tests__/support/test-app";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";

const VENUES_PATH = "/api/v1/venues";
const VENUE_COUNT = 36;
const LILLE_VENUE_COUNT = 6;
const UNKNOWN_VENUE_ID = 999_999;
const ALICE_ID = "1";
const BEERS_PATH = "/api/v1/beers";
const ORVAL = "Orval";
const GUINNESS = "Guinness Draught";
const GUINNESS_STYLE = "Stout";
const BEER_WITHOUT_LINK = "Hoegaarden 0,0";
const BERTHOM_LYON = "Les Berthom Lyon";
const UNKNOWN_BEER_ID = 999_999;
const ORVAL_VENUE_COUNT = 11;
const BRUSSELS_ORVAL_COUNT = 5;
const MIN_FARTHEST_KM = 390;
const FINE_MOUSSE = { latitude: 48.8655, longitude: 2.3802 };
const BRUSSELS_ZONE = "north=50.86&south=50.83&east=4.38&west=4.34";
const SEARCH_MAX_LENGTH = 100;
const PARIS_ZONE = "north=49&south=48.7&east=2.6&west=2.1";
const SEARCH_TOO_LONG_MESSAGE = "q must be shorter than or equal to 100 characters";
const CHECKINS_PATH = "/api/v1/checkins";
const BOB_ID = "2";
const CAROL_ID = "3";
const VENUE_WITHOUT_BEER = "Le Triangle";
const FULLY_DRUNK_VENUE = "Au Trappiste";
const UNDISCOVERED_NOT_A_BOOLEAN_MESSAGE = "undiscovered must be a boolean value";
const LYON_ZONE = "north=45.8&south=45.7&east=4.9&west=4.8";

interface VenueBody {
  readonly id: number;
  readonly name: string;
  readonly type: string;
  readonly city: string;
  readonly address: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly description: string;
  readonly distanceKm: number | null;
  readonly status: string;
  readonly checkinCount: number;
  readonly lastCheckinAt: string | null;
  readonly isApproximateMatch: boolean;
}

const STATUS_RANK: Readonly<Record<string, number>> = { confirmed: 0, maybeGone: 1, unknown: 2, gone: 3 };

const bestSeededStatus = (venueName: string): string =>
  venueBeersSeed
    .filter((link) => link.venueName === venueName)
    .map((link) => link.status)
    .reduce((best, status) => (STATUS_RANK[status] < STATUS_RANK[best] ? status : best), "unknown");

const byName = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

const seededNames = (predicate: (venue: (typeof venuesSeed)[number]) => boolean): string[] =>
  venuesSeed
    .filter(predicate)
    .map((venue) => venue.name)
    .sort(byName);

const bestOf = (statuses: readonly string[]): string =>
  statuses.reduce((best, status) => (STATUS_RANK[status] < STATUS_RANK[best] ? status : best), statuses[0]);

const namesLinkedTo = (predicate: (link: (typeof venueBeersSeed)[number]) => boolean): string[] => [
  ...new Set(venueBeersSeed.filter(predicate).map((link) => link.venueName)),
];

const beersOfFamily = (family: string): string[] => {
  const styleNames = stylesSeed.filter((style) => style.family === family).map((style) => style.name);
  return beersSeed.filter((beer) => styleNames.includes(beer.styleName)).map((beer) => beer.name);
};

const namesOf = (body: unknown): string[] => (body as VenueBody[]).map((venue) => venue.name);

describe("venues API", () => {
  let app: INestApplication;
  let orvalId: number;

  const get = (path: string) => request(app.getHttpServer()).get(path).set(USER_ID_HEADER_NAME, ALICE_ID);

  const findBeer = async (name: string): Promise<{ id: number; styleId: number }> => {
    const response = await get(`${BEERS_PATH}?q=${encodeURIComponent(name)}`);
    expect(response.status).toBe(HttpStatus.OK);
    const items = (response.body as { items: { id: number; name: string; styleId: number }[] }).items;
    const beer = items.find((item) => item.name === name);
    expect(beer).toBeDefined();
    return beer as { id: number; styleId: number };
  };

  const getAsDelete = (checkinId: number) =>
    request(app.getHttpServer()).delete(`${CHECKINS_PATH}/${checkinId}`).set(USER_ID_HEADER_NAME, ALICE_ID);

  const findBeerId = async (name: string): Promise<number> => (await findBeer(name)).id;

  const findStyleId = async (name: string): Promise<number> => (await findBeer(name)).styleId;

  beforeAll(async () => {
    app = await createTestApp();
    orvalId = await findBeerId(ORVAL);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /api/v1/venues without filter", () => {
    it("returns the 36 seeded venues ordered by name with every field and no distance", async () => {
      const response = await get(VENUES_PATH);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveLength(VENUE_COUNT);
      expect(namesOf(response.body)).toEqual(seededNames(() => true));
      const bodies = response.body as VenueBody[];
      bodies.forEach((body) => {
        const seeded = venuesSeed.find((venue) => venue.name === body.name);
        expect(body).toEqual({
          id: expect.any(Number),
          name: seeded?.name,
          type: seeded?.type,
          city: seeded?.city,
          address: seeded?.address,
          latitude: seeded?.latitude,
          longitude: seeded?.longitude,
          description: seeded?.description,
          distanceKm: null,
          status: expect.any(String),
          checkinCount: 0,
          lastCheckinAt: null,
          isApproximateMatch: false,
        });
      });
    });

    it("gives each venue the best state of its seeded beers and unknown to a venue without beer", async () => {
      const response = await get(VENUES_PATH);

      const bodies = response.body as VenueBody[];
      expect(bodies.map((body) => [body.name, body.status])).toEqual(
        seededNames(() => true).map((name) => [name, bestSeededStatus(name)]),
      );
      const statuses = new Set(bodies.map((body) => body.status));
      expect(statuses.has("confirmed")).toBe(true);
      expect(statuses.has("unknown")).toBe(true);
    });
  });

  describe("GET /api/v1/venues with a zone", () => {
    it("returns only the venues of Lille for a zone around Lille", async () => {
      const response = await get(`${VENUES_PATH}?north=50.65&south=50.63&east=3.08&west=3.05`);

      expect(response.status).toBe(HttpStatus.OK);
      expect(namesOf(response.body)).toEqual(seededNames((venue) => venue.city === "Lille"));
      expect(response.body).toHaveLength(LILLE_VENUE_COUNT);
    });

    it("includes a venue lying exactly on the bounds", async () => {
      const berthom = venuesSeed.find((venue) => venue.name === "Les Berthom Lille");
      const query = `north=${berthom?.latitude}&south=${berthom?.latitude}&east=${berthom?.longitude}&west=${berthom?.longitude}`;

      const response = await get(`${VENUES_PATH}?${query}`);

      expect(response.status).toBe(HttpStatus.OK);
      expect(namesOf(response.body)).toEqual(["Les Berthom Lille"]);
    });

    it("returns an empty list for a zone without venue", async () => {
      const response = await get(`${VENUES_PATH}?north=10&south=9&east=10&west=9`);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual([]);
    });

    it.each([
      ["three bounds out of four", "north=50.65&south=50.63&east=3.08"],
      ["one bound only", "west=3.05"],
    ])("returns 400 for %s", async (_label, query) => {
      const response = await get(`${VENUES_PATH}?${query}`);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: "north, south, east and west must be supplied together." });
    });

    it("returns 400 for a south bound above the north bound", async () => {
      const response = await get(`${VENUES_PATH}?north=50.63&south=50.65&east=3.08&west=3.05`);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: "south must not be greater than north." });
    });

    it("returns 400 for a west bound east of the east bound", async () => {
      const response = await get(`${VENUES_PATH}?north=50.65&south=50.63&east=3.05&west=3.08`);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: "west must not be greater than east." });
    });

    it.each([
      ["north above 90", "north=91", "north must not be greater than 90"],
      ["north below -90", "north=-91", "north must not be less than -90"],
      ["south above 90", "south=91", "south must not be greater than 90"],
      ["south below -90", "south=-91", "south must not be less than -90"],
      ["east above 180", "east=181", "east must not be greater than 180"],
      ["east below -180", "east=-181", "east must not be less than -180"],
      ["west above 180", "west=181", "west must not be greater than 180"],
      ["west below -180", "west=-181", "west must not be less than -180"],
      [
        "a bound that is not a number",
        "north=abc&south=50&east=3&west=2",
        "north must not be greater than 90; north must not be less than -90; north must be a number conforming to the specified constraints",
      ],
    ])("returns 400 and the validation message for %s", async (_label, query, message) => {
      const response = await get(`${VENUES_PATH}?${query}`);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message });
    });
  });

  describe("GET /api/v1/venues with a type", () => {
    it("returns only shops for type=shop", async () => {
      const response = await get(`${VENUES_PATH}?type=shop`);

      expect(response.status).toBe(HttpStatus.OK);
      expect(namesOf(response.body)).toEqual(seededNames((venue) => venue.type === "shop"));
      expect((response.body as VenueBody[]).every((venue) => venue.type === "shop")).toBe(true);
      expect(response.body).not.toHaveLength(0);
    });

    it("combines several types with OR", async () => {
      const response = await get(`${VENUES_PATH}?type=bar&type=brewery`);

      expect(response.status).toBe(HttpStatus.OK);
      expect(namesOf(response.body)).toEqual(seededNames((venue) => venue.type === "bar" || venue.type === "brewery"));
    });

    it("combines a type with a zone with AND", async () => {
      const response = await get(`${VENUES_PATH}?type=shop&north=50.65&south=50.63&east=3.08&west=3.05`);

      expect(namesOf(response.body)).toEqual(
        seededNames((venue) => venue.type === "shop" && venue.city === "Lille"),
      );
    });

    it("returns 400 for an unknown type", async () => {
      const response = await get(`${VENUES_PATH}?type=cave`);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect((response.body as { message: string }).message).not.toBe("");
    });
  });

  describe("GET /api/v1/venues with a beer", () => {
    it("returns only the venues of Orval with the state of Orval in each", async () => {
      const response = await get(`${VENUES_PATH}?beer=${orvalId}`);

      expect(response.status).toBe(HttpStatus.OK);
      expect(namesOf(response.body)).toEqual(namesLinkedTo((link) => link.beerName === ORVAL).sort(byName));
      expect(response.body).toHaveLength(ORVAL_VENUE_COUNT);
      (response.body as VenueBody[]).forEach((body) => {
        const link = venueBeersSeed.find((seeded) => seeded.venueName === body.name && seeded.beerName === ORVAL);
        expect(body.status).toBe(link?.status);
      });
    });

    it("gives Les Berthom Lyon the unknown state of Orval although the venue has confirmed beers", async () => {
      const unfiltered = (await get(VENUES_PATH)).body as VenueBody[];
      const filtered = (await get(`${VENUES_PATH}?beer=${orvalId}`)).body as VenueBody[];

      expect(unfiltered.find((venue) => venue.name === BERTHOM_LYON)?.status).toBe("confirmed");
      expect(filtered.find((venue) => venue.name === BERTHOM_LYON)?.status).toBe("unknown");
    });

    it("returns an empty list for a beer that does not exist", async () => {
      const response = await get(`${VENUES_PATH}?beer=${UNKNOWN_BEER_ID}`);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual([]);
    });

    it("returns an empty list for a beer that no venue sells", async () => {
      const response = await get(`${VENUES_PATH}?beer=${await findBeerId(BEER_WITHOUT_LINK)}`);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual([]);
    });
  });

  describe("GET /api/v1/venues with a family or a style", () => {
    it("returns only the venues with a stout, with the state computed on the stouts only", async () => {
      const response = await get(`${VENUES_PATH}?family=stout`);

      expect(response.status).toBe(HttpStatus.OK);
      const stoutNames = beersOfFamily("Stout");
      expect(namesOf(response.body)).toEqual(namesLinkedTo((link) => stoutNames.includes(link.beerName)).sort(byName));
      (response.body as VenueBody[]).forEach((body) => {
        const statuses = venueBeersSeed
          .filter((link) => link.venueName === body.name && stoutNames.includes(link.beerName))
          .map((link) => link.status);
        expect(body.status).toBe(bestOf(statuses));
      });
    });

    it("returns only the venues with a beer of the style", async () => {
      const guinnessStyleId = await findStyleId(GUINNESS);
      const response = await get(`${VENUES_PATH}?style=${guinnessStyleId}`);

      expect(response.status).toBe(HttpStatus.OK);
      const styleBeers = beersSeed.filter((beer) => beer.styleName === GUINNESS_STYLE).map((beer) => beer.name);
      expect(namesOf(response.body)).toEqual(namesLinkedTo((link) => styleBeers.includes(link.beerName)).sort(byName));
      expect(response.body).not.toHaveLength(0);
      expect(response.body).not.toHaveLength(namesLinkedTo((link) => beersOfFamily("Stout").includes(link.beerName)).length);
    });

    it("combines several styles with OR", async () => {
      const guinnessStyleId = await findStyleId(GUINNESS);
      const orvalStyleId = await findStyleId(ORVAL);
      const response = await get(`${VENUES_PATH}?style=${guinnessStyleId}&style=${orvalStyleId}`);

      const styleNames = [GUINNESS_STYLE, beersSeed.find((beer) => beer.name === ORVAL)?.styleName];
      const beerNames = beersSeed.filter((beer) => styleNames.includes(beer.styleName)).map((beer) => beer.name);
      expect(namesOf(response.body)).toEqual(namesLinkedTo((link) => beerNames.includes(link.beerName)).sort(byName));
    });

    it("combines a family and a beer of another family with AND into an empty list", async () => {
      const response = await get(`${VENUES_PATH}?family=stout&beer=${orvalId}`);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual([]);
    });
  });

  describe("GET /api/v1/venues with confirmedOnly", () => {
    it("returns only the venues where Orval is confirmed", async () => {
      const response = await get(`${VENUES_PATH}?beer=${orvalId}&confirmedOnly=true`);

      expect(response.status).toBe(HttpStatus.OK);
      const expected = namesLinkedTo((link) => link.beerName === ORVAL && link.status === "confirmed").sort(byName);
      expect(namesOf(response.body)).toEqual(expected);
      expect(namesOf(response.body)).not.toContain(BERTHOM_LYON);
      expect((response.body as VenueBody[]).every((venue) => venue.status === "confirmed")).toBe(true);
    });

    it("returns the venues with at least one confirmed beer without beer filter", async () => {
      const response = await get(`${VENUES_PATH}?confirmedOnly=true`);

      expect(response.status).toBe(HttpStatus.OK);
      expect(namesOf(response.body)).toEqual(namesLinkedTo((link) => link.status === "confirmed").sort(byName));
      expect(response.body).not.toHaveLength(VENUE_COUNT);
    });

    it("does not filter for confirmedOnly=false", async () => {
      const response = await get(`${VENUES_PATH}?confirmedOnly=false`);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveLength(VENUE_COUNT);
    });
  });

  describe("GET /api/v1/venues with a position", () => {
    it("returns the venues within 2 km of La Fine Mousse sorted by distance, each with its distance", async () => {
      const response = await get(`${VENUES_PATH}?latitude=${FINE_MOUSSE.latitude}&longitude=${FINE_MOUSSE.longitude}&radiusKm=2`);

      expect(response.status).toBe(HttpStatus.OK);
      const bodies = response.body as VenueBody[];
      expect(namesOf(bodies)).toEqual(["La Fine Mousse", "Les Trois 8", "Le Triangle"]);
      expect(bodies[0].distanceKm).toBe(0);
      expect(bodies[1].distanceKm).toBeCloseTo(0.57, 1);
      expect(bodies[2].distanceKm).toBeCloseTo(0.99, 1);
    });

    it("gives every venue its distance sorted ascending when there is no radius", async () => {
      const response = await get(`${VENUES_PATH}?latitude=${FINE_MOUSSE.latitude}&longitude=${FINE_MOUSSE.longitude}`);

      expect(response.status).toBe(HttpStatus.OK);
      const bodies = response.body as VenueBody[];
      expect(bodies).toHaveLength(VENUE_COUNT);
      const distances = bodies.map((venue) => venue.distanceKm as number);
      expect(distances.every((distance) => typeof distance === "number")).toBe(true);
      expect(distances).toEqual([...distances].sort((left, right) => left - right));
      expect(bodies[0].name).toBe("La Fine Mousse");
      expect(distances[distances.length - 1]).toBeGreaterThan(MIN_FARTHEST_KM);
    });

    it("combines the position with the beer filter", async () => {
      const response = await get(
        `${VENUES_PATH}?beer=${orvalId}&latitude=${FINE_MOUSSE.latitude}&longitude=${FINE_MOUSSE.longitude}`,
      );

      const bodies = response.body as VenueBody[];
      expect(bodies).toHaveLength(ORVAL_VENUE_COUNT);
      expect(bodies[0].name).toBe("La Cave à Bulles");
      expect(bodies.every((venue) => venue.distanceKm !== null)).toBe(true);
    });
  });

  describe("GET /api/v1/venues combining zone, beer and confirmedOnly", () => {
    it("returns the confirmed Orval venues of Brussels only", async () => {
      const response = await get(`${VENUES_PATH}?${BRUSSELS_ZONE}&beer=${orvalId}&confirmedOnly=true`);

      expect(response.status).toBe(HttpStatus.OK);
      expect(namesOf(response.body)).toEqual(
        namesLinkedTo((link) => link.beerName === ORVAL && link.status === "confirmed")
          .filter((name) => venuesSeed.find((venue) => venue.name === name)?.city === "Bruxelles")
          .sort(byName),
      );
      expect(response.body).toHaveLength(BRUSSELS_ORVAL_COUNT);
    });

    it("returns nothing in Lyon when Orval must be confirmed but returns the venue without it", async () => {
      const confirmed = await get(`${VENUES_PATH}?${LYON_ZONE}&beer=${orvalId}&confirmedOnly=true`);
      const any = await get(`${VENUES_PATH}?${LYON_ZONE}&beer=${orvalId}`);

      expect(confirmed.body).toEqual([]);
      expect(namesOf(any.body)).toEqual([BERTHOM_LYON]);
    });

    it("combines a type with the beer filter", async () => {
      const response = await get(`${VENUES_PATH}?type=shop&beer=${orvalId}`);

      expect(namesOf(response.body)).toEqual(
        namesLinkedTo((link) => link.beerName === ORVAL)
          .filter((name) => venuesSeed.find((venue) => venue.name === name)?.type === "shop")
          .sort(byName),
      );
    });
  });

  describe("GET /api/v1/venues with invalid filters", () => {
    it("returns 400 for a radius without position", async () => {
      const response = await get(`${VENUES_PATH}?radiusKm=2`);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: "radiusKm requires latitude and longitude." });
    });

    it("returns 400 for a latitude without longitude and for a longitude without latitude", async () => {
      const latitudeOnly = await get(`${VENUES_PATH}?latitude=48.8`);
      const longitudeOnly = await get(`${VENUES_PATH}?longitude=2.3`);

      expect(latitudeOnly.status).toBe(HttpStatus.BAD_REQUEST);
      expect(latitudeOnly.body).toEqual({ message: "latitude and longitude must be supplied together." });
      expect(longitudeOnly.status).toBe(HttpStatus.BAD_REQUEST);
      expect(longitudeOnly.body).toEqual({ message: "latitude and longitude must be supplied together." });
    });

    it.each([
      ["a zero radius", "latitude=48.8&longitude=2.3&radiusKm=0", "radiusKm must be a positive number"],
      ["a negative radius", "latitude=48.8&longitude=2.3&radiusKm=-1", "radiusKm must be a positive number"],
      ["a radius above the maximum", "latitude=48.8&longitude=2.3&radiusKm=51", "radiusKm must not be greater than 50"],
      [
        "a radius that is not a number",
        "latitude=48.8&longitude=2.3&radiusKm=far",
        "radiusKm must not be greater than 50; radiusKm must be a positive number; radiusKm must be a number conforming to the specified constraints",
      ],
      [
        "an unknown family",
        "family=wine",
        "family must be one of the following values: lager, pilsner, paleAle, ipa, blonde, amber, brown, stout, porter, witbier, weizen, saison, trappist, abbey, belgianStrong, sourLambic, fruit, nonAlcoholic",
      ],
      ["a beer that is not a number", "beer=orval", "beer must not be less than 1; beer must be an integer number"],
      ["a beer below 1", "beer=0", "beer must not be less than 1"],
      ["a style below 1", "style=0", "each value in style must not be less than 1"],
      [
        "a style that is not a number",
        "style=ipa",
        "each value in style must not be less than 1; each value in style must be an integer number",
      ],
      ["a confirmedOnly that is not a boolean", "confirmedOnly=maybe", "confirmedOnly must be a boolean value"],
      ["a latitude above 90", "latitude=91&longitude=2.3", "latitude must not be greater than 90"],
    ])("returns 400 and its message for %s", async (_label, query, message) => {
      const response = await get(`${VENUES_PATH}?${query}`);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message });
    });

    it("returns 400 for a partial zone before reading any filter", async () => {
      const response = await get(`${VENUES_PATH}?north=50&beer=${orvalId}&radiusKm=2`);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: "north, south, east and west must be supplied together." });
    });

    it("returns 401 without identity before validating the filters", async () => {
      const response = await request(app.getHttpServer()).get(`${VENUES_PATH}?radiusKm=2`);

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    });
  });

  describe("GET /api/v1/venues/:id", () => {
    it("returns the same venue as the list, with its state", async () => {
      const list = (await get(VENUES_PATH)).body as VenueBody[];
      const confirmed = list.find((venue) => venue.status === "confirmed") as VenueBody;
      const unknown = list.find((venue) => venue.status === "unknown") as VenueBody;

      const confirmedResponse = await get(`${VENUES_PATH}/${confirmed.id}`);
      const unknownResponse = await get(`${VENUES_PATH}/${unknown.id}`);

      expect(confirmedResponse.status).toBe(HttpStatus.OK);
      expect(confirmedResponse.body).toEqual(confirmed);
      expect(unknownResponse.body).toEqual(unknown);
    });

    it.each(["999999", "0", "-1"])("returns 404 with a message for the unknown id %s", async (id) => {
      const response = await get(`${VENUES_PATH}/${id}`);

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.body).toEqual({ message: `Venue ${id} not found.` });
    });

    it("returns 400 for an id that is not a number, before looking the venue up", async () => {
      const response = await get(`${VENUES_PATH}/abc`);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: "Validation failed (numeric string is expected)" });
    });
  });

  describe("GET /api/v1/venues with a search text", () => {
    const search = (text: string, extra = "") => get(`${VENUES_PATH}?q=${encodeURIComponent(text)}${extra}`);

    it("finds Académie de la Bière with the unaccented text academie", async () => {
      const response = await search("academie");

      expect(response.status).toBe(HttpStatus.OK);
      expect(namesOf(response.body)).toEqual(["Académie de la Bière"]);
    });

    it("lists the Lille venues whose name contains the text before those matching by city, each group by name", async () => {
      const response = await search("LILLE");

      expect(response.status).toBe(HttpStatus.OK);
      expect(namesOf(response.body)).toEqual([
        "Les 3 Brasseurs Lille",
        "Les Berthom Lille",
        "Au Vieux de la Vieille",
        "Estaminet T'Rijsel",
        "L'Abbaye des Saveurs",
        "La Capsule",
      ]);
    });

    it("ignores the spaces around the text", async () => {
      const response = await search("   mort subite  ");

      expect(response.status).toBe(HttpStatus.OK);
      expect(namesOf(response.body)).toEqual(["À la Mort Subite"]);
    });

    it("answers the same venues with a text of only spaces as without text", async () => {
      const withoutText = await get(VENUES_PATH);
      const blank = await search("     ");

      expect(blank.status).toBe(HttpStatus.OK);
      expect(blank.body).toEqual(withoutText.body);
      expect(blank.body).toHaveLength(VENUE_COUNT);
    });

    it("accepts a text of 100 characters once the spaces are removed", async () => {
      const text = "a".repeat(SEARCH_MAX_LENGTH);

      expect((await search(text)).status).toBe(HttpStatus.OK);
      expect((await search(`  ${text}  `)).status).toBe(HttpStatus.OK);
    });

    it("rejects a text of 101 characters once the spaces are removed with a message", async () => {
      const text = "a".repeat(SEARCH_MAX_LENGTH + 1);

      const plain = await search(text);
      const padded = await search(`  ${text}  `);

      expect(plain.status).toBe(HttpStatus.BAD_REQUEST);
      expect(plain.body).toEqual({ message: SEARCH_TOO_LONG_MESSAGE });
      expect(padded.status).toBe(HttpStatus.BAD_REQUEST);
      expect(padded.body).toEqual({ message: SEARCH_TOO_LONG_MESSAGE });
    });

    it("rejects a text given twice", async () => {
      const response = await get(`${VENUES_PATH}?q=a&q=b`);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect((response.body as { message: string }).message).not.toBe("");
    });

    it.each(["100%", "a_b", "%", "_", "\\"])("searches %s as literal characters and finds no seeded venue", async (text) => {
      const response = await search(text);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual([]);
    });

    it("gives each venue its distance and keeps the relevance order rather than the distance order", async () => {
      const response = await search("bruxelles", `&latitude=${FINE_MOUSSE.latitude}&longitude=${FINE_MOUSSE.longitude}`);

      expect(response.status).toBe(HttpStatus.OK);
      const bodies = response.body as VenueBody[];
      expect(namesOf(bodies)).toEqual([
        "À la Mort Subite",
        "Beermania",
        "Bier Circus",
        "Brasserie Cantillon",
        "Brasserie de la Senne",
        "Brussels Beer Project",
        "Délices et Caprices",
        "Delirium Café",
        "Moeder Lambic Fontainas",
        "Poechenellekelder",
      ]);
      expect(bodies.every((body) => typeof body.distanceKm === "number")).toBe(true);
      const distances = bodies.map((body) => body.distanceKm as number);
      expect(distances).not.toEqual([...distances].sort((left, right) => left - right));
    });

    it("keeps only the shops of Brussels for the text bruxelles and the type shop", async () => {
      const response = await search("bruxelles", "&type=shop");

      expect(response.status).toBe(HttpStatus.OK);
      expect(namesOf(response.body)).toEqual(["Beermania", "Délices et Caprices"]);
    });

    it("returns an empty list for the text bruxelles in a zone around Paris", async () => {
      const response = await search("bruxelles", `&${PARIS_ZONE}`);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual([]);
    });

    it("reports an invalid zone with a 400 even when a text is given", async () => {
      const response = await search("bruxelles", "&north=50");

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: "north, south, east and west must be supplied together." });
    });
  });

  describe("GET /api/v1/venues approximate fallback", () => {
    const search = (text: string, extra = "") => get(`${VENUES_PATH}?q=${encodeURIComponent(text)}${extra}`);
    const CLUNY = "La Taverne de Cluny";

    it("finds La Taverne de Cluny with a misspelled text and flags it as close", async () => {
      const response = await search("taverne cluni");

      expect(response.status).toBe(HttpStatus.OK);
      expect(namesOf(response.body)).toEqual([CLUNY]);
      expect((response.body as VenueBody[]).map((venue) => venue.isApproximateMatch)).toEqual([true]);
    });

    it("flags no venue as close when the exact search finds some", async () => {
      const response = await search("taverne");

      expect(response.status).toBe(HttpStatus.OK);
      const bodies = response.body as VenueBody[];
      expect(bodies.map((venue) => venue.name)).toContain(CLUNY);
      expect(bodies.every((venue) => venue.isApproximateMatch === false)).toBe(true);
    });

    it("applies the active venue type to the close venues", async () => {
      const shops = await search("taverne cluni", "&type=shop");
      const bars = await search("taverne cluni", "&type=bar");

      expect(shops.status).toBe(HttpStatus.OK);
      expect(shops.body).toEqual([]);
      expect(namesOf(bars.body)).toEqual([CLUNY]);
      expect((bars.body as VenueBody[])[0].isApproximateMatch).toBe(true);
    });

    it("renders the Lille venues, flagged as close, for the misspelled city lile", async () => {
      const response = await search("lile");

      expect(response.status).toBe(HttpStatus.OK);
      const bodies = response.body as VenueBody[];
      expect(bodies).toHaveLength(LILLE_VENUE_COUNT);
      expect(namesOf(bodies)).toEqual(seededNames((venue) => venue.city === "Lille"));
      expect(bodies.every((venue) => venue.city === "Lille" && venue.isApproximateMatch)).toBe(true);
    });

    it("applies no fallback to a text of fewer than four letters", async () => {
      const response = await search("bqr");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual([]);
    });

    it("answers an empty array when nothing is close either", async () => {
      const response = await search("zzzzzzzz");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual([]);
    });
  });

  describe("GET /api/v1/venues ranking of created venues", () => {
    let writesApp: INestApplication;

    beforeAll(async () => {
      writesApp = await createTestApp();
      for (const name of ["Le Lyonnais", "Lyon Bière"]) {
        const created = await request(writesApp.getHttpServer())
          .post(VENUES_PATH)
          .set(USER_ID_HEADER_NAME, ALICE_ID)
          .send({ name, type: "bar", city: "Lyon", address: "1 rue de Lyon", latitude: 45.76, longitude: 4.83 });
        expect(created.status).toBe(HttpStatus.CREATED);
      }
    });

    afterAll(async () => {
      await writesApp.close();
    });

    it("ranks a name starting with lyon, then names containing it, then the other venues of the city", async () => {
      const response = await request(writesApp.getHttpServer()).get(`${VENUES_PATH}?q=lyon`).set(USER_ID_HEADER_NAME, ALICE_ID);

      expect(response.status).toBe(HttpStatus.OK);
      expect(namesOf(response.body)).toEqual([
        "Lyon Bière",
        "Le Lyonnais",
        "Les Berthom Lyon",
        "Brasserie Georges",
        "Dikkenek Café",
        "Le Smoking Dog",
        "Ninkasi Gerland",
        "The Wallace Bar",
      ]);
    });
  });

  describe("GET /api/v1/venues with undiscovered", () => {
    const UNDISCOVERED = "undiscovered=true";
    const venuesWithBeers = seededNames((venue) => venueBeersSeed.some((link) => link.venueName === venue.name));
    const parisVenuesWithBeers = seededNames(
      (venue) => venue.city === "Paris" && venueBeersSeed.some((link) => link.venueName === venue.name),
    );

    const getAs = (userId: string, query: string) =>
      request(app.getHttpServer()).get(`${VENUES_PATH}?${query}`).set(USER_ID_HEADER_NAME, userId);

    const drink = async (beerId: number, drankAt: string): Promise<void> => {
      const response = await request(app.getHttpServer())
        .post(CHECKINS_PATH)
        .set(USER_ID_HEADER_NAME, ALICE_ID)
        .field("beerId", String(beerId))
        .field("drankAt", drankAt)
        .field("place", "Le Bistrot")
        .field("format", "bottle");
      expect(response.status).toBe(HttpStatus.CREATED);
    };

    it("returns every venue with a known beer and not the venue without beer for a user who drank nothing", async () => {
      const response = await getAs(CAROL_ID, UNDISCOVERED);

      expect(response.status).toBe(HttpStatus.OK);
      expect(namesOf(response.body)).toEqual(venuesWithBeers);
      expect(namesOf(response.body)).not.toContain(VENUE_WITHOUT_BEER);
      expect(venuesWithBeers.length).toBeLessThan(VENUE_COUNT);
      const everything = (await getAs(CAROL_ID, "")).body as VenueBody[];
      expect((response.body as VenueBody[])).toEqual(everything.filter((venue) => venuesWithBeers.includes(venue.name)));
    });

    it("drops the venue whose beers are all drunk for Alice and keeps it for Bob", async () => {
      const beerNames = [
        ...new Set(venueBeersSeed.filter((link) => link.venueName === FULLY_DRUNK_VENUE).map((link) => link.beerName)),
      ];
      expect(beerNames.length).toBeGreaterThan(1);
      const drunkAt = "2026-10-02T18:00:00.000Z";
      for (const beerName of beerNames) {
        await drink(await findBeerId(beerName), drunkAt);
      }

      const alice = await getAs(ALICE_ID, UNDISCOVERED);
      const bob = await getAs(BOB_ID, UNDISCOVERED);

      expect(alice.status).toBe(HttpStatus.OK);
      expect(namesOf(alice.body)).toEqual(venuesWithBeers.filter((name) => name !== FULLY_DRUNK_VENUE));
      expect(namesOf(bob.body)).toEqual(venuesWithBeers);
      expect(namesOf(bob.body)).toContain(FULLY_DRUNK_VENUE);
    });

    it("keeps a venue where Alice drank only some of the beers", async () => {
      const response = await getAs(ALICE_ID, `${UNDISCOVERED}&${LYON_ZONE}`);

      expect(response.status).toBe(HttpStatus.OK);
      expect(namesOf(response.body)).toEqual(
        seededNames((venue) => venue.city === "Lyon" && venueBeersSeed.some((link) => link.venueName === venue.name)),
      );
    });

    it("returns no venue for Alice on Orval and the Orval venues for Bob in the same request", async () => {
      await drink(orvalId, "2026-10-03T18:00:00.000Z");

      const alice = await getAs(ALICE_ID, `beer=${orvalId}&${UNDISCOVERED}`);
      const bob = await getAs(BOB_ID, `beer=${orvalId}&${UNDISCOVERED}`);
      const withoutFilter = await getAs(ALICE_ID, `beer=${orvalId}`);

      expect(alice.status).toBe(HttpStatus.OK);
      expect(alice.body).toEqual([]);
      expect(namesOf(bob.body)).toEqual(namesOf(withoutFilter.body));
      expect(bob.body).toHaveLength(ORVAL_VENUE_COUNT);
    });

    it.each(["undiscovered=false", ""])("answers the same body as without the filter for %j", async (query) => {
      const baseline = await get(VENUES_PATH);

      const response = await getAs(ALICE_ID, query);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual(baseline.body);
      expect(response.body).toHaveLength(VENUE_COUNT);
    });

    it.each(["yes", "1", "TRUE"])("returns 400 for undiscovered=%s", async (value) => {
      const response = await getAs(ALICE_ID, `undiscovered=${value}`);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: UNDISCOVERED_NOT_A_BOOLEAN_MESSAGE });
    });

    it("keeps only the Paris venues with a beer to discover when a text is given", async () => {
      const alice = await getAs(ALICE_ID, `q=paris&${UNDISCOVERED}`);
      const bob = await getAs(BOB_ID, `q=paris&${UNDISCOVERED}`);

      expect(alice.status).toBe(HttpStatus.OK);
      expect([...namesOf(alice.body)].sort(byName)).toEqual(
        parisVenuesWithBeers.filter((name) => name !== FULLY_DRUNK_VENUE),
      );
      expect([...namesOf(bob.body)].sort(byName)).toEqual(parisVenuesWithBeers);
      expect(namesOf(alice.body)).not.toContain(VENUE_WITHOUT_BEER);
    });

    it("returns 400 for a bad filter before reading the drunk beers and 401 without identity", async () => {
      const badZone = await getAs(ALICE_ID, `north=50&${UNDISCOVERED}`);
      const anonymous = await request(app.getHttpServer()).get(`${VENUES_PATH}?${UNDISCOVERED}`);

      expect(badZone.status).toBe(HttpStatus.BAD_REQUEST);
      expect(badZone.body).toEqual({ message: "north, south, east and west must be supplied together." });
      expect(anonymous.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(anonymous.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    });
  });

  describe("check-in visits", () => {
    const DELIRIUM = "Delirium Café";
    const NO_VISIT = { checkinCount: 0, lastCheckinAt: null };

    const getAs = (userId: string, path: string) =>
      request(app.getHttpServer()).get(path).set(USER_ID_HEADER_NAME, userId);

    const drink = async (userId: string, drankAt: string, venueId: number | null): Promise<number> => {
      const call = request(app.getHttpServer())
        .post(CHECKINS_PATH)
        .set(USER_ID_HEADER_NAME, userId)
        .field("beerId", String(orvalId))
        .field("drankAt", drankAt)
        .field("place", DELIRIUM)
        .field("format", "bottle");
      const response = await (venueId === null ? call : call.field("venueId", String(venueId)));
      expect(response.status).toBe(HttpStatus.CREATED);
      return (response.body as { checkin: { id: number } }).checkin.id;
    };

    const listAs = async (userId: string): Promise<VenueBody[]> => {
      const response = await getAs(userId, VENUES_PATH);
      expect(response.status).toBe(HttpStatus.OK);
      return response.body as VenueBody[];
    };

    const venueOf = (venues: readonly VenueBody[], name: string): VenueBody => {
      const venue = venues.find((item) => item.name === name);
      expect(venue).toBeDefined();
      return venue as VenueBody;
    };

    const visitOf = (venue: VenueBody) => ({ checkinCount: venue.checkinCount, lastCheckinAt: venue.lastCheckinAt });

    it("does not count a check-in whose place text names the venue but that has no venue reference", async () => {
      await drink(ALICE_ID, "2026-10-12T18:00:00.000Z", null);

      const venues = await listAs(ALICE_ID);

      expect(venues).toHaveLength(VENUE_COUNT);
      expect(venues.map(visitOf)).toEqual(venues.map(() => NO_VISIT));
    });

    it("gives Delirium Café the count and the latest date of the linked check-ins of Alice and zero and null to every other venue", async () => {
      const deliriumId = venueOf(await listAs(ALICE_ID), DELIRIUM).id;
      await drink(ALICE_ID, "2026-10-09T18:00:00.000Z", deliriumId);
      await drink(ALICE_ID, "2026-10-02T18:00:00.000Z", deliriumId);
      await drink(BOB_ID, "2026-10-11T18:00:00.000Z", venueOf(await listAs(BOB_ID), "La Fine Mousse").id);

      const venues = await listAs(ALICE_ID);

      expect(venues).toHaveLength(VENUE_COUNT);
      expect(visitOf(venueOf(venues, DELIRIUM))).toEqual({ checkinCount: 2, lastCheckinAt: "2026-10-09T18:00:00.000Z" });
      const others = venues.filter((venue) => venue.name !== DELIRIUM);
      expect(others).toHaveLength(VENUE_COUNT - 1);
      expect(others.map(visitOf)).toEqual(others.map(() => NO_VISIT));
    });

    it("gives Bob zero and null on Delirium Café in the list and by id, and his own count on another venue", async () => {
      const bobVenues = await listAs(BOB_ID);
      const delirium = venueOf(bobVenues, DELIRIUM);

      const detail = await getAs(BOB_ID, `${VENUES_PATH}/${delirium.id}`);

      expect(visitOf(delirium)).toEqual(NO_VISIT);
      expect(detail.status).toBe(HttpStatus.OK);
      expect(detail.body).toEqual({ ...delirium, ...NO_VISIT });
      expect(visitOf(venueOf(bobVenues, "La Fine Mousse"))).toEqual({
        checkinCount: 1,
        lastCheckinAt: "2026-10-11T18:00:00.000Z",
      });
    });

    it("gives the detail of a venue the same values as the list", async () => {
      const delirium = venueOf(await listAs(ALICE_ID), DELIRIUM);

      const detail = await getAs(ALICE_ID, `${VENUES_PATH}/${delirium.id}`);

      expect(detail.status).toBe(HttpStatus.OK);
      expect(detail.body).toEqual(delirium);
      expect(visitOf(detail.body as VenueBody)).toEqual({ checkinCount: 2, lastCheckinAt: "2026-10-09T18:00:00.000Z" });
    });

    it("sends the venue back to zero and null when Alice deletes her only linked check-in", async () => {
      const triangleId = venueOf(await listAs(ALICE_ID), VENUE_WITHOUT_BEER).id;
      const checkinId = await drink(ALICE_ID, "2026-10-05T18:00:00.000Z", triangleId);
      expect(visitOf(venueOf(await listAs(ALICE_ID), VENUE_WITHOUT_BEER))).toEqual({
        checkinCount: 1,
        lastCheckinAt: "2026-10-05T18:00:00.000Z",
      });

      const removal = await getAsDelete(checkinId);
      const venues = await listAs(ALICE_ID);

      expect(removal.status).toBe(HttpStatus.NO_CONTENT);
      expect(visitOf(venueOf(venues, VENUE_WITHOUT_BEER))).toEqual(NO_VISIT);
      expect(visitOf(venueOf(venues, DELIRIUM))).toEqual({ checkinCount: 2, lastCheckinAt: "2026-10-09T18:00:00.000Z" });
    });
  });

  describe("GET /api/v1/venues with visited", () => {
    const VISITED = "visited=true";
    const DELIRIUM = "Delirium Café";
    const FINE_MOUSSE_NAME = "La Fine Mousse";
    const VISITED_NOT_A_BOOLEAN_MESSAGE = "visited must be a boolean value";

    const getAs = (userId: string, query: string) =>
      request(app.getHttpServer()).get(`${VENUES_PATH}?${query}`).set(USER_ID_HEADER_NAME, userId);

    const listAs = async (userId: string, query: string): Promise<VenueBody[]> => {
      const response = await getAs(userId, query);
      expect(response.status).toBe(HttpStatus.OK);
      return response.body as VenueBody[];
    };

    const visitOf = (venue: VenueBody) => ({ checkinCount: venue.checkinCount, lastCheckinAt: venue.lastCheckinAt });

    it("gives Alice only Delirium Café and La Fine Mousse, each with its visits", async () => {
      const everything = await listAs(ALICE_ID, "");
      const fineMousseId = (everything.find((venue) => venue.name === FINE_MOUSSE_NAME) as VenueBody).id;
      const linked = await request(app.getHttpServer())
        .post(CHECKINS_PATH)
        .set(USER_ID_HEADER_NAME, ALICE_ID)
        .field("beerId", String(orvalId))
        .field("drankAt", "2026-10-07T18:00:00.000Z")
        .field("place", FINE_MOUSSE_NAME)
        .field("format", "bottle")
        .field("venueId", String(fineMousseId));
      expect(linked.status).toBe(HttpStatus.CREATED);

      const venues = await listAs(ALICE_ID, VISITED);

      expect(venues).toHaveLength(2);
      expect(namesOf(venues).sort(byName)).toEqual([DELIRIUM, FINE_MOUSSE_NAME].sort(byName));
      expect(venues).toEqual(everything.filter((venue) => [DELIRIUM, FINE_MOUSSE_NAME].includes(venue.name)).map((venue) => ({
        ...venue,
        ...(venue.name === DELIRIUM
          ? { checkinCount: 2, lastCheckinAt: "2026-10-09T18:00:00.000Z" }
          : { checkinCount: 1, lastCheckinAt: "2026-10-07T18:00:00.000Z" }),
      })));
    });

    it("returns 200 and an empty list for Carol who has no linked check-in", async () => {
      const response = await getAs(CAROL_ID, VISITED);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual([]);
    });

    it("gives Bob only the venue he visited, not the venues of Alice", async () => {
      const venues = await listAs(BOB_ID, VISITED);

      expect(venues).toHaveLength(1);
      expect(venues[0].name).toBe(FINE_MOUSSE_NAME);
      expect(visitOf(venues[0])).toEqual({ checkinCount: 1, lastCheckinAt: "2026-10-11T18:00:00.000Z" });
    });

    it("keeps only Delirium Café with the text bruxelles and only La Fine Mousse around Paris", async () => {
      const brussels = await listAs(ALICE_ID, `q=bruxelles&${VISITED}`);
      const paris = await listAs(ALICE_ID, `${PARIS_ZONE}&${VISITED}`);

      expect(namesOf(brussels)).toEqual([DELIRIUM]);
      expect(visitOf(brussels[0])).toEqual({ checkinCount: 2, lastCheckinAt: "2026-10-09T18:00:00.000Z" });
      expect(namesOf(paris)).toEqual([FINE_MOUSSE_NAME]);
      expect(visitOf(paris[0])).toEqual({ checkinCount: 1, lastCheckinAt: "2026-10-07T18:00:00.000Z" });
    });

    it.each(["visited=false", ""])("answers the same body as without the filter for %j", async (query) => {
      const baseline = await get(VENUES_PATH);

      const response = await getAs(ALICE_ID, query);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual(baseline.body);
      expect(response.body).toHaveLength(VENUE_COUNT);
    });

    it.each(["yes", "1", "TRUE"])("returns 400 for visited=%s", async (value) => {
      const response = await getAs(ALICE_ID, `visited=${value}`);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: VISITED_NOT_A_BOOLEAN_MESSAGE });
    });

    it("returns 400 for a bad zone before reading the visits and 401 without identity", async () => {
      const badZone = await getAs(ALICE_ID, `north=50&${VISITED}`);
      const anonymous = await request(app.getHttpServer()).get(`${VENUES_PATH}?${VISITED}`);

      expect(badZone.status).toBe(HttpStatus.BAD_REQUEST);
      expect(badZone.body).toEqual({ message: "north, south, east and west must be supplied together." });
      expect(anonymous.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(anonymous.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    });
  });

  describe("without identity", () => {
    it.each([
      VENUES_PATH,
      `${VENUES_PATH}/1`,
      `${VENUES_PATH}?north=1`,
      `${VENUES_PATH}/abc`,
      `${VENUES_PATH}/${UNKNOWN_VENUE_ID}`,
    ])("GET %s returns 401 before any validation or lookup", async (path) => {
      const response = await request(app.getHttpServer()).get(path);

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    });
  });
});
