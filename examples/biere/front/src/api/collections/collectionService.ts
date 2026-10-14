import { httpClient } from "@/api/httpClient";
import { HttpError } from "@/api/httpError";
import { CUSTOM_COLLECTIONS_MAX } from "@/constants/collectionConstants";
import type { CollectionDetailDto } from "@/types/dtos/collection/collectionDetailDto";
import type { MyCollectionDto } from "@/types/dtos/collection/myCollectionDto";
import type { CollectionSummaryDto } from "@/types/dtos/collection/collectionSummaryDto";
import { CollectionKindEnum } from "@/types/enums/collection/collectionKindEnum";
import { HttpStatusCodeEnum } from "@/types/enums/http/httpStatusCodeEnum";
import { collectionDetailDtoToModel } from "@/types/mappers/collection/collectionDetailMapper";
import { collectionSummaryDtoToModel } from "@/types/mappers/collection/collectionSummaryMapper";
import { myCollectionDtoToModel } from "@/types/mappers/collection/myCollectionMapper";
import type { MyCollection } from "@/types/mappers/collection/myCollectionMapper";
import { buildSaveCollectionDto } from "@/types/mappers/collection/saveCollectionMapper";
import type { CollectionDetail } from "@/types/models/collection/collectionDetail";
import type { CollectionSummary } from "@/types/models/collection/collectionSummary";
import {
  ME_COLLECTION,
  ME_COLLECTION_BEER,
  ME_COLLECTION_BEERS,
  ME_COLLECTIONS,
  ME_COLLECTIONS_CONTAINING,
  USER_COLLECTION,
  USER_COLLECTIONS,
  USER_WISHLIST,
} from "@/utils/apiURL/apiURL";
import { isConflictError } from "@/utils/httpError/isConflictError";
import { getCurrentUserId } from "@/utils/currentUser/getCurrentUserId";
import { DisplayError } from "@/utils/displayError/displayError";
import { getErrorTranslationKey } from "@/utils/displayError/getErrorTranslationKey";

const getSaveCollectionErrorTranslationKey = (error: unknown): string =>
  error instanceof HttpError && error.status === HttpStatusCodeEnum.CONFLICT
    ? "collections.create.nameTaken"
    : getErrorTranslationKey(error);

const isHiddenCollectionError = (error: unknown): boolean =>
  error instanceof HttpError &&
  (error.status === HttpStatusCodeEnum.FORBIDDEN ||
    error.status === HttpStatusCodeEnum.NOT_FOUND);

const readDetail = async (url: string): Promise<CollectionDetail | null> => {
  try {
    const response = await httpClient.get<CollectionDetailDto>(url);
    return response.data === null
      ? null
      : collectionDetailDtoToModel(response.data);
  } catch (error) {
    if (isHiddenCollectionError(error)) return null;
    throw error;
  }
};

export default class CollectionService {
  static async getForUser(userId: number): Promise<CollectionSummary[] | null> {
    try {
      const response = await httpClient.get<CollectionSummaryDto[]>(
        USER_COLLECTIONS(userId),
      );
      return (response.data ?? []).map(collectionSummaryDtoToModel);
    } catch (error) {
      if (
        error instanceof HttpError &&
        error.status === HttpStatusCodeEnum.FORBIDDEN
      )
        return null;
      throw error;
    }
  }

  static async getDetail(
    userId: number,
    collectionId: number,
  ): Promise<CollectionDetail | null> {
    return readDetail(USER_COLLECTION(userId, collectionId));
  }

  static async getWishlistOf(userId: number): Promise<CollectionDetail | null> {
    return readDetail(USER_WISHLIST(userId));
  }

  static async getMine(beerId: number): Promise<MyCollection[]> {
    const response = await httpClient.get<MyCollectionDto[]>(
      ME_COLLECTIONS_CONTAINING(beerId),
    );
    return (response.data ?? []).map(myCollectionDtoToModel);
  }

  static async create(name: string): Promise<CollectionSummary> {
    try {
      const response = await httpClient.post<CollectionSummaryDto>(
        ME_COLLECTIONS(),
        buildSaveCollectionDto(name),
      );
      if (response.data === null)
        throw new HttpError(response.status, "Empty collection");
      return collectionSummaryDtoToModel(response.data);
    } catch (error) {
      const conflictKey = isConflictError(error)
        ? await CollectionService.getCreateConflictTranslationKey()
        : null;
      DisplayError(
        error,
        (failure) => conflictKey ?? getErrorTranslationKey(failure),
      );
      throw error;
    }
  }

  private static async getCreateConflictTranslationKey(): Promise<string> {
    try {
      const collections =
        await CollectionService.getForUser(getCurrentUserId());
      const customCount = (collections ?? []).filter(
        ({ kind }) => kind === CollectionKindEnum.CUSTOM,
      ).length;
      return customCount >= CUSTOM_COLLECTIONS_MAX
        ? "collections.create.limitReached"
        : "collections.create.nameTaken";
    } catch {
      return "collections.create.nameTaken";
    }
  }

  static async rename(
    collectionId: number,
    name: string,
  ): Promise<CollectionSummary> {
    try {
      const response = await httpClient.patch<CollectionSummaryDto>(
        ME_COLLECTION(collectionId),
        buildSaveCollectionDto(name),
      );
      if (response.data === null)
        throw new HttpError(response.status, "Empty collection");
      return collectionSummaryDtoToModel(response.data);
    } catch (error) {
      DisplayError(error, getSaveCollectionErrorTranslationKey);
      throw error;
    }
  }

  static async remove(collectionId: number): Promise<void> {
    try {
      await httpClient.delete(ME_COLLECTION(collectionId));
    } catch (error) {
      DisplayError(error);
      throw error;
    }
  }

  static async addBeer(
    collectionId: number,
    beerId: number,
  ): Promise<CollectionSummary> {
    try {
      const response = await httpClient.post<CollectionSummaryDto>(
        ME_COLLECTION_BEERS(collectionId),
        { beerId },
      );
      if (response.data === null)
        throw new HttpError(response.status, "Empty collection");
      return collectionSummaryDtoToModel(response.data);
    } catch (error) {
      DisplayError(error);
      throw error;
    }
  }

  static async removeBeer(collectionId: number, beerId: number): Promise<void> {
    try {
      await httpClient.delete(ME_COLLECTION_BEER(collectionId, beerId));
    } catch (error) {
      DisplayError(error);
      throw error;
    }
  }
}
