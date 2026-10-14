import { HttpStatus } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "@/__tests__/support/test-app";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";
import { UNIDENTIFIED_USER_MESSAGE } from "@/common/exceptions/exception-messages.constants";
import { ALICE_USER_ID, BOB_USER_ID, CAROL_USER_ID } from "@/database/seed.constants";
import type { BeerPageDto } from "@/modules/beers/dtos/beer-page.dto";
import { Follow } from "@/modules/social/entities/follow.entity";
import { Checkin } from "@/modules/tastings/entities/checkin.entity";

const BEERS_PATH = "/api/v1/beers";
const CHECKINS_PATH = "/api/v1/checkins";
const UNKNOWN_USER_ID = 99;
const DISCOVERED_BEERS = 3;

const profilePath = (userId: number | string): string => `/api/v1/users/${userId}/profile`;

describe("profiles API", () => {
  let app: INestApplication;

  const readProfile = (path: string, userId: number): request.Test =>
    request(app.getHttpServer()).get(path).set(USER_ID_HEADER_NAME, String(userId));

  const listBeerIds = async (): Promise<number[]> => {
    const response = await request(app.getHttpServer()).get(BEERS_PATH).set(USER_ID_HEADER_NAME, String(ALICE_USER_ID));
    expect(response.status).toBe(HttpStatus.OK);
    return (response.body as BeerPageDto).items.slice(0, DISCOVERED_BEERS).map((item) => item.id);
  };

  const drink = async (userId: number, beerId: number): Promise<void> => {
    const response = await request(app.getHttpServer())
      .post(CHECKINS_PATH)
      .set(USER_ID_HEADER_NAME, String(userId))
      .field("beerId", String(beerId))
      .field("drankAt", "2025-10-01T18:00:00.000Z")
      .field("place", "Le Bistrot")
      .field("format", "bottle");
    expect(response.status).toBe(HttpStatus.CREATED);
  };

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await app.get(DataSource).getRepository(Checkin).clear();
  });

  afterAll(async () => {
    await app.close();
  });

  const drinkBobsFourTastings = async (): Promise<void> => {
    const [first, second, third] = await listBeerIds();
    await drink(BOB_USER_ID, first);
    await drink(BOB_USER_ID, first);
    await drink(BOB_USER_ID, second);
    await drink(BOB_USER_ID, third);
  };

  it("answers 401 without the user header", async () => {
    const response = await request(app.getHttpServer()).get(profilePath(BOB_USER_ID));

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it("answers 401 before 400 when the header is missing and the id is not numeric", async () => {
    const response = await request(app.getHttpServer()).get(profilePath("abc"));

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it("answers 400 to a non numeric user id", async () => {
    const response = await readProfile(profilePath("abc"), ALICE_USER_ID);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect((response.body as { message: string }).message).not.toBe("");
  });

  it("answers 404 to an unknown user id", async () => {
    const response = await readProfile(profilePath(UNKNOWN_USER_ID), ALICE_USER_ID);

    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body).toEqual({ message: `User ${UNKNOWN_USER_ID} not found.` });
  });

  it("gives Alice the profile of Bob, who drank 3 distinct beers in 4 tastings: level 1, next threshold 5", async () => {
    await drinkBobsFourTastings();

    const response = await readProfile(profilePath(BOB_USER_ID), ALICE_USER_ID);

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual({
      id: BOB_USER_ID,
      displayName: "Bob",
      avatar: "malt",
      level: 1,
      title: "curious",
      discoveredCount: 3,
      currentThreshold: 0,
      nextThreshold: 5,
      nextTitle: "taster",
      followerCount: 0,
      followingCount: 0,
      isFollowed: false,
      isMe: false,
    });
  });

  it.each([
    [ALICE_USER_ID, "hop"],
    [BOB_USER_ID, "malt"],
    [CAROL_USER_ID, "glass"],
  ])("serves the seeded avatar of user %i: %s", async (userId, avatar) => {
    const response = await readProfile(profilePath(userId), ALICE_USER_ID);

    expect(response.status).toBe(HttpStatus.OK);
    expect((response.body as { avatar: string }).avatar).toBe(avatar);
  });

  it("flags the own profile of Alice as isMe and not followed", async () => {
    const response = await readProfile(profilePath(ALICE_USER_ID), ALICE_USER_ID);

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toMatchObject({ id: ALICE_USER_ID, displayName: "Alice", isMe: true, isFollowed: false });
  });

  it("counts followers and following and tells the reader whether he follows the profile", async () => {
    const follows = app.get(DataSource).getRepository(Follow);
    await follows.save([
      { followerId: ALICE_USER_ID, followedId: BOB_USER_ID },
      { followerId: CAROL_USER_ID, followedId: BOB_USER_ID },
      { followerId: BOB_USER_ID, followedId: CAROL_USER_ID },
    ]);

    const byAlice = await readProfile(profilePath(BOB_USER_ID), ALICE_USER_ID);
    const byBob = await readProfile(profilePath(BOB_USER_ID), BOB_USER_ID);
    const aliceByCarol = await readProfile(profilePath(ALICE_USER_ID), CAROL_USER_ID);

    expect(byAlice.body).toMatchObject({ followerCount: 2, followingCount: 1, isFollowed: true, isMe: false });
    expect(byBob.body).toMatchObject({ followerCount: 2, followingCount: 1, isFollowed: false, isMe: true });
    expect(aliceByCarol.body).toMatchObject({ followerCount: 0, followingCount: 1, isFollowed: false, isMe: false });
  });

  describe("follows", () => {
    const FOLLOWS_PATH = "/api/v1/users";
    const followPath = (userId: number | string): string => `${FOLLOWS_PATH}/${userId}/follow`;

    const follow = (userId: number, targetId: number | string): request.Test =>
      request(app.getHttpServer()).post(followPath(targetId)).set(USER_ID_HEADER_NAME, String(userId));

    const unfollow = (userId: number, targetId: number | string): request.Test =>
      request(app.getHttpServer()).delete(followPath(targetId)).set(USER_ID_HEADER_NAME, String(userId));

    const mustFollow = async (userId: number, targetId: number): Promise<void> => {
      expect((await follow(userId, targetId)).status).toBe(HttpStatus.CREATED);
    };

    beforeEach(async () => {
      await app.get(DataSource).getRepository(Follow).clear();
      await drinkBobsFourTastings();
    });

    it("answers 401 without the user header on the five routes", async () => {
      const server = app.getHttpServer();
      const responses = await Promise.all([
        request(server).get(FOLLOWS_PATH),
        request(server).get(`${FOLLOWS_PATH}/${BOB_USER_ID}/followers`),
        request(server).get(`${FOLLOWS_PATH}/${BOB_USER_ID}/following`),
        request(server).post(followPath(BOB_USER_ID)),
        request(server).delete(followPath(BOB_USER_ID)),
      ]);

      responses.forEach((response) => {
        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
        expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
      });
    });

    it("lets Alice follow Bob: 201 with the profile of Bob followed once, and one following for Alice", async () => {
      const response = await follow(ALICE_USER_ID, BOB_USER_ID);

      expect(response.status).toBe(HttpStatus.CREATED);
      expect(response.body).toEqual({
        id: BOB_USER_ID,
        displayName: "Bob",
        avatar: "malt",
        level: 1,
        title: "curious",
        discoveredCount: DISCOVERED_BEERS,
        currentThreshold: 0,
        nextThreshold: 5,
        nextTitle: "taster",
        followerCount: 1,
        followingCount: 0,
        isFollowed: true,
        isMe: false,
      });
      const alice = await readProfile(profilePath(ALICE_USER_ID), ALICE_USER_ID);
      expect(alice.body).toMatchObject({ followerCount: 0, followingCount: 1 });
    });

    it("answers 409 when Alice follows Bob again and leaves both profiles unchanged", async () => {
      await mustFollow(ALICE_USER_ID, BOB_USER_ID);
      const bobBefore = await readProfile(profilePath(BOB_USER_ID), ALICE_USER_ID);
      const aliceBefore = await readProfile(profilePath(ALICE_USER_ID), ALICE_USER_ID);

      const response = await follow(ALICE_USER_ID, BOB_USER_ID);

      expect(response.status).toBe(HttpStatus.CONFLICT);
      expect(response.body).toEqual({ message: `You already follow user ${BOB_USER_ID}.` });
      expect((await readProfile(profilePath(BOB_USER_ID), ALICE_USER_ID)).body).toEqual(bobBefore.body);
      expect((await readProfile(profilePath(ALICE_USER_ID), ALICE_USER_ID)).body).toEqual(aliceBefore.body);
    });

    it("answers 400 when Alice follows herself, whatever the existing follows", async () => {
      const response = await follow(ALICE_USER_ID, ALICE_USER_ID);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: "You cannot follow yourself." });
      expect((await readProfile(profilePath(ALICE_USER_ID), ALICE_USER_ID)).body).toMatchObject({ followingCount: 0 });
    });

    it("answers 404 when Alice follows an unknown id and 400 for a non numeric id", async () => {
      const unknown = await follow(ALICE_USER_ID, UNKNOWN_USER_ID);
      const invalid = await follow(ALICE_USER_ID, "abc");

      expect(unknown.status).toBe(HttpStatus.NOT_FOUND);
      expect(unknown.body).toEqual({ message: `User ${UNKNOWN_USER_ID} not found.` });
      expect(invalid.status).toBe(HttpStatus.BAD_REQUEST);
      expect((invalid.body as { message: string }).message).not.toBe("");
    });

    it("lets Alice stop following Bob: 204 without body and Bob has no more follower", async () => {
      await mustFollow(ALICE_USER_ID, BOB_USER_ID);

      const response = await unfollow(ALICE_USER_ID, BOB_USER_ID);

      expect(response.status).toBe(HttpStatus.NO_CONTENT);
      expect(response.body).toEqual({});
      expect((await readProfile(profilePath(BOB_USER_ID), ALICE_USER_ID)).body).toMatchObject({
        followerCount: 0,
        isFollowed: false,
      });
    });

    it("answers 404 when Alice stops following someone she does not follow, then an unknown id", async () => {
      await mustFollow(BOB_USER_ID, ALICE_USER_ID);

      const notFollowed = await unfollow(ALICE_USER_ID, BOB_USER_ID);
      const unknown = await unfollow(ALICE_USER_ID, UNKNOWN_USER_ID);

      expect(notFollowed.status).toBe(HttpStatus.NOT_FOUND);
      expect(notFollowed.body).toEqual({ message: `You do not follow user ${BOB_USER_ID}.` });
      expect(unknown.status).toBe(HttpStatus.NOT_FOUND);
      expect(unknown.body).toEqual({ message: `User ${UNKNOWN_USER_ID} not found.` });
    });

    it("answers 400 when Alice stops following herself and 400 for a non numeric id", async () => {
      const own = await unfollow(ALICE_USER_ID, ALICE_USER_ID);
      const invalid = await unfollow(ALICE_USER_ID, "abc");

      expect(own.status).toBe(HttpStatus.BAD_REQUEST);
      expect((own.body as { message: string }).message).not.toBe("");
      expect(invalid.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it("lists the three profiles sorted by name with isFollowed true for Carol only and isMe true for Alice", async () => {
      await mustFollow(ALICE_USER_ID, CAROL_USER_ID);
      await mustFollow(CAROL_USER_ID, BOB_USER_ID);

      const response = await readProfile(FOLLOWS_PATH, ALICE_USER_ID);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual([
        { id: ALICE_USER_ID, displayName: "Alice", avatar: "hop", level: 1, title: "curious", discoveredCount: 0, isFollowed: false, isMe: true },
        { id: BOB_USER_ID, displayName: "Bob", avatar: "malt", level: 1, title: "curious", discoveredCount: DISCOVERED_BEERS, isFollowed: false, isMe: false },
        { id: CAROL_USER_ID, displayName: "Carol", avatar: "glass", level: 1, title: "curious", discoveredCount: 0, isFollowed: true, isMe: false },
      ]);
    });

    it("lists the followers of Carol and the following of Alice sorted by name with the flags of the reader", async () => {
      await mustFollow(BOB_USER_ID, CAROL_USER_ID);
      await mustFollow(ALICE_USER_ID, CAROL_USER_ID);

      const followers = await readProfile(`${FOLLOWS_PATH}/${CAROL_USER_ID}/followers`, ALICE_USER_ID);
      const following = await readProfile(`${FOLLOWS_PATH}/${ALICE_USER_ID}/following`, ALICE_USER_ID);

      expect(followers.status).toBe(HttpStatus.OK);
      expect(followers.body).toEqual([
        { id: ALICE_USER_ID, displayName: "Alice", avatar: "hop", level: 1, title: "curious", discoveredCount: 0, isFollowed: false, isMe: true },
        { id: BOB_USER_ID, displayName: "Bob", avatar: "malt", level: 1, title: "curious", discoveredCount: DISCOVERED_BEERS, isFollowed: false, isMe: false },
      ]);
      expect(following.status).toBe(HttpStatus.OK);
      expect(following.body).toEqual([
        { id: CAROL_USER_ID, displayName: "Carol", avatar: "glass", level: 1, title: "curious", discoveredCount: 0, isFollowed: true, isMe: false },
      ]);
    });

    it("answers 200 [] for a user without follower and without following", async () => {
      const followers = await readProfile(`${FOLLOWS_PATH}/${ALICE_USER_ID}/followers`, ALICE_USER_ID);
      const following = await readProfile(`${FOLLOWS_PATH}/${ALICE_USER_ID}/following`, ALICE_USER_ID);

      expect(followers.status).toBe(HttpStatus.OK);
      expect(followers.body).toEqual([]);
      expect(following.status).toBe(HttpStatus.OK);
      expect(following.body).toEqual([]);
    });

    it("answers 404 for the followers and the following of an unknown id, and 400 for a non numeric id", async () => {
      const followers = await readProfile(`${FOLLOWS_PATH}/${UNKNOWN_USER_ID}/followers`, ALICE_USER_ID);
      const following = await readProfile(`${FOLLOWS_PATH}/${UNKNOWN_USER_ID}/following`, ALICE_USER_ID);
      const invalid = await readProfile(`${FOLLOWS_PATH}/abc/followers`, ALICE_USER_ID);

      expect(followers.status).toBe(HttpStatus.NOT_FOUND);
      expect(followers.body).toEqual({ message: `User ${UNKNOWN_USER_ID} not found.` });
      expect(following.status).toBe(HttpStatus.NOT_FOUND);
      expect(invalid.status).toBe(HttpStatus.BAD_REQUEST);
    });
  });
});
