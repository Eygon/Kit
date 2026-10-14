export enum CollectionKindEnum {
  WISHLIST = "wishlist",
  CUSTOM = "custom",
}

export const isCollectionKind = (value: unknown): value is CollectionKindEnum =>
  typeof value === "string" && Object.values<string>(CollectionKindEnum).includes(value);
