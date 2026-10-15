import { useQuery } from "@tanstack/react-query";
import { queryTimes } from "@/config/tanstackQuery";
import { fetchBeerCorrections } from "@/utils/queryFunctions/correctionQueryFunctions";
import { correctionKeys } from "@/utils/queryKeys/correctionQueryKeys";

export const useBeerCorrectionsQuery = (beerId: number) => {
  const { data, isPending, isError } = useQuery({
    queryKey: correctionKeys.forBeer(beerId),
    queryFn: () => fetchBeerCorrections(beerId),
    ...queryTimes.short,
  });

  return { corrections: data ?? [], isPending, isError };
};
