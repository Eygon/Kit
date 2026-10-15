import { httpClient } from "@/api/httpClient";
import { HttpError } from "@/api/httpError";
import type { CorrectionDto } from "@/types/dtos/correction/correctionDto";
import type { SaveCorrectionVoteDto } from "@/types/dtos/correction/saveCorrectionVoteDto";
import type { CorrectionVoteSenseEnum } from "@/types/enums/correction/correctionVoteSenseEnum";
import { HttpStatusCodeEnum } from "@/types/enums/http/httpStatusCodeEnum";
import type { CorrectionBoardDto } from "@/types/dtos/correction/correctionBoardDto";
import { correctionBoardDtoToModel } from "@/types/mappers/correction/correctionBoardMapper";
import { correctionDtoToModel } from "@/types/mappers/correction/correctionMapper";
import { newCorrectionToDto } from "@/types/mappers/correction/newCorrectionMapper";
import type { Correction } from "@/types/models/correction/correction";
import type { CorrectionBoard } from "@/types/models/correction/correctionBoard";
import type { NewCorrection } from "@/types/models/correction/newCorrection";
import { BEER_CORRECTIONS, CORRECTION_VOTE, CORRECTIONS } from "@/utils/apiURL/apiURL";
import { DisplayError } from "@/utils/displayError/displayError";
import { getErrorTranslationKey } from "@/utils/displayError/getErrorTranslationKey";

const isCorrection = (correction: Correction | null): correction is Correction => correction !== null;

const getVoteErrorTranslationKey = (error: unknown): string => {
  if (error instanceof HttpError && error.status === HttpStatusCodeEnum.CONFLICT) return "corrections.vote.closed";
  if (error instanceof HttpError && error.status === HttpStatusCodeEnum.FORBIDDEN) return "corrections.vote.own";
  return getErrorTranslationKey(error);
};

const getProposeCorrectionErrorTranslationKey = (error: unknown): string => {
  if (error instanceof HttpError && error.status === HttpStatusCodeEnum.CONFLICT) return "corrections.propose.alreadyOpen";
  if (error instanceof HttpError && error.status === HttpStatusCodeEnum.TOO_MANY_REQUESTS) return "corrections.propose.limitReached";
  if (error instanceof HttpError && error.status === HttpStatusCodeEnum.FORBIDDEN) return "corrections.propose.notAllowed";
  return getErrorTranslationKey(error);
};

export default class CorrectionService {
  static async getForBeer(beerId: number): Promise<Correction[]> {
    const response = await httpClient.get<CorrectionDto[]>(BEER_CORRECTIONS(beerId));
    if (response.data === null) return [];
    return response.data.map(correctionDtoToModel).filter(isCorrection);
  }

  static async getBoard(): Promise<CorrectionBoard> {
    const response = await httpClient.get<CorrectionBoardDto>(CORRECTIONS());
    if (response.data === null) return { open: [], recentlyClosed: [], pendingCount: 0 };
    return correctionBoardDtoToModel(response.data);
  }

  static async vote(correctionId: number, sense: CorrectionVoteSenseEnum): Promise<Correction> {
    try {
      const body: SaveCorrectionVoteDto = { sense };
      const response = await httpClient.put<CorrectionDto>(CORRECTION_VOTE(correctionId), body);
      if (response.data === null) throw new Error("Empty vote response");
      const correction = correctionDtoToModel(response.data);
      if (correction === null) throw new Error("Unknown correction characteristic");
      return correction;
    } catch (error) {
      DisplayError(error, getVoteErrorTranslationKey);
      throw error;
    }
  }

  static async propose(beerId: number, newCorrection: NewCorrection): Promise<Correction> {
    try {
      const response = await httpClient.post<CorrectionDto>(BEER_CORRECTIONS(beerId), newCorrectionToDto(newCorrection));
      if (response.data === null) throw new Error("Empty propose response");
      const correction = correctionDtoToModel(response.data);
      if (correction === null) throw new Error("Unknown correction characteristic");
      return correction;
    } catch (error) {
      DisplayError(error, getProposeCorrectionErrorTranslationKey);
      throw error;
    }
  }
}
