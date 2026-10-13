import type { Checkin } from "@/types/models/checkin/checkin";

export interface CheckinPage {
  items: Checkin[];
  total: number;
  page: number;
  size: number;
}
