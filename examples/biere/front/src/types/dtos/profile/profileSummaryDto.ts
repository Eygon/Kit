export interface ProfileSummaryDto {
  id: number;
  displayName: string;
  avatar: string;
  level: number;
  title: string;
  discoveredCount: number;
  isFollowed: boolean;
  isMe: boolean;
}
