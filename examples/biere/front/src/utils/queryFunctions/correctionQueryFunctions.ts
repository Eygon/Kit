import CorrectionService from "@/api/corrections/correctionService";
import type { NewCorrection } from "@/types/models/correction/newCorrection";
import type { CorrectionVoteSenseEnum } from "@/types/enums/correction/correctionVoteSenseEnum";

export const fetchBeerCorrections = (beerId: number) => CorrectionService.getForBeer(beerId);

export const fetchCorrectionBoard = () => CorrectionService.getBoard();

export const voteCorrection = (correctionId: number, sense: CorrectionVoteSenseEnum) =>
  CorrectionService.vote(correctionId, sense);

export const proposeCorrection = (beerId: number, newCorrection: NewCorrection) =>
  CorrectionService.propose(beerId, newCorrection);
