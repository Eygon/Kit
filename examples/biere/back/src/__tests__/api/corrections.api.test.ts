import { HttpStatus } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { UNIDENTIFIED_USER_MESSAGE } from "@/common/exceptions/exception-messages.constants";
import { ALICE_USER_ID, BOB_USER_ID, CAROL_USER_ID } from "@/database/seed.constants";
import { BeersRepository } from "@/modules/beers/beers.repository";
import type { BeerPageDto } from "@/modules/beers/dtos/beer-page.dto";
import type { BeerDetailDto } from "@/modules/beers/dtos/beer-detail.dto";
import { BeerCharacteristicEnum } from "@/modules/beers/enums/beer-characteristic.enum";
import { CorrectionStatusEnum } from "@/modules/beers/enums/correction-status.enum";
import { CorrectionVoteSenseEnum } from "@/modules/beers/enums/correction-vote-sense.enum";
import { createTestApp } from "@/__tests__/support/test-app";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";

const BEERS_PATH = "/api/v1/beers";
const CORRECTIONS_PATH = "/api/v1/corrections";
const UNKNOWN_CORRECTION_ID = 999_999;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/;
const ANY_MESSAGE = { message: expect.stringMatching(/\S/) };
const MILLISECONDS_PER_DAY = 86_400_000;
const MILLISECONDS_PER_SECOND = 1000;
const CREATED_AT = new Date(Math.floor(Date.now() / MILLISECONDS_PER_SECOND) * MILLISECONDS_PER_SECOND);
const SEVENTH_AND_EIGHTH_VOTERS = [11, 12];
const RECENTLY_CLOSED_LIMIT = 10;
const CLOSED_COUNT = 12;
const MILLISECONDS_PER_MINUTE = 60_000;
const LATER_READ_DELAY_MS = 25;

const votePath = (id: number | string): string => `${CORRECTIONS_PATH}/${id}/vote`;

const closesIn = (days: number): Date => new Date(CREATED_AT.getTime() + days * MILLISECONDS_PER_DAY);

