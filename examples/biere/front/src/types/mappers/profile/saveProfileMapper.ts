import type { SaveProfileDto } from "@/types/dtos/profile/saveProfileDto";
import type { ProfileChanges } from "@/types/models/profile/profileChanges";

export const buildSaveProfileDto = (changes: ProfileChanges): SaveProfileDto => ({
  displayName: changes.displayName.trim(),
  avatar: changes.avatar,
});
