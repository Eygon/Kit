export interface BadgeDto {
  id: string;
  kind: string;
  family: string | null;
  unlocked: boolean;
  unlockedAt: string | null;
  current: number;
  target: number;
  comingSoon: boolean;
}
