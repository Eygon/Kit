import {
  Checkbox,
  CheckboxGroup,
  Description,
  FieldError,
  Label,
  NumberField,
  Slider,
  Tag,
  TagGroup,
} from "@heroui/react";
import type { Selection } from "@heroui/react";
import { useTranslation } from "react-i18next";
import {
  BEER_AROMAS_MAX,
  BEER_CHARACTERISTIC_BOUNDS,
  BEER_SCALE_MAX,
  BEER_SCALE_MIN,
  BEER_SCALE_NONE,
} from "@/constants/beerSpecsConstants";
import type { CharacteristicFieldProps } from "@/types/components/characteristicField";
import { BEER_AROMA_LABEL_KEYS, BeerAromaEnum, isBeerAroma } from "@/types/enums/beer/beerAromaEnum";
import {
  BEER_CHARACTERISTIC_LABEL_KEYS,
  BEER_SCALE_LEVEL_LABEL_KEYS,
  BeerCharacteristicEnum,
} from "@/types/enums/beer/beerCharacteristicEnum";
import { BEER_FORMAT_LABEL_KEYS, BeerFormatEnum, isBeerFormat } from "@/types/enums/beer/beerFormatEnum";

const RANGE_HINT_KEY = "beer.characteristics.errors.range";
const LIST_SIZE_HINT_KEY = "beer.characteristics.errors.listSize";
const NOT_AVAILABLE_KEY = "beer.characteristics.notAvailable";
const ERROR_CLASSES = "text-sm text-danger";

export const CharacteristicField = ({
  characteristic,
  value,
  onChange,
  isRequired,
  errorMessage,
}: CharacteristicFieldProps) => {
  const { t } = useTranslation();
  const label = t(BEER_CHARACTERISTIC_LABEL_KEYS[characteristic]);
  const bounds = BEER_CHARACTERISTIC_BOUNDS[characteristic];
  const hasError = errorMessage !== null;
  const numberValue = typeof value === "number" ? value : Number.NaN;
  const listValue = Array.isArray(value) ? value : [];

  const errorAlert = hasError ? (
    <p role="alert" className={ERROR_CLASSES}>
      {errorMessage}
    </p>
  ) : null;

  const handleScaleChange = (nextValue: number | number[]) => {
    if (!Array.isArray(nextValue)) onChange(nextValue);
  };

  const handleAromasChange = (selection: Selection) => {
    if (selection !== "all") onChange([...selection].filter(isBeerAroma));
  };

  const handleFormatsChange = (formats: string[]) => {
    onChange(formats.filter(isBeerFormat));
  };

  if (characteristic === BeerCharacteristicEnum.AROMAS) {
    const disabledAromas =
      listValue.length >= BEER_AROMAS_MAX
        ? Object.values(BeerAromaEnum).filter((aroma) => !listValue.includes(aroma))
        : [];
    return (
      <TagGroup
        selectionMode="multiple"
        selectedKeys={listValue}
        onSelectionChange={handleAromasChange}
        disabledKeys={disabledAromas}
        className="min-w-0"
      >
        <Label>{label}</Label>
        <TagGroup.List className="flex flex-wrap gap-2 p-1">
          {Object.values(BeerAromaEnum).map((aroma) => (
            <Tag key={aroma} id={aroma} className="min-h-11">
              {t(BEER_AROMA_LABEL_KEYS[aroma])}
            </Tag>
          ))}
        </TagGroup.List>
        {hasError ? errorAlert : <Description>{t(LIST_SIZE_HINT_KEY, bounds)}</Description>}
      </TagGroup>
    );
  }

  if (characteristic === BeerCharacteristicEnum.FORMATS) {
    return (
      <CheckboxGroup name={characteristic} value={listValue} onChange={handleFormatsChange} className="min-w-0 gap-1">
        <Label>{label}</Label>
        <div className="flex flex-wrap gap-2">
          {Object.values(BeerFormatEnum).map((format) => (
            <Checkbox key={format} value={format} className="min-w-0">
              <Checkbox.Content className="min-h-11 min-w-0 flex-row items-center justify-start gap-3">
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <Label>{t(BEER_FORMAT_LABEL_KEYS[format])}</Label>
              </Checkbox.Content>
            </Checkbox>
          ))}
        </div>
        {hasError ? errorAlert : <Description>{t(LIST_SIZE_HINT_KEY, bounds)}</Description>}
      </CheckboxGroup>
    );
  }

  const levelLabelKeys = BEER_SCALE_LEVEL_LABEL_KEYS[characteristic];
  if (levelLabelKeys !== undefined) {
    const levelLabelKey = levelLabelKeys[numberValue - BEER_SCALE_MIN];
    return (
      <Slider
        minValue={isRequired ? BEER_SCALE_MIN : BEER_SCALE_NONE}
        maxValue={BEER_SCALE_MAX}
        step={1}
        value={numberValue}
        onChange={handleScaleChange}
        className="min-w-0"
      >
        <Label>{label}</Label>
        <Slider.Output>{levelLabelKey === undefined ? t(NOT_AVAILABLE_KEY) : t(levelLabelKey)}</Slider.Output>
        <Slider.Track className="min-h-11">
          <Slider.Fill />
          <Slider.Thumb />
        </Slider.Track>
        {errorAlert}
      </Slider>
    );
  }

  return (
    <NumberField
      isRequired={isRequired}
      name={characteristic}
      value={numberValue}
      onChange={onChange}
      isInvalid={hasError}
      className="min-w-0"
    >
      <Label>{label}</Label>
      <NumberField.Group className="min-h-11">
        <NumberField.Input />
      </NumberField.Group>
      {hasError ? null : <Description>{t(RANGE_HINT_KEY, bounds)}</Description>}
      <FieldError>{errorMessage}</FieldError>
    </NumberField>
  );
};
