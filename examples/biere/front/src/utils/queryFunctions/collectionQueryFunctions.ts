import CollectionService from "@/api/collections/collectionService";

export const fetchUserCollections = (userId: number) => CollectionService.getForUser(userId);

export const createCollection = (name: string) => CollectionService.create(name);

export const fetchUserCollection = (userId: number, collectionId: number) => CollectionService.getDetail(userId, collectionId);

export const fetchUserWishlist = (userId: number) => CollectionService.getWishlistOf(userId);

export const renameCollection = (collectionId: number, name: string) => CollectionService.rename(collectionId, name);

export const deleteCollection = (collectionId: number) => CollectionService.remove(collectionId);

export const removeCollectionBeer = (collectionId: number, beerId: number) => CollectionService.removeBeer(collectionId, beerId);

export const fetchMyCollections = (beerId: number) => CollectionService.getMine(beerId);

export const addCollectionBeer = (collectionId: number, beerId: number) => CollectionService.addBeer(collectionId, beerId);
