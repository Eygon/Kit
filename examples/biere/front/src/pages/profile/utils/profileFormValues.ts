import type { ProfileFormValues } from "@/pages/profile/types/profileFormValues";
import type { Profile } from "@/types/models/profile/profile";
import type { ProfileChanges } from "@/types/models/profile/profileChanges";

export const PROFILE_NAME_MIN_LENGTH = 2;
export const PROFILE_NAME_MAX_LENGTH = 24;

export const profileToFormValues = (profile: Profile): ProfileFormValues => ({
  displayName: profile.displayName,
  avatar: profile.avatar,
});

export const formValuesToProfileChanges = (values: ProfileFormValues): ProfileChanges => ({
  displayName: values.displayName,
  avatar: values.avatar,
});

export const isDisplayNameValid = (displayName: string): boolean => {
  const { length } = displayName.trim();
  return length >= PROFILE_NAME_MIN_LENGTH && length <= PROFILE_NAME_MAX_LENGTH;
};
