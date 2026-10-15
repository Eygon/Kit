import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BeersService } from "@/modules/beers/beers.service";
import { SocialRepository } from "@/modules/social/social.repository";
import { SocialService } from "@/modules/social/social.service";
import { TastingsService } from "@/modules/tastings/tastings.service";
import { UpdateProfileDto } from "@/modules/users/dtos/update-profile.dto";
import { UsersService } from "@/modules/users/users.service";

const ALICE = 1;
const BOB = 2;
const BOB_USER = { id: BOB, displayName: "Bob", avatarColor: "#10B981" };
const ALICE_USER = { id: ALICE, displayName: "Alice", avatarColor: "#F59E0B" };
const CAROL = 3;
const BOB_TWIN = 4;
const user = (id: number, displayName: string, avatar: string) => ({ id, displayName, avatarColor: "#000000", avatar });
const ALICE_SUMMARY_USER = user(ALICE, "Alice", "hop");
const BOB_SUMMARY_USER = user(BOB, "Bob", "malt");
const CAROL_SUMMARY_USER = user(CAROL, "Carol", "glass");
const BOB_TWIN_USER = user(BOB_TWIN, "Bob", "foam");
const ALICE_SUMMARY = { id: ALICE, displayName: "Alice", avatar: "hop", level: 1, title: "curious", discoveredCount: 0 };
const BOB_SUMMARY = { id: BOB, displayName: "Bob", avatar: "malt", level: 1, title: "curious", discoveredCount: 3 };
const CAROL_SUMMARY = { id: CAROL, displayName: "Carol", avatar: "glass", level: 3, title: "hopHead", discoveredCount: 15 };

