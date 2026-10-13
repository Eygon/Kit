import { BadRequestException, Injectable } from "@nestjs/common";
import { BeersService } from "@/modules/beers/beers.service";
import type { AddWishlistItemDto } from "@/modules/pokedex/dtos/add-wishlist-item.dto";
import type { CheckinDto } from "@/modules/pokedex/dtos/checkin.dto";
import type { CheckinPageDto } from "@/modules/pokedex/dtos/checkin-page.dto";
import type { CheckinsQueryDto } from "@/modules/pokedex/dtos/checkins-query.dto";
import type { CreatedCheckinDto } from "@/modules/pokedex/dtos/created-checkin.dto";
import type { DexDto } from "@/modules/pokedex/dtos/dex.dto";
import type { WishlistItemDto } from "@/modules/pokedex/dtos/wishlist-item.dto";
import { toCheckinDto, toCheckinPageDto, toCreatedCheckinDto } from "@/modules/pokedex/mappers/checkin.mapper";
import { toDexDto } from "@/modules/pokedex/mappers/dex.mapper";
import { toWishlistItemDto } from "@/modules/pokedex/mappers/wishlist-item.mapper";
import { CHECKIN_FUTURE_TOLERANCE_MS, CHECKIN_PAGE_SIZE } from "@/modules/pokedex/pokedex.constants";
import type { PhotoContentDto } from "@/modules/tastings/dtos/photo-content.dto";
import type { CreateCheckinDto } from "@/modules/tastings/dtos/create-checkin.dto";
import { detectPhotoContentType, type PhotoContentTypeEnum } from "@/modules/tastings/enums/photo-content-type.enum";
import { toNewCheckin } from "@/modules/tastings/mappers/checkin-record.mapper";
import { TastingsService } from "@/modules/tastings/tastings.service";

const FIRST_PAGE = 1;

@Injectable()
export class PokedexService {
  constructor(
    private readonly beersService: BeersService,
    private readonly tastingsService: TastingsService,
  ) {}

  async createCheckin(
    userId: number,
    dto: CreateCheckinDto,
    file: Express.Multer.File | undefined,
  ): Promise<CreatedCheckinDto> {
    if (Date.parse(dto.drankAt) > Date.now() + CHECKIN_FUTURE_TOLERANCE_MS) {
      throw new BadRequestException("drankAt must not be in the future.");
    }
    const photo = file === undefined ? null : this.toPhoto(file);
    const beer = await this.beersService.getBeer(dto.beerId);
    const isFirstDiscovery = await this.tastingsService.isFirstCheckin(userId, beer.id);
    const data = toNewCheckin(dto, userId);
    const record =
      photo === null
        ? await this.tastingsService.createCheckin(data)
        : await this.tastingsService.createCheckinWithPhoto(data, photo);
    return toCreatedCheckinDto(record, beer.name, isFirstDiscovery);
  }

  async getCheckin(userId: number, id: number): Promise<CheckinDto> {
    const record = await this.tastingsService.getOwnedCheckin(userId, id);
    const beer = await this.beersService.getBeer(record.beerId);
    return toCheckinDto(record, beer.name);
  }

  async getCheckins(userId: number, query: CheckinsQueryDto): Promise<CheckinPageDto> {
    const page = query.page ?? FIRST_PAGE;
    const slice = await this.tastingsService.getCheckinPage(userId, query.beerId, page, CHECKIN_PAGE_SIZE);
    const beerIds = [...new Set(slice.items.map((record) => record.beerId))];
    const beers = await this.beersService.getBeersByIds(beerIds);
    const namesById = new Map(beers.map((beer) => [beer.id, beer.name]));
    return toCheckinPageDto(slice, namesById, page, CHECKIN_PAGE_SIZE);
  }

  deleteCheckin(userId: number, id: number): Promise<void> {
    return this.tastingsService.deleteOwnedCheckin(userId, id);
  }

  async getDex(userId: number): Promise<DexDto> {
    const [discoveries, totals] = await Promise.all([
      this.tastingsService.getDiscoveries(userId),
      this.beersService.getCatalogTotals(),
    ]);
    const discoveredBeers = await this.beersService.getBeersByIds(discoveries.map((discovery) => discovery.beerId));
    return toDexDto(totals, discoveries, discoveredBeers);
  }

  async getWishlist(userId: number): Promise<WishlistItemDto[]> {
    const records = await this.tastingsService.getWishlist(userId);
    const beers = await this.beersService.getBeersByIds(records.map((record) => record.beerId));
    const namesById = new Map(beers.map((beer) => [beer.id, beer.name]));
    return records.map((record) => toWishlistItemDto(record, namesById.get(record.beerId) ?? ""));
  }

  async addToWishlist(userId: number, dto: AddWishlistItemDto): Promise<WishlistItemDto> {
    const beer = await this.beersService.getBeer(dto.beerId);
    const record = await this.tastingsService.addToWishlist(userId, beer.id);
    return toWishlistItemDto(record, beer.name);
  }

  removeFromWishlist(userId: number, beerId: number): Promise<void> {
    return this.tastingsService.removeFromWishlist(userId, beerId);
  }

  getPhoto(id: string): Promise<PhotoContentDto> {
    return this.tastingsService.getPhoto(id);
  }

  private toPhoto(file: Express.Multer.File): { contentType: PhotoContentTypeEnum; content: Buffer } {
    const contentType = detectPhotoContentType(file.buffer);
    if (contentType === null) {
      throw new BadRequestException("The photo must be a JPEG, PNG or WebP image.");
    }
    return { contentType, content: file.buffer };
  }
}
