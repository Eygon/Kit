import { Chip } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { UserAvatar } from "@/components/elements/userAvatar/userAvatar";
import type { ProfileRowProps } from "@/types/components/profileRow";
import { buildUserProfilePath } from "@/types/enums/routing/routePathEnum";
import { LEVEL_TITLE_LABEL_KEYS } from "@/types/enums/user/levelTitleEnum";

export const ProfileRow = ({ profile, action }: ProfileRowProps) => {
  const { t } = useTranslation();

  return (
    <li className="flex min-w-0 items-center gap-3 rounded-mousse border-mousse bg-surface p-3 shadow-mousse">
      <UserAvatar avatar={profile.avatar} isDecorative />
      <div className="flex min-w-0 flex-1 flex-col">
        <Link to={buildUserProfilePath(profile.id)} className="min-h-11 break-words text-accent focus-visible:focus-ring">
          {profile.displayName}
        </Link>
        <span className="text-sm text-muted">
          {t("level.short", { level: profile.level, title: t(LEVEL_TITLE_LABEL_KEYS[profile.title]) })}
        </span>
        <span className="text-sm text-muted">{t("pages.people.discovered", { count: profile.discoveredCount })}</span>
      </div>
      {profile.isMe && (
        <Chip color="accent" variant="primary" className="shrink-0">
          {t("pages.people.you")}
        </Chip>
      )}
      {action !== undefined && <div className="shrink-0">{action}</div>}
    </li>
  );
};
