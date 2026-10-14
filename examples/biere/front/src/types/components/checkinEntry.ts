import type { ReactNode } from "react";
import type { Checkin } from "@/types/models/checkin/checkin";

export type CheckinEntryProps = Readonly<{
  checkin: Checkin;
  showBeer: boolean;
  actions?: ReactNode;
}>;
