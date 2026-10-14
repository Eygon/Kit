import type { ReactNode } from "react";
import type { ProfileSummary } from "@/types/models/profile/profileSummary";

export type ProfileRowProps = Readonly<{
  profile: ProfileSummary;
  action?: ReactNode;
}>;