describe("SocialService", () => {
  const socialRepository = {
    countFollowers: vi.fn(),
    countFollowing: vi.fn(),
    isFollowing: vi.fn(),
    createFollow: vi.fn(),
    deleteFollow: vi.fn(),
    findFollowerIds: vi.fn(),
    findFollowingIds: vi.fn(),
    findFollowedIdsAmong: vi.fn(),
  };
  const usersService = { getUser: vi.fn(), getUsers: vi.fn(), updateProfile: vi.fn() };
  const tastingsService = { getDrunkBeerIds: vi.fn(), getDiscoveredCounts: vi.fn(), getCheckinsByUsers: vi.fn() };
  const beersService = { getBeersByIds: vi.fn(), getReviewsByUsers: vi.fn() };

  const buildService = async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        SocialService,
        { provide: SocialRepository, useValue: socialRepository },
        { provide: UsersService, useValue: usersService },
        { provide: TastingsService, useValue: tastingsService },
        { provide: BeersService, useValue: beersService },
      ],
    }).compile();
    return moduleRef.get(SocialService);
  };

  beforeEach(() => {
    vi.resetAllMocks();
    usersService.getUser.mockResolvedValue(BOB_USER);
    tastingsService.getDrunkBeerIds.mockResolvedValue([10, 11, 12]);
    socialRepository.countFollowers.mockResolvedValue(6);
    socialRepository.countFollowing.mockResolvedValue(4);
    socialRepository.isFollowing.mockResolvedValue(false);
  });

  it("tells whether the follower follows the followed", async () => {
    socialRepository.isFollowing.mockResolvedValue(true);
    const service = await buildService();

    expect(await service.isFollowing(ALICE, BOB)).toBe(true);
    expect(socialRepository.isFollowing).toHaveBeenCalledExactlyOnceWith(ALICE, BOB);
  });

  it("builds the profile of another user from the discoveries, the level and the follow counts", async () => {
    const service = await buildService();

    expect(await service.getProfile(ALICE, BOB)).toEqual({
      id: BOB,
      displayName: "Bob",
      level: 1,
      title: "curious",
      discoveredCount: 3,
      currentThreshold: 0,
      nextThreshold: 5,
      nextTitle: "taster",
      followerCount: 6,
      followingCount: 4,
      isFollowed: false,
      isMe: false,
    });
    expect(usersService.getUser).toHaveBeenCalledExactlyOnceWith(BOB);
    expect(tastingsService.getDrunkBeerIds).toHaveBeenCalledExactlyOnceWith(BOB);
    expect(socialRepository.countFollowers).toHaveBeenCalledExactlyOnceWith(BOB);
    expect(socialRepository.countFollowing).toHaveBeenCalledExactlyOnceWith(BOB);
    expect(socialRepository.isFollowing).toHaveBeenCalledExactlyOnceWith(ALICE, BOB);
  });

  it("counts the length of the drunk beer ids as the discoveries and derives the level from them", async () => {
    tastingsService.getDrunkBeerIds.mockResolvedValue(Array.from({ length: 15 }, (_, index) => index + 1));
    const service = await buildService();

    expect(await service.getProfile(ALICE, BOB)).toMatchObject({
      discoveredCount: 15,
      level: 3,
      title: "hopHead",
      currentThreshold: 15,
      nextThreshold: 30,
      nextTitle: "finePalate",
    });
  });

  it("reports isFollowed true when the current user follows the target", async () => {
    socialRepository.isFollowing.mockResolvedValue(true);
    const service = await buildService();

    expect(await service.getProfile(ALICE, BOB)).toMatchObject({ isFollowed: true, isMe: false });
  });

  it("flags the own profile as isMe and never as followed, without asking the follows", async () => {
    usersService.getUser.mockResolvedValue(ALICE_USER);
    socialRepository.isFollowing.mockResolvedValue(true);
    const service = await buildService();

    expect(await service.getProfile(ALICE, ALICE)).toMatchObject({ id: ALICE, isMe: true, isFollowed: false });
    expect(socialRepository.isFollowing).not.toHaveBeenCalled();
  });

  it("lets the 404 of an unknown user through before reading anything else", async () => {
    usersService.getUser.mockRejectedValue(new NotFoundException("User 99 not found."));
    const service = await buildService();

    await expect(service.getProfile(ALICE, 99)).rejects.toThrow(NotFoundException);
    expect(tastingsService.getDrunkBeerIds).not.toHaveBeenCalled();
    expect(socialRepository.countFollowers).not.toHaveBeenCalled();
  });

  it("updates the own profile then answers it freshly read, flagged isMe", async () => {
    const dto = Object.assign(new UpdateProfileDto(), { displayName: "Alice B", avatar: "foam" as UpdateProfileDto["avatar"] });
    const updated = { ...ALICE_USER, displayName: "Alice B", avatar: "foam" };
    const calls: string[] = [];
    usersService.updateProfile.mockImplementation(async () => {
      calls.push("update");
      return updated;
    });
    usersService.getUser.mockImplementation(async () => {
      calls.push("read");
      return updated;
    });
    const service = await buildService();

    expect(await service.updateMyProfile(ALICE, dto)).toMatchObject({
      id: ALICE,
      displayName: "Alice B",
      avatar: "foam",
      isMe: true,
      isFollowed: false,
      followerCount: 6,
      followingCount: 4,
    });
    expect(usersService.updateProfile).toHaveBeenCalledExactlyOnceWith(ALICE, dto);
    expect(calls).toEqual(["update", "read"]);
  });

  it("lets the 404 of the update through without reading the profile", async () => {
    usersService.updateProfile.mockRejectedValue(new NotFoundException("User 99 not found."));
    const service = await buildService();

    await expect(service.updateMyProfile(99, new UpdateProfileDto())).rejects.toThrow(NotFoundException);
    expect(tastingsService.getDrunkBeerIds).not.toHaveBeenCalled();
  });

  describe("follow", () => {
    it("creates the follow then answers the freshly read profile of the followed user", async () => {
      const calls: string[] = [];
      socialRepository.isFollowing.mockResolvedValueOnce(false).mockResolvedValue(true);
      socialRepository.createFollow.mockImplementation(async () => {
        calls.push("create");
      });
      socialRepository.countFollowers.mockImplementation(async () => {
        calls.push("read");
        return 1;
      });
      const service = await buildService();

      expect(await service.follow(ALICE, BOB)).toMatchObject({ id: BOB, isFollowed: true, followerCount: 1, isMe: false });
      expect(socialRepository.createFollow).toHaveBeenCalledExactlyOnceWith(ALICE, BOB);
      expect(calls).toEqual(["create", "read"]);
    });

    it("refuses to follow oneself with a 400 before reading the user, even when the user is unknown", async () => {
      usersService.getUser.mockRejectedValue(new NotFoundException("User 1 not found."));
      const service = await buildService();

      await expect(service.follow(ALICE, ALICE)).rejects.toThrow(new BadRequestException("You cannot follow yourself."));
      expect(usersService.getUser).not.toHaveBeenCalled();
      expect(socialRepository.createFollow).not.toHaveBeenCalled();
    });

    it("answers the 404 of an unknown user before looking at the existing follow and writes nothing", async () => {
      usersService.getUser.mockRejectedValue(new NotFoundException("User 99 not found."));
      socialRepository.isFollowing.mockResolvedValue(true);
      const service = await buildService();

      await expect(service.follow(ALICE, 99)).rejects.toThrow(NotFoundException);
      expect(socialRepository.isFollowing).not.toHaveBeenCalled();
      expect(socialRepository.createFollow).not.toHaveBeenCalled();
    });

    it("answers a 409 naming the user when the follow already exists and writes nothing", async () => {
      socialRepository.isFollowing.mockResolvedValue(true);
      const service = await buildService();

      await expect(service.follow(ALICE, BOB)).rejects.toThrow(new ConflictException("You already follow user 2."));
      expect(socialRepository.isFollowing).toHaveBeenCalledExactlyOnceWith(ALICE, BOB);
      expect(socialRepository.createFollow).not.toHaveBeenCalled();
    });
  });

  describe("unfollow", () => {
    it("deletes the follow and answers nothing", async () => {
      socialRepository.deleteFollow.mockResolvedValue(true);
      const service = await buildService();

      expect(await service.unfollow(ALICE, BOB)).toBeUndefined();
      expect(socialRepository.deleteFollow).toHaveBeenCalledExactlyOnceWith(ALICE, BOB);
    });

    it("refuses to unfollow oneself with a 400 before reading the user, even when the user is unknown", async () => {
      usersService.getUser.mockRejectedValue(new NotFoundException("User 1 not found."));
      const service = await buildService();

      await expect(service.unfollow(ALICE, ALICE)).rejects.toThrow(new BadRequestException("You cannot unfollow yourself."));
      expect(usersService.getUser).not.toHaveBeenCalled();
      expect(socialRepository.deleteFollow).not.toHaveBeenCalled();
    });

    it("answers the 404 of an unknown user before deleting anything", async () => {
      usersService.getUser.mockRejectedValue(new NotFoundException("User 99 not found."));
      socialRepository.deleteFollow.mockResolvedValue(false);
      const service = await buildService();

      await expect(service.unfollow(ALICE, 99)).rejects.toThrow(new NotFoundException("User 99 not found."));
      expect(socialRepository.deleteFollow).not.toHaveBeenCalled();
    });

    it("answers a 404 naming the user when the follow does not exist", async () => {
      socialRepository.deleteFollow.mockResolvedValue(false);
      const service = await buildService();

      await expect(service.unfollow(ALICE, BOB)).rejects.toThrow(new NotFoundException("You do not follow user 2."));
    });
  });

  describe("lists of profiles", () => {
    beforeEach(() => {
      usersService.getUsers.mockResolvedValue([CAROL_SUMMARY_USER, BOB_TWIN_USER, ALICE_SUMMARY_USER, BOB_SUMMARY_USER]);
      tastingsService.getDiscoveredCounts.mockResolvedValue(new Map([[BOB, 3], [CAROL, 15], [BOB_TWIN, 0]]));
      socialRepository.findFollowedIdsAmong.mockResolvedValue([CAROL]);
    });

    it("lists every profile sorted by name then id, with level, discoveries and the follow flags of the reader", async () => {
      const service = await buildService();

      expect(await service.getProfiles(ALICE)).toEqual([
        { ...ALICE_SUMMARY, isFollowed: false, isMe: true },
        { ...BOB_SUMMARY, isFollowed: false, isMe: false },
        { id: BOB_TWIN, displayName: "Bob", avatar: "foam", level: 1, title: "curious", discoveredCount: 0, isFollowed: false, isMe: false },
        { ...CAROL_SUMMARY, isFollowed: true, isMe: false },
      ]);
      expect(tastingsService.getDiscoveredCounts).toHaveBeenCalledExactlyOnceWith([CAROL, BOB_TWIN, ALICE, BOB]);
      expect(socialRepository.findFollowedIdsAmong).toHaveBeenCalledExactlyOnceWith(ALICE, [CAROL, BOB_TWIN, ALICE, BOB]);
    });

    it("lists the followers of a user among the users, sorted by name, after checking the user exists", async () => {
      socialRepository.findFollowerIds.mockResolvedValue([BOB, ALICE]);
      tastingsService.getDiscoveredCounts.mockResolvedValue(new Map([[BOB, 3]]));
      socialRepository.findFollowedIdsAmong.mockResolvedValue([BOB]);
      const service = await buildService();

      expect(await service.getFollowers(ALICE, CAROL)).toEqual([
        { ...ALICE_SUMMARY, isFollowed: false, isMe: true },
        { ...BOB_SUMMARY, isFollowed: true, isMe: false },
      ]);
      expect(usersService.getUser).toHaveBeenCalledExactlyOnceWith(CAROL);
      expect(socialRepository.findFollowerIds).toHaveBeenCalledExactlyOnceWith(CAROL);
      expect(socialRepository.findFollowedIdsAmong).toHaveBeenCalledExactlyOnceWith(ALICE, [ALICE, BOB]);
    });

    it("lists the users a user follows among the users, sorted by name", async () => {
      socialRepository.findFollowingIds.mockResolvedValue([CAROL]);
      const service = await buildService();

      expect(await service.getFollowing(BOB, ALICE)).toEqual([{ ...CAROL_SUMMARY, isFollowed: true, isMe: false }]);
      expect(usersService.getUser).toHaveBeenCalledExactlyOnceWith(ALICE);
      expect(socialRepository.findFollowingIds).toHaveBeenCalledExactlyOnceWith(ALICE);
      expect(socialRepository.findFollowedIdsAmong).toHaveBeenCalledExactlyOnceWith(BOB, [CAROL]);
    });

    it("answers an empty list for a user nobody follows and who follows nobody", async () => {
      socialRepository.findFollowerIds.mockResolvedValue([]);
      socialRepository.findFollowingIds.mockResolvedValue([]);
      tastingsService.getDiscoveredCounts.mockResolvedValue(new Map());
      socialRepository.findFollowedIdsAmong.mockResolvedValue([]);
      const service = await buildService();

      expect(await service.getFollowers(ALICE, BOB)).toEqual([]);
      expect(await service.getFollowing(ALICE, BOB)).toEqual([]);
    });

    it("lets the 404 of an unknown user through before reading the follows", async () => {
      usersService.getUser.mockRejectedValue(new NotFoundException("User 99 not found."));
      const service = await buildService();

      await expect(service.getFollowers(ALICE, 99)).rejects.toThrow(NotFoundException);
      await expect(service.getFollowing(ALICE, 99)).rejects.toThrow(NotFoundException);
      expect(socialRepository.findFollowerIds).not.toHaveBeenCalled();
      expect(socialRepository.findFollowingIds).not.toHaveBeenCalled();
    });
  });

  describe("getFeed", () => {
    const PHOTO_ID = "6f1c9c52-3a52-4a73-a1b4-2c2d9b1e0a11";
    const ORVAL = 10;
    const DAY_MS = 86_400_000;
    const FIRST_DAY = Date.parse("2026-03-01T10:00:00.000Z");
    const FEED_PAGE_SIZE = 20;
    const FOUR_BEERS = 4;

    const record = (id: number, userId: number, beerId: number, drankAt: string, overrides: Record<string, unknown> = {}) => ({
      id,
      userId,
      beerId,
      drankAt,
      place: "Paris",
      venueId: null,
      rating: 4,
      aromas: [],
      format: "bottle",
      price: null,
      comment: "",
      photoId: null,
      ...overrides,
    });

    const orval = { id: ORVAL, name: "Orval" };
    const beerNamed = (id: number) => ({ id, name: `Beer ${id}` });

    const bobCheckins = (count: number) =>
      Array.from({ length: count }, (_, index) =>
        record(index + 1, BOB, 100 + (index % FOUR_BEERS), new Date(FIRST_DAY + index * DAY_MS).toISOString()),
      );

    beforeEach(() => {
      socialRepository.findFollowingIds.mockResolvedValue([BOB]);
      tastingsService.getCheckinsByUsers.mockResolvedValue([]);
      tastingsService.getDiscoveredCounts.mockResolvedValue(new Map([[BOB, 5]]));
      beersService.getBeersByIds.mockResolvedValue([orval]);
      beersService.getReviewsByUsers.mockResolvedValue([]);
      usersService.getUsers.mockResolvedValue([ALICE_SUMMARY_USER, BOB_SUMMARY_USER, CAROL_SUMMARY_USER]);
    });

    it("builds two cards of the followed author, newest first, only the first tasting stamped, with the current level", async () => {
      tastingsService.getCheckinsByUsers.mockResolvedValue([
        record(1, BOB, ORVAL, "2026-03-01T10:00:00.000Z", { rating: 4, photoId: PHOTO_ID }),
        record(2, BOB, ORVAL, "2026-03-05T10:00:00.000Z", { rating: 2, place: "Lyon" }),
      ]);
      const service = await buildService();

      const feed = await service.getFeed(ALICE, {});

      const actor = { id: BOB, displayName: "Bob", avatar: "malt", level: 2, title: "taster" };
      expect(feed).toStrictEqual({
        items: [
          {
            id: "checkin-2",
            kind: "checkin",
            occurredAt: "2026-03-05T10:00:00.000Z",
            actor,
            beerId: ORVAL,
            beerName: "Orval",
            place: "Lyon",
            rating: 2,
            photoId: null,
            isDiscovery: false,
            discoveryCount: null,
            reachedLevel: null,
            reachedTitle: null,
            reviewText: null,
          },
          {
            id: "checkin-1",
            kind: "checkin",
            occurredAt: "2026-03-01T10:00:00.000Z",
            actor,
            beerId: ORVAL,
            beerName: "Orval",
            place: "Paris",
            rating: 4,
            photoId: PHOTO_ID,
            isDiscovery: true,
            discoveryCount: null,
            reachedLevel: null,
            reachedTitle: null,
            reviewText: null,
          },
        ],
        total: 2,
        page: 1,
        size: FEED_PAGE_SIZE,
      });
      expect(socialRepository.findFollowingIds).toHaveBeenCalledExactlyOnceWith(ALICE);
      expect(tastingsService.getCheckinsByUsers).toHaveBeenCalledExactlyOnceWith([BOB]);
      expect(tastingsService.getDiscoveredCounts).toHaveBeenCalledExactlyOnceWith([BOB]);
      expect(beersService.getBeersByIds).toHaveBeenCalledExactlyOnceWith([ORVAL]);
    });

    it("reads the reviews of the followed authors and turns them into review cards named after their beer", async () => {
      const PILSNER = 77;
      beersService.getReviewsByUsers.mockResolvedValue([
        {
          id: 9,
          userId: BOB,
          beerId: PILSNER,
          rating: 4.5,
          text: "Amertume noble",
          createdAt: "2026-03-01T10:00:00.000Z",
          updatedAt: "2026-03-03T10:00:00.000Z",
        },
      ]);
      beersService.getBeersByIds.mockResolvedValue([{ id: PILSNER, name: "Pilsner Urquell" }]);
      const service = await buildService();

      const feed = await service.getFeed(ALICE, {});

      expect(feed).toStrictEqual({
        items: [
          {
            id: "review-9",
            kind: "review",
            occurredAt: "2026-03-03T10:00:00.000Z",
            actor: { id: BOB, displayName: "Bob", avatar: "malt", level: 2, title: "taster" },
            beerId: PILSNER,
            beerName: "Pilsner Urquell",
            place: null,
            rating: 4.5,
            photoId: null,
            isDiscovery: false,
            discoveryCount: null,
            reachedLevel: null,
            reachedTitle: null,
            reviewText: "Amertume noble",
          },
        ],
        total: 1,
        page: 1,
        size: FEED_PAGE_SIZE,
      });
      expect(beersService.getReviewsByUsers).toHaveBeenCalledExactlyOnceWith([BOB]);
      expect(beersService.getBeersByIds).toHaveBeenCalledExactlyOnceWith([PILSNER]);
    });

    it("builds the discoveries and level-up cards from the check-ins of the followed authors", async () => {
      tastingsService.getCheckinsByUsers.mockResolvedValue(
        Array.from({ length: 5 }, (_, index) => record(index + 1, BOB, 100 + index, `2026-03-0${index + 1}T10:00:00.000Z`)),
      );
      beersService.getBeersByIds.mockImplementation((ids: readonly number[]) => Promise.resolve(ids.map(beerNamed)));
      const service = await buildService();

      const feed = await service.getFeed(ALICE, {});

      expect(feed.items.map((item) => item.id)).toEqual(["levelUp-2-2", "checkin-5", "checkin-4", "checkin-3", "checkin-2", "checkin-1"]);
      expect(feed.items[0]).toMatchObject({ kind: "levelUp", reachedLevel: 2, reachedTitle: "taster", beerId: null, beerName: null });
      expect(feed.total).toBe(6);
    });

    it("never asks for the check-ins of the reader, even when the reader appears among the followed ids", async () => {
      socialRepository.findFollowingIds.mockResolvedValue([ALICE, BOB]);
      const service = await buildService();

      await service.getFeed(ALICE, {});

      expect(tastingsService.getCheckinsByUsers).toHaveBeenCalledExactlyOnceWith([BOB]);
      expect(beersService.getReviewsByUsers).toHaveBeenCalledExactlyOnceWith([BOB]);
    });

    it("answers an empty feed with a total of 0 when the reader follows nobody", async () => {
      socialRepository.findFollowingIds.mockResolvedValue([]);
      tastingsService.getDiscoveredCounts.mockResolvedValue(new Map());
      beersService.getBeersByIds.mockResolvedValue([]);
      const service = await buildService();

      expect(await service.getFeed(ALICE, {})).toStrictEqual({ items: [], total: 0, page: 1, size: FEED_PAGE_SIZE });
      expect(tastingsService.getCheckinsByUsers).toHaveBeenCalledExactlyOnceWith([]);
      expect(beersService.getReviewsByUsers).toHaveBeenCalledExactlyOnceWith([]);
    });

    it("slices 25 cards into 20, 5 and 0 with the total 25 and no duplicate, resolving only the beers and authors of the slice", async () => {
      tastingsService.getCheckinsByUsers.mockResolvedValue(bobCheckins(25));
      beersService.getBeersByIds.mockImplementation((ids: readonly number[]) => Promise.resolve(ids.map(beerNamed)));
      const service = await buildService();

      const first = await service.getFeed(ALICE, { page: 1 });
      const second = await service.getFeed(ALICE, { page: 2 });
      const third = await service.getFeed(ALICE, { page: 3 });

      expect([first.items.length, second.items.length, third.items.length]).toEqual([20, 5, 0]);
      expect([first.total, second.total, third.total]).toEqual([25, 25, 25]);
      expect([first.page, second.page, third.page]).toEqual([1, 2, 3]);
      expect([first.size, second.size, third.size]).toEqual([20, 20, 20]);
      const ids = [...first.items, ...second.items].map((item) => item.id);
      expect(new Set(ids).size).toBe(25);
      expect(first.items[0].id).toBe("checkin-25");
      expect(second.items.map((item) => item.id)).toEqual(["checkin-5", "checkin-4", "checkin-3", "checkin-2", "checkin-1"]);
      expect(beersService.getBeersByIds).toHaveBeenNthCalledWith(2, [100, 103, 102, 101]);
      expect(beersService.getBeersByIds).toHaveBeenNthCalledWith(3, []);
    });

    it("reads page 1 when no page is given", async () => {
      tastingsService.getCheckinsByUsers.mockResolvedValue(bobCheckins(25));
      beersService.getBeersByIds.mockImplementation((ids: readonly number[]) => Promise.resolve(ids.map(beerNamed)));
      const service = await buildService();

      const feed = await service.getFeed(ALICE, {});

      expect(feed.page).toBe(1);
      expect(feed.items).toHaveLength(20);
    });

    it("gives each card the actor of its own author with the level computed from the discovered counts", async () => {
      socialRepository.findFollowingIds.mockResolvedValue([BOB, CAROL]);
      tastingsService.getCheckinsByUsers.mockResolvedValue([
        record(1, BOB, ORVAL, "2026-03-01T10:00:00.000Z"),
        record(2, CAROL, ORVAL, "2026-03-02T10:00:00.000Z"),
      ]);
      tastingsService.getDiscoveredCounts.mockResolvedValue(new Map([[CAROL, 15]]));
      const service = await buildService();

      const feed = await service.getFeed(ALICE, {});

      expect(feed.items.map((item) => item.actor)).toEqual([
        { id: CAROL, displayName: "Carol", avatar: "glass", level: 3, title: "hopHead" },
        { id: BOB, displayName: "Bob", avatar: "malt", level: 1, title: "curious" },
      ]);
    });

    it("leaves the beer name null when the beer is unknown", async () => {
      tastingsService.getCheckinsByUsers.mockResolvedValue([record(1, BOB, 999, "2026-03-01T10:00:00.000Z")]);
      const service = await buildService();

      const feed = await service.getFeed(ALICE, {});

      expect(feed.items.map((item) => [item.beerId, item.beerName])).toEqual([[999, null]]);
    });

    it("omits the card of an author the users service does not know and keeps the others", async () => {
      socialRepository.findFollowingIds.mockResolvedValue([BOB, CAROL]);
      tastingsService.getCheckinsByUsers.mockResolvedValue([
        record(1, BOB, ORVAL, "2026-03-01T10:00:00.000Z"),
        record(2, CAROL, ORVAL, "2026-03-02T10:00:00.000Z"),
      ]);
      usersService.getUsers.mockResolvedValue([ALICE_SUMMARY_USER, BOB_SUMMARY_USER]);
      const service = await buildService();

      const feed = await service.getFeed(ALICE, {});

      expect(feed.items.map((item) => item.id)).toEqual(["checkin-1"]);
    });
  });
});
