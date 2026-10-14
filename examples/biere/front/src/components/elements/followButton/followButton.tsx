import { ToggleButton } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { useFollowToggle } from "@/hooks/profile/useFollowToggle";
import type { FollowButtonProps } from "@/types/components/followButton";

export const FollowButton = ({ userId, displayName, isFollowed }: FollowButtonProps) => {
  const { t } = useTranslation();
  const { toggleFollow, isPending } = useFollowToggle(userId, displayName);

  return (
    <ToggleButton
      size="lg"
      variant="default"
      isSelected={isFollowed}
      isDisabled={isPending}
      aria-label={t("follow.label", { name: displayName })}
      onChange={toggleFollow}
    >
      {t(isFollowed ? "follow.following" : "follow.follow")}
    </ToggleButton>
  );
};
