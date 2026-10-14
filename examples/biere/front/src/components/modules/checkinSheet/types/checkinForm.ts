import type { CheckinFormValues } from "@/components/modules/checkinSheet/types/checkinFormValues";

export type CheckinFormProps = Readonly<{
  initialValues: CheckinFormValues;
  isPhotoEditable: boolean;
  submitLabel: string;
  isSaving: boolean;
  onSubmit: (values: CheckinFormValues) => Promise<void>;
  onValuesChange?: (values: CheckinFormValues) => void;
}>;
