import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import type { BeerUserStateDto } from "@/modules/tastings/dtos/beer-user-state.dto";
import type { DiscoveryDto } from "@/modules/tastings/dtos/discovery.dto";
import type { CheckinRecordSliceDto } from "@/modules/tastings/dtos/checkin-record-slice.dto";
import type { PhotoContentDto } from "@/modules/tastings/dtos/photo-content.dto";
import type { CheckinRecordDto } from "@/modules/tastings/dtos/checkin-record.dto";
import type { WishlistItemRecordDto } from "@/modules/tastings/dtos/wishlist-item-record.dto";
import { Checkin } from "@/modules/tastings/entities/checkin.entity";
import { Photo } from "@/modules/tastings/entities/photo.entity";
import { WishlistItem } from "@/modules/tastings/entities/wishlist-item.entity";
import type { PhotoContentTypeEnum } from "@/modules/tastings/enums/photo-content-type.enum";
import { toCheckinRecordDto } from "@/modules/tastings/mappers/checkin-record.mapper";
import { toPhotoContentDto } from "@/modules/tastings/mappers/photo-content.mapper";
import { toWishlistItemRecordDto } from "@/modules/tastings/mappers/wishlist-item-record.mapper";

interface RawDiscoveryRow {
  readonly beerId: number;
  readonly firstCheckinAt: string;
  readonly lastCheckinAt: string;
}

interface RawCheckinCountRow {
  readonly beerId: number;
  readonly checkinCount: number;
}

const toIsoDate = (stored: string): string => new Date(`${stored.replace(" ", "T")}Z`).toISOString();

const toDiscoveryDto = (row: RawDiscoveryRow): DiscoveryDto => ({
  beerId: row.beerId,
  firstCheckinAt: toIsoDate(row.firstCheckinAt),
  lastCheckinAt: toIsoDate(row.lastCheckinAt),
});

@Injectable()
export class TastingsRepository {
  constructor(
    @InjectRepository(Checkin) private readonly checkins: Repository<Checkin>,
    @InjectRepository(Photo) private readonly photos: Repository<Photo>,
    @InjectRepository(WishlistItem) private readonly wishlistItems: Repository<WishlistItem>,
  ) {}

  async createCheckin(data: Omit<Checkin, "id" | "createdAt">): Promise<CheckinRecordDto> {
    const saved = await this.checkins.save(this.checkins.create(data));
    return toCheckinRecordDto(saved);
  }

  createCheckinWithPhoto(
    data: Omit<Checkin, "id" | "createdAt">,
    photo: { contentType: PhotoContentTypeEnum; content: Buffer },
  ): Promise<CheckinRecordDto> {
    return this.checkins.manager.transaction(async (manager) => {
      const savedPhoto = await manager.save(this.photos.create(photo));
      const saved = await manager.save(this.checkins.create({ ...data, photoId: savedPhoto.id }));
      return toCheckinRecordDto(saved);
    });
  }

  async findCheckinById(id: number): Promise<CheckinRecordDto | null> {
    const entity = await this.checkins.findOneBy({ id });
    return entity === null ? null : toCheckinRecordDto(entity);
  }

  async findCheckinPage(
    userId: number,
    beerId: number | undefined,
    page: number,
    size: number,
  ): Promise<CheckinRecordSliceDto> {
    const [entities, total] = await this.checkins.findAndCount({
      where: { userId, beerId },
      order: { drankAt: "DESC", id: "DESC" },
      skip: (page - 1) * size,
      take: size,
    });
    return { items: entities.map(toCheckinRecordDto), total };
  }

  async findCheckinsByUser(userId: number): Promise<CheckinRecordDto[]> {
    const entities = await this.checkins.find({ where: { userId }, order: { drankAt: "ASC", id: "ASC" } });
    return entities.map(toCheckinRecordDto);
  }

