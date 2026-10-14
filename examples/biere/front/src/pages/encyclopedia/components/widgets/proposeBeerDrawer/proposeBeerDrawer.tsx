import {
  Alert,
  Button,
  Chip,
  ComboBox,
  Drawer,
  FieldError,
  Form,
  Header,
  Input,
  Label,
  ListBox,
  NumberField,
  Select,
  TextArea,
  TextField,
} from "@heroui/react";
import type { Key } from "@heroui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { HttpError } from "@/api/httpError";
import { useBreweriesQuery } from "@/pages/encyclopedia/hooks/useBreweriesQuery";
import { useBeerStyleGroupsQuery } from "@/pages/encyclopedia/hooks/useBeerStyleGroupsQuery";
import { useExistingBeerLoader } from "@/pages/encyclopedia/hooks/useExistingBeerLoader";
import { useCreateBeerMutation } from "@/pages/encyclopedia/hooks/useCreateBeerMutation";
import type { BeerFormValues } from "@/pages/encyclopedia/types/beerFormValues";
import type { ProposeBeerDrawerProps } from "@/pages/encyclopedia/types/proposeBeerDrawer";
import { EMPTY_BEER_FORM, formValuesToNewBeer, getBeerFormErrorKeys } from "@/pages/encyclopedia/utils/beerFormValues";
import { normalizeSearchText } from "@/pages/encyclopedia/utils/normalizeSearchText";
import { COUNTRY_CODES, PROPOSE_BEER_FORM_ID } from "@/pages/encyclopedia/utils/proposeBeerConstants";
import { BEER_FAMILY_LABEL_KEYS } from "@/types/enums/beer/beerFamilyEnum";
import { HttpStatusCodeEnum } from "@/types/enums/http/httpStatusCodeEnum";
import { buildBeerDetailPath } from "@/types/enums/routing/routePathEnum";
import type { Beer } from "@/types/models/beer/beer";
import type { Brewery } from "@/types/models/brewery/brewery";
import { getCountryName } from "@/utils/country/getCountryName";

const NO_BREWERY_SUGGESTIONS: Brewery[] = [];

