import type { ReactNode } from "react";
import type { Profile } from "@/types/models/profile/profile";

export type ProfileHeaderProps = Readonly<{
  profile: Profile | null;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  action?: ReactNode;
}>;
