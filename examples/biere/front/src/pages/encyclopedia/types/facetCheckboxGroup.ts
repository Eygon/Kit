export type FacetCheckboxOption = Readonly<{
  value: string;
  label: string;
  count: number;
}>;

export type FacetCheckboxGroupProps = Readonly<{
  label: string;
  options: FacetCheckboxOption[];
  value: string[];
  onChange: (values: string[]) => void;
}>;
