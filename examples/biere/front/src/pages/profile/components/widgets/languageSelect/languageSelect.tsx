import { Card, ToggleButton, ToggleButtonGroup } from "@heroui/react";
import type { Key } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { LanguageSelectProps } from "@/pages/profile/types/languageSelect";
import { isLanguage, LANGUAGE_OPTIONS } from "@/types/enums/i18n/languageEnum";

export const LanguageSelect = ({ selectedLanguage, onSelectLanguage }: LanguageSelectProps) => {
  const { t } = useTranslation();

  const handleSelectionChange = (keys: Set<Key>) => {
    const [language] = keys;
    if (isLanguage(language)) onSelectLanguage(language);
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title>{t("pages.profile.language.title")}</Card.Title>
        <Card.Description>{t("pages.profile.language.description")}</Card.Description>
      </Card.Header>
      <Card.Content>
        <ToggleButtonGroup
          fullWidth
          aria-label={t("pages.profile.language.label")}
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[selectedLanguage]}
          onSelectionChange={handleSelectionChange}
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <ToggleButton key={option.id} id={option.id} size="lg" className="min-h-11">
              {t(option.labelKey)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Card.Content>
    </Card>
  );
};
