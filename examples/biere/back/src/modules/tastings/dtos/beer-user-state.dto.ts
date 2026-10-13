export interface BeerUserStateDto {
  readonly beerId: number;
  readonly drunk: boolean;
  readonly checkinCount: number;
  readonly inWishlist: boolean;
}
