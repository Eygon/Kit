import { Alert, Button, Drawer, Skeleton } from "@heroui/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { EmptyStatePanel } from "@/components/elements/emptyStatePanel/emptyStatePanel";
import { FollowButton } from "@/components/elements/followButton/followButton";
import { ProfileRow } from "@/components/elements/profileRow/profileRow";
import { useFollowListQuery } from "@/hooks/profile/useFollowListQuery";
import type { FollowListSheetProps } from "@/types/components/followListSheet";
import { FOLLOW_LIST_TITLE_KEYS } from "@/types/enums/user/followListKindEnum";

const SKELETON_ROW_KEYS = ["first", "second", "third"];

export const FollowListSheet = ({ userId, displayName, kind, label }: FollowListSheetProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const { profiles, isPending, isError, refetch } = useFollowListQuery(userId, kind, isOpen);

  const renderBody = () => {
    if (isPending)
      return (
        <div aria-busy="true" className="flex flex-col gap-3">
          {SKELETON_ROW_KEYS.map((key) => (
            <Skeleton key={key} className="h-20 w-full" />
          ))}
        </div>
      );
    if (isError)
      return (
        <Alert status="danger" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t("followList.errorTitle")}</Alert.Title>
          </Alert.Content>
          <Button size="lg" variant="danger-soft" onPress={() => void refetch()}>
            {t("common.retry")}
          </Button>
        </Alert>
      );
    if (profiles.length === 0)
      return <EmptyStatePanel title={t("followList.empty")} description={t("followList.emptyDescription")} />;
    return (
      <ul className="flex flex-col gap-3">
        {profiles.map((profile) => (
          <ProfileRow
            key={profile.id}
            profile={profile}
            action={
              profile.isMe ? undefined : (
                <FollowButton userId={profile.id} displayName={profile.displayName} isFollowed={profile.isFollowed} />
              )
            }
          />
        ))}
      </ul>
    );
  };

  return (
    <Drawer isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button variant="ghost" size="lg">
        {label}
      </Button>
      <Drawer.Backdrop>
        <Drawer.Content placement="bottom" className="h-dvh md:h-auto">
          <Drawer.Dialog>
            <Drawer.Handle />
            <Drawer.Header>
              <Drawer.Heading className="break-words">{t(FOLLOW_LIST_TITLE_KEYS[kind], { name: displayName })}</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="max-h-[calc(100dvh-8rem)] min-w-0 overflow-y-auto p-1 md:max-h-[60dvh]">
              {renderBody()}
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
};
