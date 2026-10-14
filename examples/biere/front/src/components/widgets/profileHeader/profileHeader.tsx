import { Alert, Button, Card, Label, ProgressBar, Skeleton } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { FollowListSheet } from "@/components/widgets/followListSheet/followListSheet";
import { UserAvatar } from "@/components/elements/userAvatar/userAvatar";
import type { ProfileHeaderProps } from "@/types/components/profileHeader";
import { LEVEL_TITLE_LABEL_KEYS } from "@/types/enums/user/levelTitleEnum";
import { AvatarSizeEnum } from "@/types/enums/user/avatarSizeEnum";
import { FollowListKindEnum } from "@/types/enums/user/followListKindEnum";

const ProfileHeaderSkeleton = () => (
  <Card>
    <Card.Content data-testid="profile-header-skeleton" aria-busy="true" className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-8 w-40 max-w-full" />
          <Skeleton className="h-6 w-32 max-w-full" />
        </div>
      </div>
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-5 w-48 max-w-full" />
    </Card.Content>
  </Card>
);

export const ProfileHeader = ({ profile, isPending, isError, onRetry, action }: ProfileHeaderProps) => {
  const { t } = useTranslation();

  if (isPending) return <ProfileHeaderSkeleton />;
  if (isError || profile === null)
    return (
      <Alert status="danger" role="alert">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{t("pages.profile.social.errorTitle")}</Alert.Title>
        </Alert.Content>
        <Button size="lg" variant="danger-soft" onPress={onRetry}>
          {t("common.retry")}
        </Button>
      </Alert>
    );

  const { displayName, avatar, level, title, discoveredCount, currentThreshold, nextThreshold, nextTitle } = profile;
  const isMaxLevel = nextThreshold === null || nextTitle === null;
  const progressText = isMaxLevel
    ? t("pages.profile.social.maxLevel")
    : t("pages.profile.social.progressToTitle", {
        current: discoveredCount,
        next: nextThreshold,
        title: t(LEVEL_TITLE_LABEL_KEYS[nextTitle]),
      });

  return (
    <Card>
      <Card.Content className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <UserAvatar avatar={avatar} size={AvatarSizeEnum.LG} isDecorative />
          <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
            <h2 className="font-display text-2xl break-words">{displayName}</h2>
            <span className="rounded-full border-mousse bg-highlight px-3 py-0.5 font-display text-sm text-highlight-foreground">
              {t("level.short", { level, title: t(LEVEL_TITLE_LABEL_KEYS[title]) })}
            </span>
            {action}
          </div>
        </div>
        <ProgressBar
          color="warning"
          value={discoveredCount}
          minValue={isMaxLevel ? 0 : currentThreshold}
          maxValue={isMaxLevel ? discoveredCount : nextThreshold}
          valueLabel={progressText}
          className="w-full"
        >
          <Label>{t("pages.profile.social.progressLabel")}</Label>
          <ProgressBar.Output>{progressText}</ProgressBar.Output>
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
        <div className="flex flex-wrap gap-2">
          <FollowListSheet
            userId={profile.id}
            displayName={displayName}
            kind={FollowListKindEnum.FOLLOWERS}
            label={t("pages.profile.social.followers", { count: profile.followerCount })}
          />
          <FollowListSheet
            userId={profile.id}
            displayName={displayName}
            kind={FollowListKindEnum.FOLLOWING}
            label={t("pages.profile.social.following", { count: profile.followingCount })}
          />
        </div>
      </Card.Content>
    </Card>
  );
};
