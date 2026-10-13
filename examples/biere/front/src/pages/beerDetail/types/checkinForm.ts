import type { CreatedCheckin } from "@/types/models/checkin/createdCheckin";

export type CheckinFormProps = Readonly<{
  beerId: number;
  onSaved: (created: CreatedCheckin) => void;
}>;
