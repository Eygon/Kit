import { Alert, Button, Drawer, SearchField, Skeleton } from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { EmptyStatePanel } from "@/components/elements/emptyStatePanel/emptyStatePanel";
import { BEER_SEARCH_MIN_LENGTH, useBeerSearchQuery } from "@/pages/map/hooks/useBeerSearchQuery";
import { useReportBeerMutation } from "@/pages/map/hooks/useReportBeerMutation";
import type { ReportBeerDrawerProps } from "@/pages/map/types/reportBeerDrawer";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MAX_LENGTH = 100;
const SKELETON_ROW_COUNT = 3;
const SKELETON_ROW_KEYS = Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => index);

export const ReportBeerDrawer = ({ venueId, isOpen, onOpenChange }: ReportBeerDrawerProps) => {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [debouncedText, setDebouncedText] = useState("");
  const { beers, isError, isFetching, refetch } = useBeerSearchQuery(debouncedText);
  const { mutateAsync, isPending } = useReportBeerMutation(venueId);
  const isSubmitting = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedText(text), text === "" ? 0 : SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const handleOpenChange = (nextIsOpen: boolean) => {
    if (!nextIsOpen) setText("");
    onOpenChange(nextIsOpen);
  };

  const handleSelect = (beerId: number) => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    mutateAsync(beerId)
      .then(() => handleOpenChange(false))
      .catch(() => undefined)
      .finally(() => {
        isSubmitting.current = false;
      });
  };

  const trimmedText = text.trim();
  const isTooShort = trimmedText.length < BEER_SEARCH_MIN_LENGTH;
  const isLoading = trimmedText !== debouncedText.trim() || isFetching;

  const renderResults = () => {
    if (isTooShort) return <p className="text-sm text-muted">{t("pages.map.report.hint")}</p>;
    if (isLoading)
      return (
        <div className="flex min-w-0 flex-col gap-2" aria-busy="true">
          {SKELETON_ROW_KEYS.map((key) => (
            <Skeleton key={key} className="h-11 w-full" />
          ))}
        </div>
      );
    if (isError)
      return (
        <Alert status="danger" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t("pages.map.report.errorTitle")}</Alert.Title>
          </Alert.Content>
          <Button size="lg" variant="danger-soft" onPress={() => void refetch()}>
            {t("common.retry")}
          </Button>
        </Alert>
      );
    if (beers.length === 0)
      return (
        <EmptyStatePanel
          mood={MascotMoodEnum.SEARCHING}
          title={t("pages.map.report.noResultTitle")}
          description={t("pages.map.report.noResultDescription")}
        />
      );
    return (
      <ul className="flex min-w-0 flex-col gap-2 p-1">
        {beers.map((beer) => (
          <li key={beer.id} className="min-w-0">
            <Button
              variant="tertiary"
              size="lg"
              isDisabled={isPending}
              className="h-auto min-h-11 w-full min-w-0 justify-start py-2 text-left"
              onPress={() => handleSelect(beer.id)}
            >
              <span className="flex min-w-0 flex-col items-start">
                <span className="min-w-0 font-bold break-words">{beer.name}</span>
                <span className="min-w-0 text-sm break-words text-muted">{beer.breweryName}</span>
              </span>
            </Button>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <Drawer isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Drawer.Backdrop>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog>
            <Drawer.Handle />
            <Drawer.Header>
              <Drawer.Heading>{t("pages.map.report.title")}</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="flex max-h-[70dvh] min-w-0 flex-col gap-3 overflow-y-auto p-1">
              <SearchField fullWidth aria-label={t("pages.map.report.searchLabel")} value={text} onChange={setText}>
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input
                    className="min-h-11"
                    maxLength={SEARCH_MAX_LENGTH}
                    placeholder={t("pages.map.report.searchLabel")}
                  />
                  {text !== "" && <SearchField.ClearButton aria-label={t("pages.map.report.clearLabel")} />}
                </SearchField.Group>
              </SearchField>
              {renderResults()}
            </Drawer.Body>
            <Drawer.Footer>
              <Button slot="close" variant="secondary" size="lg">
                {t("pages.map.report.close")}
              </Button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
};
