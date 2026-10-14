import { useCallback } from "react";
import { useSearchParams } from "react-router";
import { UNDRUNK_ONLY_PARAM, URL_FLAG_ENABLED_VALUE } from "@/pages/map/utils/mapConstants";

export const useUndrunkOnlyFilter = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isUndrunkOnly = searchParams.get(UNDRUNK_ONLY_PARAM) === URL_FLAG_ENABLED_VALUE;

  const setUndrunkOnly = useCallback(
    (next: boolean) =>
      setSearchParams(
        (previous) => {
          const params = new URLSearchParams(previous);
          if (next) params.set(UNDRUNK_ONLY_PARAM, URL_FLAG_ENABLED_VALUE);
          else params.delete(UNDRUNK_ONLY_PARAM);
          return params;
        },
        { replace: true },
      ),
    [setSearchParams],
  );

  return { isUndrunkOnly, setUndrunkOnly };
};
