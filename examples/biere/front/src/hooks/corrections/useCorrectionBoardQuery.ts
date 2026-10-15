import { useQuery } from "@tanstack/react-query";
import { queryTimes } from "@/config/tanstackQuery";
import type { CorrectionBoard } from "@/types/models/correction/correctionBoard";
import { fetchCorrectionBoard } from "@/utils/queryFunctions/correctionQueryFunctions";
import { correctionKeys } from "@/utils/queryKeys/correctionQueryKeys";

const EMPTY_BOARD: CorrectionBoard = { open: [], recentlyClosed: [], pendingCount: 0 };

export const useCorrectionBoardQuery = () => {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: correctionKeys.board(),
    queryFn: fetchCorrectionBoard,
    ...queryTimes.short,
  });

  return { board: data ?? EMPTY_BOARD, isPending, isError, refetch };
};