export const ProposeBeerDrawer = ({ isOpen, onOpenChange, initialName, onCreated }: ProposeBeerDrawerProps) => {
  const { t, i18n } = useTranslation();
  const [values, setValues] = useState<BeerFormValues>({ ...EMPTY_BEER_FORM, name: initialName });
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [existingBeer, setExistingBeer] = useState<Beer | null>(null);
  const { mutateAsync, isPending } = useCreateBeerMutation();
  const { groups, isPending: isStylesPending, isError: isStylesError, refetch: refetchStyles } = useBeerStyleGroupsQuery();
  const { breweries, isPending: isBreweriesPending, isError: isBreweriesError } = useBreweriesQuery(isOpen);
  const { loadExistingBeer } = useExistingBeerLoader();
  const isSubmitting = useRef(false);
  const lookupToken = useRef(0);
  const errorKeys = getBeerFormErrorKeys(values);
  const countryError = hasAttemptedSubmit && errorKeys.country !== undefined ? t(errorKeys.country) : null;
  const styleError = hasAttemptedSubmit && errorKeys.styleId !== undefined ? t(errorKeys.styleId) : null;

  const countryList = useMemo(
    () => (
      <ListBox>
        {COUNTRY_CODES.map((code) => ({ code, name: getCountryName(code, i18n.language) }))
          .sort((first, second) => first.name.localeCompare(second.name, i18n.language))
          .map((country) => (
            <ListBox.Item key={country.code} id={country.code} textValue={country.name} className="min-h-11">
              {country.name}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
      </ListBox>
    ),
    [i18n.language],
  );

  const styleList = useMemo(
    () => (
      <ListBox>
        {groups.map((group) => (
          <ListBox.Section key={group.family}>
            <Header>{t(BEER_FAMILY_LABEL_KEYS[group.family])}</Header>
            {group.styles.map((style) => (
              <ListBox.Item key={style.id} id={style.id} textValue={style.name} className="min-h-11">
                {style.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox.Section>
        ))}
      </ListBox>
    ),
    [groups, t],
  );

  const normalizedBreweryInput = normalizeSearchText(values.breweryName);
  const canSuggestBreweries = !isBreweriesPending && !isBreweriesError;
  const brewerySuggestions = useMemo(
    () =>
      canSuggestBreweries
        ? breweries.filter((brewery) => normalizeSearchText(brewery.name).includes(normalizedBreweryInput))
        : NO_BREWERY_SUGGESTIONS,
    [breweries, canSuggestBreweries, normalizedBreweryInput],
  );

  const selectedFamily = groups.find((group) => group.styles.some((style) => style.id === values.styleId))?.family;

  const forgetExistingBeer = () => {
    lookupToken.current += 1;
    setExistingBeer(null);
  };

  const resetForm = () => {
    forgetExistingBeer();
    setValues({ ...EMPTY_BEER_FORM, name: initialName });
    setServerErrors({});
    setHasAttemptedSubmit(false);
  };

  useEffect(() => {
    if (isOpen) {
      forgetExistingBeer();
      setValues({ ...EMPTY_BEER_FORM, name: initialName });
      setServerErrors({});
      setHasAttemptedSubmit(false);
    }
  }, [isOpen, initialName]);

  const updateValue = <TKey extends keyof BeerFormValues>(key: TKey, value: BeerFormValues[TKey]) => {
    setValues((previous) => ({ ...previous, [key]: value }));
    setServerErrors({});
    forgetExistingBeer();
  };

  const shownError = (errorKey: string | undefined): string | null =>
    hasAttemptedSubmit && errorKey !== undefined ? t(errorKey) : null;

  const handleOpenChange = (nextIsOpen: boolean) => {
    if (!nextIsOpen) resetForm();
    onOpenChange(nextIsOpen);
  };

  const handleCountryChange = (key: Key | null) => {
    if (typeof key === "string") updateValue("country", key);
  };

  const handleStyleChange = (key: Key | null) => {
    if (typeof key === "number") updateValue("styleId", key);
  };

  const send = async (newBeer: NonNullable<ReturnType<typeof formValuesToNewBeer>>) => {
    let isDuplicate = false;
    try {
      const beer = await mutateAsync(newBeer);
      onCreated(beer);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      isDuplicate = error instanceof HttpError && error.status === HttpStatusCodeEnum.CONFLICT;
    } finally {
      isSubmitting.current = false;
    }
    if (!isDuplicate) return;
    setServerErrors({ name: t("pages.encyclopedia.propose.duplicate") });
    const lookupId = lookupToken.current;
    const found = await loadExistingBeer(newBeer.name, newBeer.breweryName);
    if (lookupId === lookupToken.current) setExistingBeer(found);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting.current) return;
    setHasAttemptedSubmit(true);
    const newBeer = formValuesToNewBeer(values);
    if (newBeer === null || Object.keys(errorKeys).length > 0) return;
    isSubmitting.current = true;
    void send(newBeer);
  };

  return (
    <Drawer isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Drawer.Backdrop>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog>
            <Drawer.Handle />
            <Drawer.Header>
              <Drawer.Heading>{t("pages.encyclopedia.propose.title")}</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="flex max-h-[70dvh] min-w-0 flex-col gap-4 overflow-y-auto p-1">
              <Form
                id={PROPOSE_BEER_FORM_ID}
                validationBehavior="aria"
                validationErrors={serverErrors}
                onSubmit={handleSubmit}
                className="flex min-w-0 flex-col gap-4"
              >
                <TextField
                  isRequired
                  name="name"
                  value={values.name}
                  onChange={(name) => updateValue("name", name)}
                  validate={() => shownError(errorKeys.name)}
                >
                  <Label>{t("pages.encyclopedia.propose.name")}</Label>
                  <Input className="min-h-11" />
                  <FieldError />
                </TextField>
                {existingBeer !== null && (
                  <Link
                    to={buildBeerDetailPath(existingBeer.id)}
                    className="inline-flex min-h-11 items-center self-start font-bold text-link underline"
                  >
                    {t("pages.encyclopedia.propose.openExisting")}
                  </Link>
                )}
                <ComboBox
                  isRequired
                  allowsCustomValue
                  fullWidth
                  name="breweryName"
                  items={brewerySuggestions}
                  inputValue={values.breweryName}
                  onInputChange={(breweryName) => updateValue("breweryName", breweryName)}
                  validate={() => shownError(errorKeys.breweryName)}
                >
                  <Label>{t("pages.encyclopedia.propose.brewery")}</Label>
                  <ComboBox.InputGroup>
                    <Input className="min-h-11" />
                    <ComboBox.Trigger />
                  </ComboBox.InputGroup>
                  <ComboBox.Popover>
                    <ListBox>
                      {(brewery: Brewery) => (
                        <ListBox.Item id={brewery.id} textValue={brewery.name} className="min-h-11">
                          {brewery.name}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      )}
                    </ListBox>
                  </ComboBox.Popover>
                  <FieldError />
                </ComboBox>
                <Select
                  isRequired
                  fullWidth
                  name="country"
                  value={values.country}
                  onChange={handleCountryChange}
                  isInvalid={countryError !== null}
                >
                  <Label>{t("pages.encyclopedia.propose.country")}</Label>
                  <Select.Trigger className="min-h-11">
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>{countryList}</Select.Popover>
                  <FieldError>{countryError}</FieldError>
                </Select>
                {isStylesError && (
                  <Alert status="danger" role="alert">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>{t("pages.encyclopedia.filters.stylesError")}</Alert.Title>
                    </Alert.Content>
                    <Button size="lg" variant="danger-soft" onPress={() => void refetchStyles()}>
                      {t("common.retry")}
                    </Button>
                  </Alert>
                )}
                <Select
                  isRequired
                  fullWidth
                  isDisabled={isStylesPending}
                  name="styleId"
                  value={values.styleId}
                  onChange={handleStyleChange}
                  isInvalid={styleError !== null}
                >
                  <Label>{t("pages.encyclopedia.propose.style")}</Label>
                  <Select.Trigger className="min-h-11">
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>{styleList}</Select.Popover>
                  <FieldError>{styleError}</FieldError>
                </Select>
                {selectedFamily !== undefined && (
                  <Chip color="accent" variant="soft" className="self-start">
                    {t("pages.encyclopedia.propose.family", { family: t(BEER_FAMILY_LABEL_KEYS[selectedFamily]) })}
                  </Chip>
                )}
                <NumberField
                  isRequired
                  name="abv"
                  value={values.abv}
                  onChange={(abv) => updateValue("abv", abv)}
                  validate={() => shownError(errorKeys.abv)}
                >
                  <Label>{t("pages.encyclopedia.propose.abv")}</Label>
                  <NumberField.Group className="min-h-11">
                    <NumberField.Input />
                  </NumberField.Group>
                  <FieldError />
                </NumberField>
                <TextField
                  name="description"
                  value={values.description}
                  onChange={(description) => updateValue("description", description)}
                  validate={() => shownError(errorKeys.description)}
                >
                  <Label>{t("pages.encyclopedia.propose.description")}</Label>
                  <TextArea />
                  <FieldError />
                </TextField>
              </Form>
            </Drawer.Body>
            <Drawer.Footer>
              <Button slot="close" variant="secondary" size="lg">
                {t("pages.encyclopedia.propose.close")}
              </Button>
              <Button type="submit" form={PROPOSE_BEER_FORM_ID} variant="primary" size="lg" isPending={isPending}>
                {t("pages.encyclopedia.propose.submit")}
              </Button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
};
