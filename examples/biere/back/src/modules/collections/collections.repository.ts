import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type SelectQueryBuilder } from "typeorm";
import { COLLECTION_NAME_LOCALE, NEW_COLLECTION_BEER_COUNT } from "@/modules/collections/collections.constants";
import type { CollectionItemRecordDto } from "@/modules/collections/dtos/collection-beer.dto";
import type { CollectionSummaryDto } from "@/modules/collections/dtos/collection-summary.dto";
import type { SaveCollectionDto } from "@/modules/collections/dtos/save-collection.dto";
import { CollectionItem } from "@/modules/collections/entities/collection-item.entity";
import { Collection } from "@/modules/collections/entities/collection.entity";
import {
  toCollectionItemRecordDto,
  toCollectionSummaryDto,
  toNewCollection,
} from "@/modules/collections/mappers/collection.mapper";

const normalizeCollectionName = (name: string): string => name.trim().toLocaleLowerCase(COLLECTION_NAME_LOCALE);

@Injectable()
export class CollectionsRepository {
  constructor(
    @InjectRepository(Collection) private readonly collections: Repository<Collection>,
    @InjectRepository(CollectionItem) private readonly items: Repository<CollectionItem>,
  ) {}

  countByUser(userId: number): Promise<number> {
    return this.collections.countBy({ userId });
  }

  async existsByName(userId: number, name: string, exceptId?: number): Promise<boolean> {
    const existing = await this.collections.findBy({ userId });
    const wanted = normalizeCollectionName(name);
    return existing.some(
      (collection) => collection.id !== exceptId && normalizeCollectionName(collection.name) === wanted,
    );
  }

  async findSummariesByUser(userId: number): Promise<CollectionSummaryDto[]> {
    return this.readSummaries(this.summariesQuery().where("collection.userId = :userId", { userId }));
  }

  async findOwned(userId: number, id: number): Promise<CollectionSummaryDto | null> {
    const [summary] = await this.readSummaries(
      this.summariesQuery().where("collection.userId = :userId AND collection.id = :id", { userId, id }),
    );
    return summary ?? null;
  }

  async rename(id: number, name: string): Promise<CollectionSummaryDto> {
    await this.collections.update({ id }, { name });
    const [summary] = await this.readSummaries(this.summariesQuery().where("collection.id = :id", { id }));
    return summary;
  }

  async deleteWithItems(id: number): Promise<void> {
    await this.collections.manager.transaction(async (manager) => {
      await manager.delete(CollectionItem, { collectionId: id });
      await manager.delete(Collection, { id });
    });
  }

  existsItem(collectionId: number, beerId: number): Promise<boolean> {
    return this.items.existsBy({ collectionId, beerId });
  }

  countItems(collectionId: number): Promise<number> {
    return this.items.countBy({ collectionId });
  }

  async addItem(collectionId: number, beerId: number): Promise<void> {
    await this.items.save(this.items.create({ collectionId, beerId }));
  }

  async removeItem(collectionId: number, beerId: number): Promise<boolean> {
    const result = await this.items.delete({ collectionId, beerId });
    return result.affected === 1;
  }

  async findItems(collectionId: number): Promise<CollectionItemRecordDto[]> {
    const entities = await this.items.find({ where: { collectionId }, order: { addedAt: "DESC", id: "DESC" } });
    return entities.map(toCollectionItemRecordDto);
  }

  async findCollectionIdsContaining(userId: number, beerId: number): Promise<number[]> {
    const rows = await this.collections
      .createQueryBuilder("collection")
      .innerJoin(CollectionItem, "item", "item.collectionId = collection.id")
      .select("collection.id", "id")
      .where("collection.userId = :userId AND item.beerId = :beerId", { userId, beerId })
      .orderBy("collection.createdAt", "ASC")
      .addOrderBy("collection.id", "ASC")
      .getRawMany<{ readonly id: number }>();
    return rows.map((row) => row.id);
  }

  private summariesQuery(): SelectQueryBuilder<Collection> {
    return this.collections
      .createQueryBuilder("collection")
      .leftJoin(CollectionItem, "item", "item.collectionId = collection.id")
      .select("collection")
      .addSelect("COUNT(item.id)", "beerCount")
      .groupBy("collection.id")
      .orderBy("collection.createdAt", "ASC")
      .addOrderBy("collection.id", "ASC");
  }

  private async readSummaries(query: SelectQueryBuilder<Collection>): Promise<CollectionSummaryDto[]> {
    const { entities, raw } = await query.getRawAndEntities<{ readonly beerCount: number | string }>();
    return entities.map((collection, index) => toCollectionSummaryDto(collection, Number(raw[index].beerCount)));
  }

  async create(userId: number, dto: SaveCollectionDto): Promise<CollectionSummaryDto> {
    const saved = await this.collections.save(this.collections.create(toNewCollection(userId, dto)));
    return toCollectionSummaryDto(saved, NEW_COLLECTION_BEER_COUNT);
  }
}
