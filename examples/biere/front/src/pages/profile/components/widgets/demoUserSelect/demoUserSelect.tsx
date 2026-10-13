import { Card, Label, ListBox, Select } from "@heroui/react";
import type { Key } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { DemoUserSelectProps } from "@/pages/profile/types/demoUserSelect";
import { DEMO_USER_OPTIONS, isDemoUserId } from "@/types/enums/user/demoUserIdEnum";

export const DemoUserSelect = ({ selectedUserId, onSelectUser }: DemoUserSelectProps) => {
  const { t } = useTranslation();

  const handleChange = (key: Key | null) => {
    const userId = Number(key);
    if (isDemoUserId(userId)) onSelectUser(userId);
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title>{t("pages.profile.demoUser.title")}</Card.Title>
        <Card.Description>{t("pages.profile.demoUser.description")}</Card.Description>
      </Card.Header>
      <Card.Content>
        <Select fullWidth value={selectedUserId} onChange={handleChange}>
          <Label>{t("pages.profile.demoUser.label")}</Label>
          <Select.Trigger className="min-h-11">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {DEMO_USER_OPTIONS.map((option) => (
                <ListBox.Item key={option.id} id={option.id} textValue={t(option.labelKey)} className="min-h-11">
                  {t(option.labelKey)}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </Card.Content>
    </Card>
  );
};
