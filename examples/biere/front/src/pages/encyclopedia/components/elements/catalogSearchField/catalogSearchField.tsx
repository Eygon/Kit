import { SearchField } from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CatalogSearchFieldProps } from "@/pages/encyclopedia/types/catalogSearchField";
import {
  BEER_SEARCH_MAX_LENGTH,
  SEARCH_DEBOUNCE_MS,
} from "@/pages/encyclopedia/utils/encyclopediaConstants";

export const CatalogSearchField = ({
  value,
  onSearchChange,
}: CatalogSearchFieldProps) => {
  const { t } = useTranslation();
  const [text, setText] = useState(value);
  const reportedText = useRef(value);

  useEffect(() => {
    if (reportedText.current.trim() === value) return;
    reportedText.current = value;
    setText(value);
  }, [value]);

  useEffect(() => {
    if (text === reportedText.current) return undefined;
    const timer = setTimeout(() => {
      reportedText.current = text;
      onSearchChange(text);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, onSearchChange]);

  const clear = () => {
    reportedText.current = "";
    onSearchChange("");
  };

  const label = t("pages.encyclopedia.search.label");

  return (
    <SearchField
      fullWidth
      aria-label={label}
      value={text}
      onChange={setText}
      onClear={clear}
    >
      <SearchField.Group>
        <SearchField.SearchIcon />
        <SearchField.Input
          className="min-h-11"
          maxLength={BEER_SEARCH_MAX_LENGTH}
          placeholder={t("pages.encyclopedia.search.placeholder")}
        />
        {text !== "" && (
          <SearchField.ClearButton
            aria-label={t("pages.encyclopedia.search.clear")}
          />
        )}
      </SearchField.Group>
    </SearchField>
  );
};
