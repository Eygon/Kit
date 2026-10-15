export enum CorrectionVoteSenseEnum {
  AGREE = "agree",
  DISAGREE = "disagree",
}

export const CORRECTION_VOTE_SENSE_LABEL_KEYS: Record<CorrectionVoteSenseEnum, string> = {
  [CorrectionVoteSenseEnum.AGREE]: "corrections.vote.agree",
  [CorrectionVoteSenseEnum.DISAGREE]: "corrections.vote.disagree",
};

export const isCorrectionVoteSense = (value: unknown): value is CorrectionVoteSenseEnum =>
  Object.values(CorrectionVoteSenseEnum).some((sense) => sense === value);
