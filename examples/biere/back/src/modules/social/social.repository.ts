import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Follow } from "@/modules/social/entities/follow.entity";

@Injectable()
export class SocialRepository {
  constructor(@InjectRepository(Follow) private readonly follows: Repository<Follow>) {}

  countFollowers(userId: number): Promise<number> {
    return this.follows.countBy({ followedId: userId });
  }

  countFollowing(userId: number): Promise<number> {
    return this.follows.countBy({ followerId: userId });
  }

  isFollowing(followerId: number, followedId: number): Promise<boolean> {
    return this.follows.existsBy({ followerId, followedId });
  }

  async createFollow(followerId: number, followedId: number): Promise<void> {
    await this.follows.save(this.follows.create({ followerId, followedId }));
  }

  async deleteFollow(followerId: number, followedId: number): Promise<boolean> {
    const result = await this.follows.delete({ followerId, followedId });
    return result.affected === 1;
  }

  async findFollowerIds(userId: number): Promise<number[]> {
    const entities = await this.follows.find({
      select: { followerId: true },
      where: { followedId: userId },
      order: { id: "ASC" },
    });
    return entities.map((entity) => entity.followerId);
  }

  async findFollowingIds(userId: number): Promise<number[]> {
    const entities = await this.follows.find({
      select: { followedId: true },
      where: { followerId: userId },
      order: { id: "ASC" },
    });
    return entities.map((entity) => entity.followedId);
  }

  async findFollowedIdsAmong(followerId: number, userIds: readonly number[]): Promise<number[]> {
    if (userIds.length === 0) {
      return [];
    }
    const entities = await this.follows.find({
      select: { followedId: true },
      where: { followerId, followedId: In([...userIds]) },
      order: { id: "ASC" },
    });
    return entities.map((entity) => entity.followedId);
  }
}