describe("corrections API", () => {
  let app: INestApplication;
  let orvalId: number;
  let westmalleId: number;
  let carolBeerId: number;

  const query = <Row>(sql: string, parameters: unknown[] = []): Promise<Row[]> => app.get(DataSource).query<Row[]>(sql, parameters);

  const countVotes = async (): Promise<number> => {
    const [row] = await query<{ total: number }>("SELECT COUNT(*) AS total FROM beer_correction_votes");
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

  const propose = async (userId: number, beerId: number, body: object): Promise<number> => {
    const response = await request(app.getHttpServer())
      .post(`${BEERS_PATH}/${beerId}/corrections`)
      .set(USER_ID_HEADER_NAME, String(userId))
      .send(body);
    expect(response.status).toBe(HttpStatus.CREATED);
    return response.body.id;
  };

  const vote = (userId: number, id: number | string, body: unknown) =>
    request(app.getHttpServer()).put(votePath(id)).set(USER_ID_HEADER_NAME, String(userId)).send(body as object);

  const board = (userId: number) => request(app.getHttpServer()).get(CORRECTIONS_PATH).set(USER_ID_HEADER_NAME, String(userId));

  const insertCorrection = async (
    proposedBy: number,
    beerId: number,
    characteristic: BeerCharacteristicEnum,
    proposedValue: string,
    closesAt: Date,
  ): Promise<number> => {
    const record = await app.get(BeersRepository).createCorrection({
      beerId,
      characteristic,
      proposedValue,
      reason: "",
      proposedBy,
      createdAt: CREATED_AT,
      closesAt,
    });
    return record.id;
  };

  const addVote = (correctionId: number, userId: number, sense: CorrectionVoteSenseEnum): Promise<void> =>
    app.get(BeersRepository).upsertCorrectionVote({ correctionId, userId, sense, votedAt: CREATED_AT });

  const insertDue = (proposedBy: number, beerId: number, characteristic: BeerCharacteristicEnum, proposedValue: string): Promise<number> =>
    insertCorrection(proposedBy, beerId, characteristic, proposedValue, closesIn(-1));

  const readBeer = async (userId: number, beerId: number): Promise<BeerDetailDto> => {
    const response = await request(app.getHttpServer()).get(`${BEERS_PATH}/${beerId}`).set(USER_ID_HEADER_NAME, String(userId));
    expect(response.status).toBe(HttpStatus.OK);
    return response.body as BeerDetailDto;
  };

  const correctionRow = async (id: number) => {
    const [row] = await query<{ status: string; resolvedAt: string | null; previousValue: string | null }>(
      "SELECT status, resolvedAt, previousValue FROM beer_corrections WHERE id = ?",
      [id],
    );
    return row;
  };

  const storedIbu = async (beerId: number): Promise<number | null> => {
    const [row] = await query<{ ibu: number | null }>("SELECT ibu FROM beers WHERE id = ?", [beerId]);
    return row.ibu;
  };

  beforeAll(async () => {
    app = await createTestApp();
    orvalId = await findBeerId("Orval");
    westmalleId = await findBeerId("Westmalle Tripel");
    const created = await request(app.getHttpServer())
      .post(BEERS_PATH)
      .set(USER_ID_HEADER_NAME, String(CAROL_USER_ID))
      .send({ name: "Blonde de Carol", breweryName: "Brasserie de Carol", country: "FR", styleId: 1, abv: 5 });
    expect(created.status).toBe(HttpStatus.CREATED);
    carolBeerId = created.body.id;
  });

  beforeEach(async () => {
    await query("DELETE FROM beer_correction_votes");
    await query("DELETE FROM beer_corrections");
    await query("UPDATE beers SET ibu = NULL, ebc = NULL, abv = 7, aromas = '', formats = '' WHERE id IN (?, ?)", [orvalId, westmalleId]);
  });

  afterAll(async () => {
    await app.close();
  });

  it("AC1 adds Bob's agreement to Alice's proposal, then turns it into a disagreement without a second vote", async () => {
    const id = await propose(ALICE_USER_ID, orvalId, { characteristic: "ibu", value: 35, reason: "Fiche du brasseur" });

    const agreed = await vote(BOB_USER_ID, id, { sense: "agree" });

    expect(agreed.status).toBe(HttpStatus.OK);
    expect(agreed.body).toStrictEqual({
      id,
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
      agreeCount: 2,
      disagreeCount: 0,
      myVote: "agree",
      isMine: false,
    });
    expect(await countVotes()).toBe(1);

    const changed = await vote(BOB_USER_ID, id, { sense: "disagree" });

    expect(changed.status).toBe(HttpStatus.OK);
    expect(changed.body).toStrictEqual({ ...agreed.body, agreeCount: 1, disagreeCount: 1, myVote: "disagree" });
    expect(await countVotes()).toBe(1);
  });

  it("AC1 shows the counters to another voter who has not voted, and keeps each user's own vote", async () => {
    const id = await propose(ALICE_USER_ID, orvalId, { characteristic: "ibu", value: 35 });
    expect((await vote(BOB_USER_ID, id, { sense: "agree" })).status).toBe(HttpStatus.OK);

    const carol = await board(CAROL_USER_ID);
    const carolVote = await vote(CAROL_USER_ID, id, { sense: "disagree" });
    const bob = await board(BOB_USER_ID);

    expect(carol.body.open).toHaveLength(1);
    expect(carol.body.open[0]).toMatchObject({ id, agreeCount: 2, disagreeCount: 0, myVote: null });
    expect(carolVote.body).toMatchObject({ agreeCount: 2, disagreeCount: 1, myVote: "disagree" });
    expect(bob.body.open[0]).toMatchObject({ agreeCount: 2, disagreeCount: 1, myVote: "agree" });
    expect(await countVotes()).toBe(2);
  });

  it("AC1 reflects the votes in the corrections of the beer", async () => {
    const id = await propose(ALICE_USER_ID, orvalId, { characteristic: "ibu", value: 35 });
    await vote(BOB_USER_ID, id, { sense: "agree" });

    const listed = await request(app.getHttpServer())
      .get(`${BEERS_PATH}/${orvalId}/corrections`)
      .set(USER_ID_HEADER_NAME, String(BOB_USER_ID));

    expect(listed.status).toBe(HttpStatus.OK);
    expect(listed.body).toHaveLength(1);
    expect(listed.body[0]).toMatchObject({ id, agreeCount: 2, disagreeCount: 0, myVote: "agree", isMine: false });
  });

  it("AC2 answers 403 to the proposer in both senses and stores no vote", async () => {
    const id = await propose(ALICE_USER_ID, orvalId, { characteristic: "ibu", value: 35 });

    const agree = await vote(ALICE_USER_ID, id, { sense: "agree" });
    const disagree = await vote(ALICE_USER_ID, id, { sense: "disagree" });

    expect(agree.status).toBe(HttpStatus.FORBIDDEN);
    expect(agree.body).toStrictEqual({ message: "You cannot vote on your own correction." });
    expect(disagree.status).toBe(HttpStatus.FORBIDDEN);
    expect(await countVotes()).toBe(0);
  });

  it("AC3 counts the vote of the author of the community beer on Bob's proposal", async () => {
    const id = await propose(BOB_USER_ID, carolBeerId, { characteristic: "ibu", value: 30 });

    const response = await vote(CAROL_USER_ID, id, { sense: "agree" });

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toMatchObject({
      id,
      beerId: carolBeerId,
      beerName: "Blonde de Carol",
      proposedBy: BOB_USER_ID,
      agreeCount: 2,
      disagreeCount: 0,
      myVote: "agree",
      isMine: false,
    });
    expect(await countVotes()).toBe(1);
  });

  it("AC4 sorts the open corrections by the nearest closing date, ties by id, each one complete", async () => {
    await query("UPDATE beers SET ibu = 20, aromas = 'fruity,hoppy' WHERE id = ?", [orvalId]);
    const late = await insertCorrection(ALICE_USER_ID, orvalId, BeerCharacteristicEnum.IBU, "35", closesIn(6));
    const early = await insertCorrection(CAROL_USER_ID, westmalleId, BeerCharacteristicEnum.BODY, "3", closesIn(2));
    const tieFirst = await insertCorrection(CAROL_USER_ID, orvalId, BeerCharacteristicEnum.AROMAS, '["citrus"]', closesIn(4));
    const tieSecond = await insertCorrection(ALICE_USER_ID, westmalleId, BeerCharacteristicEnum.EBC, "20", closesIn(4));
    await vote(BOB_USER_ID, late, { sense: "disagree" });

    const response = await board(BOB_USER_ID);

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body.open.map((correction: { id: number }) => correction.id)).toEqual([early, tieFirst, tieSecond, late]);
    expect(response.body.open[0]).toStrictEqual({
      id: early,
      beerId: westmalleId,
      beerName: "Westmalle Tripel",
      characteristic: "body",
      currentValue: null,
      proposedValue: 3,
      reason: "",
      proposedBy: CAROL_USER_ID,
      proposedByName: "Carol",
      createdAt: CREATED_AT.toISOString(),
      closesAt: closesIn(2).toISOString(),
      status: "open",
      resolvedAt: null,
      agreeCount: 1,
      disagreeCount: 0,
      myVote: null,
      isMine: false,
    });
    expect(response.body.open[1]).toStrictEqual({
      id: tieFirst,
      beerId: orvalId,
      beerName: "Orval",
      characteristic: "aromas",
      currentValue: ["fruity", "hoppy"],
      proposedValue: ["citrus"],
      reason: "",
      proposedBy: CAROL_USER_ID,
      proposedByName: "Carol",
      createdAt: CREATED_AT.toISOString(),
      closesAt: closesIn(4).toISOString(),
      status: "open",
      resolvedAt: null,
      agreeCount: 1,
      disagreeCount: 0,
      myVote: null,
      isMine: false,
    });
    expect(response.body.open[2]).toStrictEqual({
      id: tieSecond,
      beerId: westmalleId,
      beerName: "Westmalle Tripel",
      characteristic: "ebc",
      currentValue: null,
      proposedValue: 20,
      reason: "",
      proposedBy: ALICE_USER_ID,
      proposedByName: "Alice",
      createdAt: CREATED_AT.toISOString(),
      closesAt: closesIn(4).toISOString(),
      status: "open",
      resolvedAt: null,
      agreeCount: 1,
      disagreeCount: 0,
      myVote: null,
      isMine: false,
    });
    expect(response.body.open[3]).toStrictEqual({
      id: late,
      beerId: orvalId,
      beerName: "Orval",
      characteristic: "ibu",
      currentValue: 20,
      proposedValue: 35,
      reason: "",
      proposedBy: ALICE_USER_ID,
      proposedByName: "Alice",
      createdAt: CREATED_AT.toISOString(),
      closesAt: closesIn(6).toISOString(),
      status: "open",
      resolvedAt: null,
      agreeCount: 1,
      disagreeCount: 1,
      myVote: "disagree",
      isMine: false,
    });
    expect(response.body.recentlyClosed).toEqual([]);
  });

  it("AC4 answers an empty board without any correction", async () => {
    const response = await board(CAROL_USER_ID);

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toStrictEqual({ open: [], recentlyClosed: [], pendingCount: 0 });
  });

  it("AC5 counts the pending corrections per user: one for Alice who voted on one of Bob's two, none for Bob", async () => {
    const first = await propose(BOB_USER_ID, orvalId, { characteristic: "ibu", value: 35 });
    await propose(BOB_USER_ID, westmalleId, { characteristic: "ebc", value: 20 });
    expect((await vote(ALICE_USER_ID, first, { sense: "agree" })).status).toBe(HttpStatus.OK);

    const alice = await board(ALICE_USER_ID);
    const bob = await board(BOB_USER_ID);
    const carol = await board(CAROL_USER_ID);

    expect(alice.body.open).toHaveLength(2);
    expect(alice.body.pendingCount).toBe(1);
    expect(bob.body.open).toHaveLength(2);
    expect(bob.body.pendingCount).toBe(0);
    expect(carol.body.pendingCount).toBe(2);
  });

  it("AC5 lowers the pending count with each vote, whatever its sense", async () => {
    const first = await propose(BOB_USER_ID, orvalId, { characteristic: "ibu", value: 35 });
    const second = await propose(BOB_USER_ID, westmalleId, { characteristic: "ebc", value: 20 });

    expect((await board(ALICE_USER_ID)).body.pendingCount).toBe(2);
    await vote(ALICE_USER_ID, first, { sense: "disagree" });
    expect((await board(ALICE_USER_ID)).body.pendingCount).toBe(1);
    await vote(ALICE_USER_ID, second, { sense: "agree" });
    expect((await board(ALICE_USER_ID)).body.pendingCount).toBe(0);
  });

  it("AC6 answers 404 for an unknown correction and stores no vote", async () => {
    const response = await vote(BOB_USER_ID, UNKNOWN_CORRECTION_ID, { sense: "agree" });

    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body).toStrictEqual({ message: `Correction ${UNKNOWN_CORRECTION_ID} not found.` });
    expect(await countVotes()).toBe(0);
  });

  it.each([
    ["an unknown sense", { sense: "maybe" }],
    ["an empty sense", { sense: "" }],
    ["a numeric sense", { sense: 1 }],
    ["a missing sense", {}],
    ["an extra field", { sense: "agree", weight: 2 }],
  ])("AC6 answers 400 for %s and stores no vote", async (_label, body) => {
    const id = await propose(ALICE_USER_ID, orvalId, { characteristic: "ibu", value: 35 });

    const response = await vote(BOB_USER_ID, id, body);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body).toMatchObject(ANY_MESSAGE);
    expect(await countVotes()).toBe(0);
  });

  it("AC6 answers 400 before 403 when the proposer sends an unknown sense on their own correction", async () => {
    const id = await propose(ALICE_USER_ID, orvalId, { characteristic: "ibu", value: 35 });

    const response = await vote(ALICE_USER_ID, id, { sense: "maybe" });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body).toEqual(ANY_MESSAGE);
    expect(await countVotes()).toBe(0);
  });

  it("AC6 answers 400 before 404 when the sense is unknown and the correction too", async () => {
    const response = await vote(BOB_USER_ID, UNKNOWN_CORRECTION_ID, { sense: "maybe" });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it("AC6 answers 400 for an id that is not a number", async () => {
    const response = await vote(BOB_USER_ID, "abc", { sense: "agree" });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body).toMatchObject(ANY_MESSAGE);
  });

  describe("resolution of due corrections", () => {
    beforeEach(async () => {
      await query("UPDATE beers SET ibu = 20 WHERE id = ?", [orvalId]);
    });

    it("AC1 validates a due proposal with two agreements and one disagreement: the beer is read with the new value and its bitterness level", async () => {
      const id = await insertDue(ALICE_USER_ID, orvalId, BeerCharacteristicEnum.IBU, "35");
      await addVote(id, BOB_USER_ID, CorrectionVoteSenseEnum.AGREE);
      await addVote(id, CAROL_USER_ID, CorrectionVoteSenseEnum.DISAGREE);
      expect(await storedIbu(orvalId)).toBe(20);

      const beer = await readBeer(BOB_USER_ID, orvalId);

      expect(beer).toMatchObject({ id: orvalId, ibu: 35, bitternessLevel: 3 });
      expect(await storedIbu(orvalId)).toBe(35);
      expect(await correctionRow(id)).toMatchObject({ status: "accepted", previousValue: "20", resolvedAt: expect.any(String) });
      const closed = (await board(BOB_USER_ID)).body.recentlyClosed;
      expect(closed).toStrictEqual([
        {
          id,
          beerId: orvalId,
          beerName: "Orval",
          characteristic: "ibu",
          currentValue: 20,
          proposedValue: 35,
          reason: "",
          proposedBy: ALICE_USER_ID,
          proposedByName: "Alice",
          createdAt: CREATED_AT.toISOString(),
          closesAt: closesIn(-1).toISOString(),
          status: "accepted",
          resolvedAt: expect.stringMatching(ISO_DATE),
          agreeCount: 2,
          disagreeCount: 1,
          myVote: "agree",
          isMine: false,
        },
      ]);
      expect((await board(BOB_USER_ID)).body.open).toEqual([]);
    });

    it("AC1 applies a validated list value and keeps the previous list", async () => {
      await query("UPDATE beers SET aromas = 'fruity,hoppy' WHERE id = ?", [orvalId]);
      const id = await insertDue(CAROL_USER_ID, orvalId, BeerCharacteristicEnum.AROMAS, '["citrus"]');
      await addVote(id, BOB_USER_ID, CorrectionVoteSenseEnum.AGREE);

      const beer = await readBeer(ALICE_USER_ID, orvalId);

      expect(beer.aromas).toEqual(["citrus"]);
      expect(await correctionRow(id)).toMatchObject({ status: "accepted", previousValue: '["fruity","hoppy"]' });
      expect((await board(ALICE_USER_ID)).body.recentlyClosed[0]).toMatchObject({ currentValue: ["fruity", "hoppy"], proposedValue: ["citrus"] });
    });

    it("AC2 refuses a due proposal with the proposer alone and no disagreement: the beer does not change", async () => {
      const id = await insertDue(ALICE_USER_ID, orvalId, BeerCharacteristicEnum.IBU, "35");

      const response = await board(BOB_USER_ID);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.open).toEqual([]);
      expect(response.body.recentlyClosed).toHaveLength(1);
      expect(response.body.recentlyClosed[0]).toMatchObject({ id, status: "rejected", agreeCount: 1, disagreeCount: 0, currentValue: 20 });
      expect(await storedIbu(orvalId)).toBe(20);
      expect(await correctionRow(id)).toMatchObject({ status: "rejected", previousValue: "20" });
      expect((await readBeer(BOB_USER_ID, orvalId)).ibu).toBe(20);
    });

    it("AC2 refuses a due proposal with two agreements and two disagreements: the beer does not change", async () => {
      const id = await insertDue(ALICE_USER_ID, orvalId, BeerCharacteristicEnum.IBU, "35");
      await addVote(id, BOB_USER_ID, CorrectionVoteSenseEnum.AGREE);
      await addVote(id, CAROL_USER_ID, CorrectionVoteSenseEnum.DISAGREE);
      await addVote(id, SEVENTH_AND_EIGHTH_VOTERS[0], CorrectionVoteSenseEnum.DISAGREE);

      const response = await board(BOB_USER_ID);

      expect(response.body.recentlyClosed[0]).toMatchObject({ id, status: "rejected", agreeCount: 2, disagreeCount: 2, myVote: "agree" });
      expect(await storedIbu(orvalId)).toBe(20);
    });

    it("AC2 validates the proposal at the quorum of two agreements against none", async () => {
      const id = await insertDue(ALICE_USER_ID, orvalId, BeerCharacteristicEnum.IBU, "35");
      await addVote(id, BOB_USER_ID, CorrectionVoteSenseEnum.AGREE);

      const response = await board(CAROL_USER_ID);

      expect(response.body.recentlyClosed[0]).toMatchObject({ id, status: "accepted", agreeCount: 2, disagreeCount: 0 });
      expect(await storedIbu(orvalId)).toBe(35);
    });

    it("AC3 applies the value once and closes the proposal once when two reads arrive at the same time", async () => {
      const id = await insertDue(ALICE_USER_ID, orvalId, BeerCharacteristicEnum.IBU, "35");
      await addVote(id, BOB_USER_ID, CorrectionVoteSenseEnum.AGREE);

      const responses = await Promise.all([
        request(app.getHttpServer()).get(`${BEERS_PATH}/${orvalId}`).set(USER_ID_HEADER_NAME, String(BOB_USER_ID)),
        request(app.getHttpServer()).get(`${BEERS_PATH}/${orvalId}`).set(USER_ID_HEADER_NAME, String(CAROL_USER_ID)),
        board(ALICE_USER_ID),
      ]);

      expect(responses.map((response) => response.status)).toEqual([HttpStatus.OK, HttpStatus.OK, HttpStatus.OK]);
      expect(responses[0].body.ibu).toBe(35);
      expect(responses[1].body.ibu).toBe(35);
      expect(await storedIbu(orvalId)).toBe(35);
      expect(await correctionRow(id)).toMatchObject({ status: "accepted", previousValue: "20" });
      const [count] = await query<{ total: number }>("SELECT COUNT(*) AS total FROM beer_corrections WHERE status = 'accepted'");
      expect(count.total).toBe(1);
    });

    it("AC3 does not move the closing instant of a closed proposal on a later read", async () => {
      const id = await insertDue(ALICE_USER_ID, orvalId, BeerCharacteristicEnum.IBU, "35");
      await addVote(id, BOB_USER_ID, CorrectionVoteSenseEnum.AGREE);
      await readBeer(BOB_USER_ID, orvalId);
      const closedAt = (await correctionRow(id)).resolvedAt;
      expect(closedAt).toEqual(expect.any(String));

      await new Promise((resolve) => setTimeout(resolve, LATER_READ_DELAY_MS));
      await readBeer(CAROL_USER_ID, orvalId);
      await board(ALICE_USER_ID);

      expect((await correctionRow(id)).resolvedAt).toBe(closedAt);
      expect(await storedIbu(orvalId)).toBe(35);
    });

    it("AC4 closes a due proposal before the vote, answers 409 and stores no vote", async () => {
      const id = await insertDue(ALICE_USER_ID, orvalId, BeerCharacteristicEnum.IBU, "35");
      await addVote(id, BOB_USER_ID, CorrectionVoteSenseEnum.AGREE);
      const votesBefore = await countVotes();

      const response = await vote(CAROL_USER_ID, id, { sense: "disagree" });

      expect(response.status).toBe(HttpStatus.CONFLICT);
      expect(response.body).toStrictEqual({ message: `Correction ${id} is closed.` });
      expect(await countVotes()).toBe(votesBefore);
      expect(await correctionRow(id)).toMatchObject({ status: "accepted" });
      expect(await storedIbu(orvalId)).toBe(35);
    });

    it("AC4 answers 409 to a vote on a proposal that was closed earlier", async () => {
      const id = await insertDue(ALICE_USER_ID, orvalId, BeerCharacteristicEnum.IBU, "35");
      await board(BOB_USER_ID);

      const response = await vote(BOB_USER_ID, id, { sense: "agree" });

      expect(response.status).toBe(HttpStatus.CONFLICT);
      expect(await countVotes()).toBe(0);
    });

    it("AC4 answers 403 before 409 to the proposer of a closed proposal", async () => {
      const id = await insertDue(ALICE_USER_ID, orvalId, BeerCharacteristicEnum.IBU, "35");

      const response = await vote(ALICE_USER_ID, id, { sense: "agree" });

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });

    it("AC5 answers the ten latest closed proposals, the most recent first, ties by id descending, each with its status", async () => {
      const ids: number[] = [];
      for (let index = 0; index < CLOSED_COUNT; index += 1) {
        const id = await insertCorrection(ALICE_USER_ID, orvalId, BeerCharacteristicEnum.IBU, String(30 + index), closesIn(-1));
        const status = index % 2 === 0 ? CorrectionStatusEnum.ACCEPTED : CorrectionStatusEnum.REJECTED;
        const resolvedAt = new Date(CREATED_AT.getTime() + Math.min(index, CLOSED_COUNT - 2) * MILLISECONDS_PER_MINUTE);
        await app.get(BeersRepository).resolveCorrection(id, status, "20", resolvedAt, orvalId, null);
        ids.push(id);
      }

      const response = await board(BOB_USER_ID);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.recentlyClosed).toHaveLength(RECENTLY_CLOSED_LIMIT);
      expect(response.body.recentlyClosed.map((correction: { id: number }) => correction.id)).toEqual([
        ids[11],
        ids[10],
        ids[9],
        ids[8],
        ids[7],
        ids[6],
        ids[5],
        ids[4],
        ids[3],
        ids[2],
      ]);
      expect(response.body.recentlyClosed.map((correction: { status: string }) => correction.status)).toEqual([
        "rejected",
        "accepted",
        "rejected",
        "accepted",
        "rejected",
        "accepted",
        "rejected",
        "accepted",
        "rejected",
        "accepted",
      ]);
      expect(response.body.open).toEqual([]);
      expect(response.body.pendingCount).toBe(0);
    });

    it("E3 validates one characteristic while the proposal on another characteristic of the same beer stays open and untouched", async () => {
      const due = await insertDue(ALICE_USER_ID, orvalId, BeerCharacteristicEnum.IBU, "35");
      await addVote(due, BOB_USER_ID, CorrectionVoteSenseEnum.AGREE);
      const pending = await insertCorrection(CAROL_USER_ID, orvalId, BeerCharacteristicEnum.EBC, "20", closesIn(3));

      const beer = await readBeer(BOB_USER_ID, orvalId);

      expect(beer).toMatchObject({ ibu: 35, ebc: null });
      expect(await correctionRow(due)).toMatchObject({ status: "accepted" });
      expect(await correctionRow(pending)).toMatchObject({ status: "open", resolvedAt: null, previousValue: null });
      const response = await board(BOB_USER_ID);
      expect(response.body.open.map((correction: { id: number }) => correction.id)).toEqual([pending]);
      expect(response.body.recentlyClosed.map((correction: { id: number }) => correction.id)).toEqual([due]);
    });

    it("AC6 opens a new proposal for a characteristic already corrected by a vote", async () => {
      const closed = await insertDue(ALICE_USER_ID, orvalId, BeerCharacteristicEnum.IBU, "35");
      await addVote(closed, BOB_USER_ID, CorrectionVoteSenseEnum.AGREE);
      expect((await readBeer(CAROL_USER_ID, orvalId)).ibu).toBe(35);

      const response = await request(app.getHttpServer())
        .post(`${BEERS_PATH}/${orvalId}/corrections`)
        .set(USER_ID_HEADER_NAME, String(CAROL_USER_ID))
        .send({ characteristic: "ibu", value: 50 });

      expect(response.status).toBe(HttpStatus.CREATED);
      expect(response.body).toMatchObject({ characteristic: "ibu", currentValue: 35, proposedValue: 50, status: "open", resolvedAt: null });
      const open = (await board(BOB_USER_ID)).body.open;
      expect(open.map((correction: { id: number }) => correction.id)).toEqual([response.body.id]);
      expect((await board(BOB_USER_ID)).body.recentlyClosed.map((correction: { id: number }) => correction.id)).toEqual([closed]);
    });

    it("AC6 resolves a due proposal of the same characteristic first, so a new one is created instead of answering 409", async () => {
      await insertDue(ALICE_USER_ID, orvalId, BeerCharacteristicEnum.IBU, "35");

      const response = await request(app.getHttpServer())
        .post(`${BEERS_PATH}/${orvalId}/corrections`)
        .set(USER_ID_HEADER_NAME, String(CAROL_USER_ID))
        .send({ characteristic: "ibu", value: 50 });

      expect(response.status).toBe(HttpStatus.CREATED);
    });

    it("AC7 resolves nothing when only the catalogue is listed, then resolves on the first read of the beer", async () => {
      const id = await insertDue(ALICE_USER_ID, orvalId, BeerCharacteristicEnum.IBU, "35");
      await addVote(id, BOB_USER_ID, CorrectionVoteSenseEnum.AGREE);

      const listing = await request(app.getHttpServer()).get(BEERS_PATH).query({ q: "Orval" }).set(USER_ID_HEADER_NAME, String(ALICE_USER_ID));

      expect(listing.status).toBe(HttpStatus.OK);
      expect(await correctionRow(id)).toMatchObject({ status: "open", resolvedAt: null, previousValue: null });
      expect(await storedIbu(orvalId)).toBe(20);

      await readBeer(ALICE_USER_ID, orvalId);

      expect(await correctionRow(id)).toMatchObject({ status: "accepted" });
      expect(await storedIbu(orvalId)).toBe(35);
    });

    it("resolves a due proposal when the corrections of the beer are listed", async () => {
      const id = await insertDue(ALICE_USER_ID, orvalId, BeerCharacteristicEnum.IBU, "35");

      const response = await request(app.getHttpServer())
        .get(`${BEERS_PATH}/${orvalId}/corrections`)
        .set(USER_ID_HEADER_NAME, String(BOB_USER_ID));

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual([]);
      expect(await correctionRow(id)).toMatchObject({ status: "rejected" });
    });
  });

  it("answers 401 on both routes without the identity header", async () => {
    const getBoard = await request(app.getHttpServer()).get(CORRECTIONS_PATH);
    const putVote = await request(app.getHttpServer()).put(votePath(1)).send({ sense: "agree" });

    expect(getBoard.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(getBoard.body).toStrictEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    expect(putVote.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(putVote.body).toStrictEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it("answers 401 before 400 on the vote of an unidentified caller with an invalid body, and stores no vote", async () => {
    const id = await propose(ALICE_USER_ID, orvalId, { characteristic: "ibu", value: 35 });

    const unknownSense = await request(app.getHttpServer()).put(votePath(id)).send({ sense: "maybe" });
    const emptyBody = await request(app.getHttpServer()).put(votePath(id)).send({});

    expect(unknownSense.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(unknownSense.body).toStrictEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    expect(emptyBody.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(emptyBody.body).toStrictEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    expect(await countVotes()).toBe(0);
  });
});
