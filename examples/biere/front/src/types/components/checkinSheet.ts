import type { ReactNode } from "react";
import type { Beer } from "@/types/models/beer/beer";
import type { Checkin } from "@/types/models/checkin/checkin";

export type CheckinSheetProps =
  | Readonly<{ beer: Beer }>
  | Readonly<{ checkin: Checkin; renderDeleteAction: (close: () => void) => ReactNode }>;
