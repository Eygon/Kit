import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Follow } from "@/modules/social/entities/follow.entity";
import { SocialRepository } from "@/modules/social/social.repository";
import { inMemoryDatabase } from "@/__tests__/support/test-database";

const ALICE = 1;
const BOB = 2;
const CAROL = 3;
const NOBODY = 99;

describe("SocialRepository", () => {
  let moduleRef: TestingModule;
  let repository: SocialRepository;
  let follows: Repository<Follow>;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [inMemoryDatabase(), TypeOrmModule.forFeature([Follow])],
      providers: [SocialRepository],
    }).compile();
    repository = moduleRef.get(SocialRepository);
    follows = moduleRef.get(getRepositoryToken(Follow));
  });

  beforeEach(async () => {
    await follows.clear();
    await follows.save([
      { followerId: CAROL, followedId: ALICE },
      { followerId: BOB, followedId: CAROL },
      { followerId: ALICE, followedId: BOB },
      { followerId: CAROL, followedId: BOB },
    ]);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it("counts the followers of a user, not the users he follows", async () => {
    expect(await repository.countFollowers(BOB)).toBe(2);
    expect(await repository.countFollowers(ALICE)).toBe(1);
  });

  it("counts the users a user follows, not his followers", async () => {
    expect(await repository.countFollowing(CAROL)).toBe(2);
    expect(await repository.countFollowing(BOB)).toBe(1);
  });

  it("counts zero for a user nobody follows and who follows nobody", async () => {
    expect(await repository.countFollowers(NOBODY)).toBe(0);
    expect(await repository.countFollowing(NOBODY)).toBe(0);
  });

  it("tells whether the follower follows the followed, in that direction only", async () => {
    expect(await repository.isFollowing(ALICE, BOB)).toBe(true);
    expect(await repository.isFollowing(BOB, ALICE)).toBe(false);
    expect(await repository.isFollowing(ALICE, CAROL)).toBe(false);
  });

  it("creates a follow row in the given direction only", async () => {
    await repository.createFollow(BOB, ALICE);

    expect(await repository.isFollowing(BOB, ALICE)).toBe(true);
    expect(await repository.isFollowing(ALICE, BOB)).toBe(true);
    expect(await follows.count()).toBe(5);
    expect(await follows.countBy({ followerId: BOB, followedId: ALICE })).toBe(1);
  });

  it("deletes the follow row and answers true, leaving the reverse direction and the other rows", async () => {
    expect(await repository.deleteFollow(ALICE, BOB)).toBe(true);

    expect(await repository.isFollowing(ALICE, BOB)).toBe(false);
    expect(await follows.count()).toBe(3);
    expect(await repository.isFollowing(CAROL, BOB)).toBe(true);
  });

  it("answers false and deletes nothing when the follower does not follow the followed", async () => {
    expect(await repository.deleteFollow(BOB, ALICE)).toBe(false);
    expect(await follows.count()).toBe(4);
  });

  it("lists the follower ids of a user by increasing follow id, not the users he follows", async () => {
    expect(await repository.findFollowerIds(BOB)).toStrictEqual([ALICE, CAROL]);
    expect(await repository.findFollowerIds(ALICE)).toStrictEqual([CAROL]);
    expect(await repository.findFollowerIds(NOBODY)).toStrictEqual([]);
  });

  it("lists the ids a user follows by increasing follow id, not his followers", async () => {
    expect(await repository.findFollowingIds(CAROL)).toStrictEqual([ALICE, BOB]);
    expect(await repository.findFollowingIds(BOB)).toStrictEqual([CAROL]);
    expect(await repository.findFollowingIds(NOBODY)).toStrictEqual([]);
  });

  it("orders the follower ids and the followed ids by follow id, not by the user ids", async () => {
    await follows.clear();
    await follows.save([
      { followerId: BOB, followedId: CAROL },
      { followerId: ALICE, followedId: CAROL },
      { followerId: ALICE, followedId: BOB },
    ]);

    expect(await repository.findFollowerIds(CAROL)).toStrictEqual([BOB, ALICE]);
    expect(await repository.findFollowingIds(ALICE)).toStrictEqual([CAROL, BOB]);
  });

  it("keeps among the given ids only the ones the follower follows", async () => {
    expect(await repository.findFollowedIdsAmong(CAROL, [ALICE, BOB, CAROL])).toStrictEqual([ALICE, BOB]);
    expect(await repository.findFollowedIdsAmong(ALICE, [ALICE, CAROL])).toStrictEqual([]);
    expect(await repository.findFollowedIdsAmong(BOB, [ALICE, BOB, CAROL])).toStrictEqual([CAROL]);
  });

  it("answers no followed id for an empty list of ids", async () => {
    expect(await repository.findFollowedIdsAmong(CAROL, [])).toStrictEqual([]);
  });
});
