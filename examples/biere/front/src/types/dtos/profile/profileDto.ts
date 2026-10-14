export interface ProfileDto {
  id: number;
  displayName: string;
  avatar: string;
  level: number;
  title: string;
  discoveredCount: number;
  currentThreshold: number;
  nextThreshold: number | null;
  nextTitle: string | null;
  followerCount: number;
  followingCount: number;
  isFollowed: boolean;
  isMe: boolean;
}
