import type { ButtonProps } from "@heroui/react";

export enum VoteSenseEnum {
  STILL = "still",
  GONE = "gone",
}

export const VOTE_SENSE_LABEL_KEYS: Record<VoteSenseEnum, string> = {
  [VoteSenseEnum.STILL]: "pages.map.vote.still",
  [VoteSenseEnum.GONE]: "pages.map.vote.gone",
};

export const VOTE_SENSE_ARIA_LABEL_KEYS: Record<VoteSenseEnum, string> = {
  [VoteSenseEnum.STILL]: "pages.map.vote.stillLabel",
  [VoteSenseEnum.GONE]: "pages.map.vote.goneLabel",
};

export const VOTE_SENSE_BUTTON_VARIANTS: Record<VoteSenseEnum, ButtonProps["variant"]> = {
  [VoteSenseEnum.STILL]: "secondary",
  [VoteSenseEnum.GONE]: "tertiary",
};
