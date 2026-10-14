import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { BeerUserStateDto } from "@/modules/tastings/dtos/beer-user-state.dto";
import type { DiscoveryDto } from "@/modules/tastings/dtos/discovery.dto";
import type { CheckinRecordSliceDto } from "@/modules/tastings/dtos/checkin-record-slice.dto";
import type { CheckinRecordDto } from "@/modules/tastings/dtos/checkin-record.dto";
import type { WishlistItemRecordDto } from "@/modules/tastings/dtos/wishlist-item-record.dto";
import type { VenueVisitDto } from "@/modules/tastings/dtos/venue-visit.dto";
import type { PhotoContentDto } from "@/modules/tastings/dtos/photo-content.dto";
import type { Checkin } from "@/modules/tastings/entities/checkin.entity";
import type { PhotoContentTypeEnum } from "@/modules/tastings/enums/photo-content-type.enum";
import { TastingsRepository } from "@/modules/tastings/tastings.repository";

@Injectable()
export class TastingsService {
  constructor(private readonly tastingsRepository: TastingsRepository) {}

  createCheckin(data: Omit<Checkin, "id" | "createdAt">): Promise<CheckinRecordDto> {
    return this.tastingsRepository.createCheckin(data);
  }

  createCheckinWithPhoto(
    data: Omit<Checkin, "id" | "createdAt">,
    photo: { contentType: PhotoContentTypeEnum; content: Buffer },
  ): Promise<CheckinRecordDto> {
    return this.tastingsRepository.createCheckinWithPhoto(data, photo);
  }

  async isFirstCheckin(userId: number, beerId: number): Promise<boolean> {
    return (await this.tastingsRepository.countCheckins(userId, beerId)) === 0;
  }

  async getPhoto(id: string): Promise<PhotoContentDto> {
    const photo = await this.tastingsRepository.findPhoto(id);
    if (photo === null) {
      throw new NotFoundException(`Photo ${id} not found.`);
    }
    return photo;
  }

  getCheckinPage(userId: number, beerId: number | undefined, page: number, size: number): Promise<CheckinRecordSliceDto> {
    return this.tastingsRepository.findCheckinPage(userId, beerId, page, size);
  }

  getUserCheckins(userId: number): Promise<CheckinRecordDto[]> {
    return this.tastingsRepository.findCheckinsByUser(userId);
  }

  getCheckinsByUsers(userIds: readonly number[]): Promise<CheckinRecordDto[]> {
    return this.tastingsRepository.findCheckinsByUsers(userIds);
  }

  async deleteOwnedCheckin(userId: number, id: number): Promise<void> {
    const record = await this.getOwnedCheckin(userId, id);
    await this.tastingsRepository.deleteCheckinWithPhoto(id, record.photoId);
  }

  getDiscoveries(userId: number): Promise<DiscoveryDto[]> {
    return this.tastingsRepository.findDiscoveries(userId);
  }

  getVenueVisits(userId: number, venueIds: readonly number[]): Promise<VenueVisitDto[]> {
    return this.tastingsRepository.findVenueVisits(userId, venueIds);
  }

  getWishlist(userId: number): Promise<WishlistItemRecordDto[]> {
    return this.tastingsRepository.findWishlist(userId);
  }

  async addToWishlist(userId: number, beerId: number): Promise<WishlistItemRecordDto> {
    if (await this.tastingsRepository.existsWishlistItem(userId, beerId)) {
      throw new ConflictException(`Beer ${beerId} is already in the wishlist.`);
    }
    return this.tastingsRepository.addWishlistItem(userId, beerId);
  }

  async removeFromWishlist(userId: number, beerId: number): Promise<void> {
    if (!(await this.tastingsRepository.removeWishlistItem(userId, beerId))) {
      throw new NotFoundException(`Beer ${beerId} is not in the wishlist.`);
    }
  }

  getBeerStates(userId: number, beerIds: readonly number[]): Promise<BeerUserStateDto[]> {
    return this.tastingsRepository.findBeerStates(userId, beerIds);
  }

  getDrunkBeerIds(userId: number): Promise<number[]> {
    return this.tastingsRepository.findDrunkBeerIds(userId);
  }

  async getDiscoveredCounts(userIds: readonly number[]): Promise<ReadonlyMap<number, number>> {
    const rows = await this.tastingsRepository.countDiscoveredBeersByUsers(userIds);
    return new Map(rows.map((row) => [row.userId, row.discoveredCount]));
  }

  getWishlistBeerIds(userId: number): Promise<number[]> {
    return this.tastingsRepository.findWishlistBeerIds(userId);
  }

  async getOwnedCheckin(userId: number, id: number): Promise<CheckinRecordDto> {
    const checkin = await this.tastingsRepository.findCheckinById(id);
    if (checkin === null) {
      throw new NotFoundException(`Check-in ${id} not found.`);
    }
    if (checkin.userId !== userId) {
      throw new ForbiddenException("You can only access your own check-ins.");
    }
    return checkin;
  }
}
