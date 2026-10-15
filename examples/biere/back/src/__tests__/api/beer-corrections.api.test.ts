import { HttpStatus } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { UNIDENTIFIED_USER_MESSAGE } from "@/common/exceptions/exception-messages.constants";
import { ALICE_USER_ID, BOB_USER_ID, CAROL_USER_ID } from "@/database/seed.constants";
import { BeersRepository } from "@/modules/beers/beers.repository";
import type { BeerPageDto } from "@/modules/beers/dtos/beer-page.dto";
import { BeerCharacteristicEnum } from "@/modules/beers/enums/beer-characteristic.enum";
import { createTestApp } from "@/__tests__/support/test-app";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";

const BEERS_PATH = "/api/v1/beers";
const UNKNOWN_BEER_ID = 999_999;
const REASON_MAX_LENGTH = 200;
const QUOTA = 10;
const MILLISECONDS_PER_HOUR = 3_600_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/;
const ANY_MESSAGE = { message: expect.stringMatching(/\S/) };
const SEVEN_DAYS_MS = 7 * 24 * MILLISECONDS_PER_HOUR;

const correctionsPath = (beerId: number | string): string => `${BEERS_PATH}/${beerId}/corrections`;

describe("beer corrections API", () => {
  let app: INestApplication;
  let orvalId: number;
  let westmalleId: number;
  let bobBeerId: number;

  const query = <Row>(sql: string, parameters: unknown[] = []): Promise<Row[]> => app.get(DataSource).query<Row[]>(sql, parameters);

  const countCorrections = async (beerId: number): Promise<number> => {
    const [row] = await query<{ total: number }>("SELECT COUNT(*) AS total FROM beer_corrections WHERE beerId = ?", [beerId]);
    return row.total;
  };

  const findBeerId = async (name: string): Promise<number> => {
    const response = await request(app.getHttpServer())
      .get(BEERS_PATH)
      .query({ q: name })
      .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID));
    const [beer] = (response.body as BeerPageDto).items.filter((item) => item.name === name);
    return beer.id;
  };

  const post = (userId: number, beerId: number | string, body: unknown) =>
    request(app.getHttpServer()).post(correctionsPath(beerId)).set(USER_ID_HEADER_NAME, String(userId)).send(body as object);

  const list = (userId: number, beerId: number | string) =>
    request(app.getHttpServer()).get(correctionsPath(beerId)).set(USER_ID_HEADER_NAME, String(userId));

  const insertCorrections = async (userId: number, count: number, createdAt: Date): Promise<void> => {
    const repository = app.get(BeersRepository);
    for (let index = 0; index < count; index += 1) {
      await repository.createCorrection({
        beerId: westmalleId,
        characteristic: BeerCharacteristicEnum.SWEETNESS,
        proposedValue: "3",
        reason: "",
        proposedBy: userId,
        createdAt,
        closesAt: new Date(createdAt.getTime() + SEVEN_DAYS_MS),
      });
    }
  };

  beforeAll(async () => {
    app = await createTestApp();
    orvalId = await findBeerId("Orval");
    westmalleId = await findBeerId("Westmalle Tripel");
    const created = await request(app.getHttpServer())
      .post(BEERS_PATH)
      .set(USER_ID_HEADER_NAME, String(BOB_USER_ID))
      .send({ name: "Brune de Bob", breweryName: "Brasserie de Bob", country: "FR", styleId: 1, abv: 6 });
    expect(created.status).toBe(HttpStatus.CREATED);
    bobBeerId = created.body.id;
  });

  beforeEach(async () => {
    await query("DELETE FROM beer_corrections");
    await query("UPDATE beers SET ibu = NULL, ebc = NULL, abv = 7, aromas = '', formats = '' WHERE id IN (?, ?)", [orvalId, westmalleId]);
  });

  afterAll(async () => {
    await app.close();
  });

  it("AC1 opens Alice's proposal of an IBU, answers it in full and lists it for another user", async () => {
    const response = await post(ALICE_USER_ID, orvalId, { characteristic: "ibu", value: 35, reason: "Fiche du brasseur" });

    expect(response.status).toBe(HttpStatus.CREATED);
    expect(response.body).toStrictEqual({
      id: expect.any(Number),
      beerId: orvalId,
      beerName: "Orval",
      characteristic: "ibu",
      currentValue: null,
      proposedValue: 35,
      reason: "Fiche du brasseur",
      proposedBy: ALICE_USER_ID,
      proposedByName: "Alice",
      createdAt: expect.stringMatching(ISO_DATE),
      closesAt: expect.stringMatching(ISO_DATE),
      status: "open",
      resolvedAt: null,
      agreeCount: 1,
      disagreeCount: 0,
      myVote: null,
      isMine: true,
    });
    expect(new Date(response.body.closesAt).getTime() - new Date(response.body.createdAt).getTime()).toBe(SEVEN_DAYS_MS);
    expect(await countCorrections(orvalId)).toBe(1);

    const asBob = await list(BOB_USER_ID, orvalId);
    expect(asBob.status).toBe(HttpStatus.OK);
    expect(asBob.body).toStrictEqual([{ ...response.body, isMine: false }]);
    expect((await list(ALICE_USER_ID, orvalId)).body).toStrictEqual([response.body]);
  });

  it("AC1 shows the current value of the beer next to the proposed one, a list for the aromas", async () => {
    await query("UPDATE beers SET ibu = 20, aromas = 'fruity,hoppy' WHERE id = ?", [orvalId]);

    const ibu = await post(ALICE_USER_ID, orvalId, { characteristic: "ibu", value: 35 });
    const aromas = await post(ALICE_USER_ID, orvalId, { characteristic: "aromas", value: ["citrus"] });

    expect(ibu.body).toMatchObject({ currentValue: 20, proposedValue: 35, reason: "" });
    expect(aromas.body).toMatchObject({ currentValue: ["fruity", "hoppy"], proposedValue: ["citrus"] });
  });

  it("AC1 reads an empty list of aromas as a current value null, and records Carol as the proposer", async () => {
    const aromas = await post(CAROL_USER_ID, orvalId, { characteristic: "aromas", value: ["citrus"] });

    expect(aromas.status).toBe(HttpStatus.CREATED);
    expect(aromas.body).toMatchObject({
      currentValue: null,
      proposedValue: ["citrus"],
      proposedBy: CAROL_USER_ID,
      proposedByName: "Carol",
      isMine: true,
    });
    const [row] = await query<{ proposedBy: number }>("SELECT proposedBy FROM beer_corrections WHERE id = ?", [aromas.body.id]);
    expect(row.proposedBy).toBe(CAROL_USER_ID);
  });

  it("AC1 lists the open corrections by closing date then id, and an empty list for a beer without", async () => {
    const first = await post(ALICE_USER_ID, orvalId, { characteristic: "ibu", value: 35 });
    const second = await post(ALICE_USER_ID, orvalId, { characteristic: "ebc", value: 20 });
    await post(CAROL_USER_ID, westmalleId, { characteristic: "body", value: 3 });

    const listed = await list(BOB_USER_ID, orvalId);

    expect(listed.status).toBe(HttpStatus.OK);
    expect(listed.body.map((correction: { id: number }) => correction.id)).toEqual([first.body.id, second.body.id]);
    expect(await list(BOB_USER_ID, bobBeerId)).toMatchObject({ status: HttpStatus.OK, body: [] });
  });

  it("AC2 answers 403 to Bob on the beer he added, stores nothing, and lets Alice propose", async () => {
    const refused = await post(BOB_USER_ID, bobBeerId, { characteristic: "ibu", value: 35 });

    expect(refused.status).toBe(HttpStatus.FORBIDDEN);
    expect(refused.body).toEqual({ message: "Only other users can correct a beer they added." });
    expect(await countCorrections(bobBeerId)).toBe(0);
    const accepted = await post(ALICE_USER_ID, bobBeerId, { characteristic: "ibu", value: 35 });
    expect(accepted.status).toBe(HttpStatus.CREATED);
    expect(accepted.body).toMatchObject({ beerName: "Brune de Bob", isMine: true });
  });

  it("AC2 answers 403 before the identical-value 400 when Bob proposes the current value of his own beer", async () => {
    const response = await post(BOB_USER_ID, bobBeerId, { characteristic: "abv", value: 6 });

    expect(response.status).toBe(HttpStatus.FORBIDDEN);
  });

  it("AC3 answers 409 to Carol on an open IBU, accepts an EBC on the same beer, and stores only the accepted ones", async () => {
    expect((await post(ALICE_USER_ID, orvalId, { characteristic: "ibu", value: 35 })).status).toBe(HttpStatus.CREATED);

    const conflict = await post(CAROL_USER_ID, orvalId, { characteristic: "ibu", value: 40 });
    const other = await post(CAROL_USER_ID, orvalId, { characteristic: "ebc", value: 20 });

    expect(conflict.status).toBe(HttpStatus.CONFLICT);
    expect(conflict.body).toEqual({ message: "A correction of ibu is already open for beer " + orvalId + "." });
    expect(other.status).toBe(HttpStatus.CREATED);
    expect(await countCorrections(orvalId)).toBe(2);
  });

  it.each([
    ["the same degree", { characteristic: "abv", value: 7 }],
    ["a degree above 20", { characteristic: "abv", value: 20.5 }],
    ["a negative degree", { characteristic: "abv", value: -1 }],
    ["two decimals on the degree", { characteristic: "abv", value: 7.25 }],
    ["a list for the degree", { characteristic: "abv", value: [7] }],
    ["a number for the aromas", { characteristic: "aromas", value: 5 }],
    ["an empty list of formats", { characteristic: "formats", value: [] }],
    ["six aromas", { characteristic: "aromas", value: ["fruity", "citrus", "hoppy", "floral", "spicy", "caramel"] }],
    ["a duplicated aroma", { characteristic: "aromas", value: ["fruity", "fruity"] }],
    ["an IBU above 120", { characteristic: "ibu", value: 121 }],
    ["an EBC below 2", { characteristic: "ebc", value: 1 }],
    ["a body of 0", { characteristic: "body", value: 0 }],
    ["a decimal acidity", { characteristic: "acidity", value: 2.5 }],
    ["a reason of 201 characters", { characteristic: "ibu", value: 35, reason: "x".repeat(REASON_MAX_LENGTH + 1) }],
    ["a reason of 201 characters once the spaces are trimmed", { characteristic: "ibu", value: 35, reason: ` ${"x".repeat(REASON_MAX_LENGTH + 1)} ` }],
    ["a reason that is not a text", { characteristic: "ibu", value: 35, reason: 5 }],
    ["an unknown characteristic", { characteristic: "color", value: 3 }],
    ["a missing value", { characteristic: "ibu" }],
    ["a missing characteristic", { value: 35 }],
    ["an unexpected field", { characteristic: "ibu", value: 35, proposedBy: BOB_USER_ID }],
  ])("AC4 answers 400 for %s and stores nothing", async (_label, body) => {
    const response = await post(ALICE_USER_ID, orvalId, body);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body).toEqual(ANY_MESSAGE);
    expect(await countCorrections(orvalId)).toBe(0);
  });

  it("AC4 names the identical value in the 400", async () => {
    const response = await post(ALICE_USER_ID, orvalId, { characteristic: "abv", value: 7 });

    expect(response.body).toEqual({ message: "abv is already 7." });
  });

  it("AC4 accepts the values at their bounds and a reason of 200 characters padded with spaces, stored trimmed", async () => {
    const reason = "x".repeat(REASON_MAX_LENGTH);
    const accepted = await post(ALICE_USER_ID, orvalId, { characteristic: "abv", value: 20, reason: `  ${reason}\r\n` });
    const smallest = await post(CAROL_USER_ID, orvalId, { characteristic: "ibu", value: 0 });

    expect(accepted.status).toBe(HttpStatus.CREATED);
    expect(accepted.body).toMatchObject({ proposedValue: 20, reason });
    expect(smallest.status).toBe(HttpStatus.CREATED);
  });

  it("AC4 answers 400 for the identical set of aromas whatever their order, and accepts another set", async () => {
    await query("UPDATE beers SET aromas = 'fruity,hoppy' WHERE id = ?", [orvalId]);

    expect((await post(ALICE_USER_ID, orvalId, { characteristic: "aromas", value: ["hoppy", "fruity"] })).status).toBe(HttpStatus.BAD_REQUEST);
    expect((await post(ALICE_USER_ID, orvalId, { characteristic: "aromas", value: ["hoppy"] })).status).toBe(HttpStatus.CREATED);
  });

  it("AC4 answers 400 before 404 when the value is invalid and the beer unknown", async () => {
    const response = await post(ALICE_USER_ID, UNKNOWN_BEER_ID, { characteristic: "ibu", value: 500 });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it("AC5 answers 429 to the eleventh proposal in 24 hours, and stores nothing more", async () => {
    await insertCorrections(CAROL_USER_ID, QUOTA, new Date());

    const response = await post(CAROL_USER_ID, orvalId, { characteristic: "ibu", value: 35 });

    expect(response.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(response.body).toEqual({ message: expect.stringContaining(String(QUOTA)) });
    expect(await countCorrections(orvalId)).toBe(0);
  });

  it("AC5 accepts the tenth proposal, and does not count the ones older than 24 hours nor those of other users", async () => {
    await insertCorrections(CAROL_USER_ID, QUOTA - 1, new Date());
    await insertCorrections(CAROL_USER_ID, QUOTA, new Date(Date.now() - 25 * MILLISECONDS_PER_HOUR));
    await insertCorrections(ALICE_USER_ID, QUOTA, new Date());

    expect((await post(CAROL_USER_ID, orvalId, { characteristic: "ibu", value: 35 })).status).toBe(HttpStatus.CREATED);
    expect((await post(BOB_USER_ID, orvalId, { characteristic: "ebc", value: 20 })).status).toBe(HttpStatus.CREATED);
  });

  it("AC5 answers 400 for the identical value before 429, and 429 before 409", async () => {
    await insertCorrections(CAROL_USER_ID, QUOTA, new Date());
    await post(ALICE_USER_ID, orvalId, { characteristic: "ibu", value: 35 });

    const identical = await post(CAROL_USER_ID, orvalId, { characteristic: "abv", value: 7 });
    const conflicting = await post(CAROL_USER_ID, orvalId, { characteristic: "ibu", value: 40 });

    expect(identical.status).toBe(HttpStatus.BAD_REQUEST);
    expect(conflicting.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it("AC6 answers 404 to the reading and the proposal on an unknown beer", async () => {
    const reading = await list(ALICE_USER_ID, UNKNOWN_BEER_ID);
    const proposal = await post(ALICE_USER_ID, UNKNOWN_BEER_ID, { characteristic: "ibu", value: 35 });

    expect(reading.status).toBe(HttpStatus.NOT_FOUND);
    expect(reading.body).toEqual({ message: `Beer ${UNKNOWN_BEER_ID} not found.` });
    expect(proposal.status).toBe(HttpStatus.NOT_FOUND);
    expect(proposal.body).toEqual({ message: `Beer ${UNKNOWN_BEER_ID} not found.` });
  });

  it("AC6 answers 401 without identity on both routes, before any other check", async () => {
    const reading = await request(app.getHttpServer()).get(correctionsPath(orvalId));
    const proposal = await request(app.getHttpServer()).post(correctionsPath(UNKNOWN_BEER_ID)).send({ characteristic: "color" });

    expect(reading.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(reading.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    expect(proposal.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(proposal.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it("AC6 answers 400 for a beer id that is not a number", async () => {
    expect((await list(ALICE_USER_ID, "abc")).status).toBe(HttpStatus.BAD_REQUEST);
  });

  it("AC7 gives the reason back as it was written, HTML included, on the proposal and on the list", async () => {
    const reason = "<script>alert(1)</script> <b>gras</b> & \"quotes\"";

    const created = await post(ALICE_USER_ID, orvalId, { characteristic: "ibu", value: 35, reason });
    const listed = await list(BOB_USER_ID, orvalId);

    expect(created.body.reason).toBe(reason);
    expect(listed.body[0].reason).toBe(reason);
  });
});