  deleteCheckinWithPhoto(id: number, photoId: string | null): Promise<void> {
    return this.checkins.manager.transaction(async (manager) => {
      await manager.delete(Checkin, { id });
      if (photoId !== null) {
        await manager.delete(Photo, { id: photoId });
      }
    });
  }

  async findPhoto(id: string): Promise<PhotoContentDto | null> {
    const entity = await this.photos.findOneBy({ id });
    return entity === null ? null : toPhotoContentDto(entity);
  }

  countCheckins(userId: number, beerId: number): Promise<number> {
    return this.checkins.countBy({ userId, beerId });
  }

  async findDiscoveries(userId: number): Promise<DiscoveryDto[]> {
    const rows = await this.checkins
      .createQueryBuilder("checkin")
      .select("checkin.beerId", "beerId")
      .addSelect("MIN(checkin.drankAt)", "firstCheckinAt")
      .addSelect("MAX(checkin.drankAt)", "lastCheckinAt")
      .where("checkin.userId = :userId", { userId })
      .groupBy("checkin.beerId")
      .orderBy("MIN(checkin.drankAt)", "DESC")
      .addOrderBy("checkin.beerId", "ASC")
      .getRawMany<RawDiscoveryRow>();
    return rows.map(toDiscoveryDto);
  }

  async findWishlist(userId: number): Promise<WishlistItemRecordDto[]> {
    const entities = await this.wishlistItems.find({ where: { userId }, order: { addedAt: "DESC", id: "DESC" } });
    return entities.map(toWishlistItemRecordDto);
  }

  existsWishlistItem(userId: number, beerId: number): Promise<boolean> {
    return this.wishlistItems.existsBy({ userId, beerId });
  }

  async addWishlistItem(userId: number, beerId: number): Promise<WishlistItemRecordDto> {
    const saved = await this.wishlistItems.save(this.wishlistItems.create({ userId, beerId }));
    return toWishlistItemRecordDto(saved);
  }

  async removeWishlistItem(userId: number, beerId: number): Promise<boolean> {
    const result = await this.wishlistItems.delete({ userId, beerId });
    return result.affected === 1;
  }

  async findBeerStates(userId: number, beerIds: readonly number[]): Promise<BeerUserStateDto[]> {
    if (beerIds.length === 0) {
      return [];
    }
    const [countRows, wishlistItems] = await Promise.all([
      this.checkins
        .createQueryBuilder("checkin")
        .select("checkin.beerId", "beerId")
        .addSelect("COUNT(*)", "checkinCount")
        .where("checkin.userId = :userId", { userId })
        .andWhere("checkin.beerId IN (:...beerIds)", { beerIds })
        .groupBy("checkin.beerId")
        .getRawMany<RawCheckinCountRow>(),
      this.wishlistItems.find({ select: { beerId: true }, where: { userId, beerId: In([...beerIds]) } }),
    ]);
    const counts = new Map(countRows.map((row) => [row.beerId, row.checkinCount]));
    const wished = new Set(wishlistItems.map((item) => item.beerId));
    return beerIds.map((beerId) => {
      const checkinCount = counts.get(beerId) ?? 0;
      return { beerId, drunk: checkinCount > 0, checkinCount, inWishlist: wished.has(beerId) };
    });
  }

  async findDrunkBeerIds(userId: number): Promise<number[]> {
    const rows = await this.checkins
      .createQueryBuilder("checkin")
      .select("checkin.beerId", "beerId")
      .where("checkin.userId = :userId", { userId })
      .groupBy("checkin.beerId")
      .orderBy("checkin.beerId", "ASC")
      .getRawMany<{ readonly beerId: number }>();
    return rows.map((row) => row.beerId);
  }

  async findWishlistBeerIds(userId: number): Promise<number[]> {
    const entities = await this.wishlistItems.find({ select: { beerId: true }, where: { userId }, order: { beerId: "ASC" } });
    return entities.map((entity) => entity.beerId);
  }
}
