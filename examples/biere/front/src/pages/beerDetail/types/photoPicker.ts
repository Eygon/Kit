export type PhotoPickerProps = Readonly<{
  file: File | null;
  onChange: (file: File | null) => void;
}>;
