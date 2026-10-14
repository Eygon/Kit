export interface VenueBeerUserStateDto {
  readonly drunk: boolean;
  readonly checkinCount: number;
  readonly lastCheckinAt: string | null;
}
