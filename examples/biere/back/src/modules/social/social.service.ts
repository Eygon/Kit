import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { BeersService } from "@/modules/beers/beers.service";
import type { FeedItemDto } from "@/modules/social/dtos/feed-item.dto";
import type { FeedPageDto } from "@/modules/social/dtos/feed-page.dto";
import type { FeedQueryDto } from "@/modules/social/dtos/feed-query.dto";
import { buildFeedEvents, sortFeedEvents } from "@/modules/social/feed-events";
import type { ProfileDto } from "@/modules/social/dtos/profile.dto";
import type { ProfileSummaryDto } from "@/modules/social/dtos/profile-summary.dto";
import { toLevel } from "@/modules/social/levels";
import { toFeedActorDto, toFeedItemDto, toFeedPageDto } from "@/modules/social/mappers/feed.mapper";
import { toProfileDto, toProfileSummaryDto } from "@/modules/social/mappers/profile.mapper";
import { FEED_PAGE_SIZE } from "@/modules/social/social.constants";
import { SocialRepository } from "@/modules/social/social.repository";
import { TastingsService } from "@/modules/tastings/tastings.service";
import type { UserDto } from "@/modules/users/dtos/user.dto";
import type { UpdateProfileDto } from "@/modules/users/dtos/update-profile.dto";
import { UsersService } from "@/modules/users/users.service";

const FIRST_FEED_PAGE = 1;

@Injectable()
export class SocialService {
  constructor(
    private readonly socialRepository: SocialRepository,
    private readonly usersService: UsersService,
    private readonly tastingsService: TastingsService,
    private readonly beersService: BeersService,
  ) {}

  isFollowing(followerId: number, followedId: number): Promise<boolean> {
    return this.socialRepository.isFollowing(followerId, followedId);
  }

  async getProfile(currentUserId: number, userId: number): Promise<ProfileDto> {
    const user = await this.usersService.getUser(userId);
    const drunkBeerIds = await this.tastingsService.getDrunkBeerIds(userId);
    const isMe = currentUserId === userId;
    const [followerCount, followingCount, isFollowed] = await Promise.all([
      this.socialRepository.countFollowers(userId),
      this.socialRepository.countFollowing(userId),
      isMe ? Promise.resolve(false) : this.isFollowing(currentUserId, userId),
    ]);
    return toProfileDto(user, toLevel(drunkBeerIds.length), { followerCount, followingCount }, isFollowed, isMe);
  }

  async updateMyProfile(userId: number, dto: UpdateProfileDto): Promise<ProfileDto> {
    await this.usersService.updateProfile(userId, dto);
    return this.getProfile(userId, userId);
  }

  async follow(currentUserId: number, userId: number): Promise<ProfileDto> {
    if (currentUserId === userId) {
      throw new BadRequestException("You cannot follow yourself.");
    }
    await this.usersService.getUser(userId);
    if (await this.isFollowing(currentUserId, userId)) {
      throw new ConflictException(`You already follow user ${userId}.`);
    }
    await this.socialRepository.createFollow(currentUserId, userId);
    return this.getProfile(currentUserId, userId);
  }

  async unfollow(currentUserId: number, userId: number): Promise<void> {
    if (currentUserId === userId) {
      throw new BadRequestException("You cannot unfollow yourself.");
    }
    await this.usersService.getUser(userId);
    if (!(await this.socialRepository.deleteFollow(currentUserId, userId))) {
      throw new NotFoundException(`You do not follow user ${userId}.`);
    }
  }

  async getFeed(userId: number, query: FeedQueryDto): Promise<FeedPageDto> {
    const page = query.page ?? FIRST_FEED_PAGE;
    const followingIds = (await this.socialRepository.findFollowingIds(userId)).filter((id) => id !== userId);
    const [checkins, reviews] = await Promise.all([
      this.tastingsService.getCheckinsByUsers(followingIds),
      this.beersService.getReviewsByUsers(followingIds),
    ]);
    const events = sortFeedEvents(buildFeedEvents(checkins, reviews));
    const start = (page - 1) * FEED_PAGE_SIZE;
    const slice = events.slice(start, start + FEED_PAGE_SIZE);
    const authorIds = [...new Set(slice.map((event) => event.userId))];
    const beerIds = [...new Set(slice.map((event) => event.beerId).filter((beerId): beerId is number => beerId !== null))];
    const [beers, users, discoveredCounts] = await Promise.all([
      this.beersService.getBeersByIds(beerIds),
      this.usersService.getUsers(),
      this.tastingsService.getDiscoveredCounts(authorIds),
    ]);
    const beerNames = new Map<number | null, string>(beers.map((beer) => [beer.id, beer.name]));
    const actors = new Map(
      users
        .filter((user) => authorIds.includes(user.id))
        .map((user) => [user.id, toFeedActorDto(user, toLevel(discoveredCounts.get(user.id) ?? 0))]),
    );
    const items = slice.flatMap((event): FeedItemDto[] => {
      const actor = actors.get(event.userId);
      return actor === undefined ? [] : [toFeedItemDto(event, actor, beerNames.get(event.beerId) ?? null)];
    });
    return toFeedPageDto(items, events.length, page, FEED_PAGE_SIZE);
  }

  async getProfiles(currentUserId: number): Promise<ProfileSummaryDto[]> {
    return this.toSummaries(currentUserId, await this.usersService.getUsers());
  }

  async getFollowers(currentUserId: number, userId: number): Promise<ProfileSummaryDto[]> {
    await this.usersService.getUser(userId);
    return this.toSummaries(currentUserId, await this.getUsersAmong(await this.socialRepository.findFollowerIds(userId)));
  }

  async getFollowing(currentUserId: number, userId: number): Promise<ProfileSummaryDto[]> {
    await this.usersService.getUser(userId);
    return this.toSummaries(currentUserId, await this.getUsersAmong(await this.socialRepository.findFollowingIds(userId)));
  }

  private async getUsersAmong(userIds: readonly number[]): Promise<UserDto[]> {
    const wanted = new Set(userIds);
    const users = await this.usersService.getUsers();
    return users.filter((user) => wanted.has(user.id));
  }

  private async toSummaries(currentUserId: number, users: readonly UserDto[]): Promise<ProfileSummaryDto[]> {
    const userIds = users.map((user) => user.id);
    const [discoveredCounts, followedIds] = await Promise.all([
      this.tastingsService.getDiscoveredCounts(userIds),
      this.socialRepository.findFollowedIdsAmong(currentUserId, userIds),
    ]);
    const followed = new Set(followedIds);
    return users
      .map((user) =>
        toProfileSummaryDto(user, toLevel(discoveredCounts.get(user.id) ?? 0), followed.has(user.id), user.id === currentUserId),
      )
      .sort((left, right) => left.displayName.localeCompare(right.displayName) || left.id - right.id);
  }
}
