import { Avatar } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { getAvatarArtwork } from "@/components/elements/userAvatar/utils/avatarArtworks";
import type { UserAvatarProps } from "@/types/components/userAvatar";
import { AVATAR_LABEL_KEYS, DEFAULT_AVATAR, isAvatar } from "@/types/enums/user/avatarEnum";
import { AvatarSizeEnum } from "@/types/enums/user/avatarSizeEnum";

export const UserAvatar = ({ avatar, size = AvatarSizeEnum.MD, isDecorative = false }: UserAvatarProps) => {
  const { t } = useTranslation();
  const artwork = getAvatarArtwork(avatar);
  const knownAvatar = isAvatar(avatar) ? avatar : DEFAULT_AVATAR;
  const accessibilityProps = isDecorative
    ? { "aria-hidden": true }
    : { role: "img", "aria-label": t("avatar.label", { name: t(AVATAR_LABEL_KEYS[knownAvatar]) }) };

  return (
    <Avatar size={size} className="shrink-0">
      <Avatar.Fallback className="bg-transparent">
        <svg viewBox="0 0 48 48" strokeWidth={2} strokeLinejoin="round" className="size-full" {...accessibilityProps}>
          {artwork.shapes.map((shape) => (
            <path key={shape.d} d={shape.d} className={shape.className} />
          ))}
        </svg>
      </Avatar.Fallback>
    </Avatar>
  );
};
