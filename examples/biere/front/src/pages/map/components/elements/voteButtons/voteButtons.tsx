import { Button } from "@heroui/react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useVoteMutation } from "@/pages/map/hooks/useVoteMutation";
import type { VoteButtonsProps } from "@/pages/map/types/voteButtons";
import {
  VOTE_SENSE_ARIA_LABEL_KEYS,
  VOTE_SENSE_BUTTON_VARIANTS,
  VOTE_SENSE_LABEL_KEYS,
  VoteSenseEnum,
} from "@/types/enums/venue/voteSenseEnum";

const HOUR_MS = 60 * 60 * 1000;

export const VoteButtons = ({ venueId, venueBeer }: VoteButtonsProps) => {
  const { t } = useTranslation();
  const { mutate } = useVoteMutation(venueId);
  const isVoting = useRef(false);
  const [pendingSense, setPendingSense] = useState<VoteSenseEnum | null>(null);
  const now = new Date();
  const remainingMs = venueBeer.nextVoteAt === null ? 0 : venueBeer.nextVoteAt.getTime() - now.getTime();
  const isCoolingDown = remainingMs > 0;
  const cooldownHours = Math.ceil(remainingMs / HOUR_MS);

  const handleVote = (sense: VoteSenseEnum) => {
    if (isVoting.current) return;
    isVoting.current = true;
    setPendingSense(sense);
    mutate(
      { beerId: venueBeer.beerId, sense },
      {
        onSettled: () => {
          isVoting.current = false;
          setPendingSense(null);
        },
      },
    );
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {Object.values(VoteSenseEnum).map((sense) => (
          <Button
            key={sense}
            size="lg"
            variant={VOTE_SENSE_BUTTON_VARIANTS[sense]}
            className="min-h-11"
            aria-label={t(VOTE_SENSE_ARIA_LABEL_KEYS[sense], { beer: venueBeer.beerName })}
            isPending={pendingSense === sense}
            isDisabled={isCoolingDown || (pendingSense !== null && pendingSense !== sense)}
            onPress={() => handleVote(sense)}
          >
            {t(VOTE_SENSE_LABEL_KEYS[sense])}
          </Button>
        ))}
      </div>
      {isCoolingDown && <p className="min-w-0 text-sm break-words text-muted">{t("pages.map.vote.cooldown", { count: cooldownHours })}</p>}
    </div>
  );
};
