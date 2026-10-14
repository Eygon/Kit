import { Label, Radio, RadioGroup } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { UserAvatar } from "@/components/elements/userAvatar/userAvatar";
import type { AvatarPickerProps } from "@/pages/profile/types/avatarPicker";
import { AVATAR_OPTIONS, isAvatar } from "@/types/enums/user/avatarEnum";
import { AvatarSizeEnum } from "@/types/enums/user/avatarSizeEnum";

const AVATAR_CHOICE_CLASSES =
  "min-h-11 min-w-11 w-full flex-col justify-center gap-1 rounded-control border-mousse bg-surface p-1 text-center text-sm font-bold break-words text-foreground data-[selected=true]:bg-accent-soft data-[focus-visible=true]:focus-ring";

export const AvatarPicker = ({ value, onChange }: AvatarPickerProps) => {
  const { t } = useTranslation();

  const handleChange = (next: string) => {
    if (isAvatar(next)) onChange(next);
  };

  return (
    <RadioGroup aria-label={t("avatar.pickerLabel")} value={value} onChange={handleChange} className="min-w-0">
      <div className="grid min-w-0 grid-cols-4 gap-2 p-1">
        {AVATAR_OPTIONS.map(({ id, labelKey }) => (
          <Radio key={id} value={id} className="mt-0 min-w-0">
            <Radio.Content className={AVATAR_CHOICE_CLASSES}>
              <UserAvatar avatar={id} size={AvatarSizeEnum.LG} isDecorative />
              <Label className="cursor-[inherit] text-inherit">{t(labelKey)}</Label>
            </Radio.Content>
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
};
