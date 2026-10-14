import { useCallback } from "react";
import type { CheckinFormValues } from "@/components/modules/checkinSheet/types/checkinFormValues";
import {
  clearCheckinDraft,
  getCheckinDraft,
  isBlankCheckinForm,
  saveCheckinDraft,
} from "@/components/modules/checkinSheet/utils/checkinDraftStore";
import { getCurrentUserId } from "@/utils/currentUser/getCurrentUserId";

export const useCheckinDraft = (beerId: number) => {
  const draft = getCheckinDraft(getCurrentUserId(), beerId);

  const clearDraft = useCallback(() => clearCheckinDraft(getCurrentUserId(), beerId), [beerId]);

  const saveDraft = useCallback(
    (values: CheckinFormValues) => {
      if (isBlankCheckinForm(values)) clearDraft();
      else saveCheckinDraft(getCurrentUserId(), beerId, values);
    },
    [beerId, clearDraft],
  );

  return { draft, saveDraft, clearDraft };
};
