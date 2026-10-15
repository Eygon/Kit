import { Button, Chip } from "@heroui/react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useVoteCorrectionMutation } from "@/hooks/corrections/useVoteCorrectionMutation";
import type { CorrectionCardProps } from "@/types/components/correctionCard";
import { BEER_CHARACTERISTIC_LABEL_KEYS } from "@/types/enums/beer/beerCharacteristicEnum";
import { CORRECTION_STATUS_LABEL_KEYS, CorrectionStatusEnum } from "@/types/enums/correction/correctionStatusEnum";
import { CORRECTION_VOTE_SENSE_LABEL_KEYS, CorrectionVoteSenseEnum } from "@/types/enums/correction/correctionVoteSenseEnum";
import { buildBeerDetailPath } from "@/types/enums/routing/routePathEnum";
import { formatCharacteristicValue } from "@/utils/beer/formatCharacteristicValue";
import { formatCheckinDate } from "@/utils/date/formatCheckinDate";
import { formatTimeUntil } from "@/utils/date/formatTimeUntil";

const BEER_LINK_CLASSES = "min-h-11 break-words text-accent focus-visible:focus-ring";

export const CorrectionCard = ({ correction, isBeerShown = false }: CorrectionCardProps) => {
  const { t, i18n } = useTranslation();
  const { mutate } = useVoteCorrectionMutation();
  const isVoting = useRef(false);
  const [pendingSense, setPendingSense] = useState<CorrectionVoteSenseEnum | null>(null);

  const { status, resolvedAt } = correction;

  const handleVote = (sense: CorrectionVoteSenseEnum) => {
    if (isVoting.current) return;
    isVoting.current = true;
    setPendingSense(sense);
    mutate(
      { correctionId: correction.id, sense },
      {
        onSettled: () => {
          isVoting.current = false;
          setPendingSense(null);
        },
      },
    );
  };

  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-mousse border-mousse bg-surface p-3">
      {isBeerShown && (
        <div className="flex min-w-0 flex-col">
          <Link to={buildBeerDetailPath(correction.beerId)} className={BEER_LINK_CLASSES}>
            {correction.beerName}
          </Link>
          <span className="text-sm break-words text-muted">{t(BEER_CHARACTERISTIC_LABEL_KEYS[correction.characteristic])}</span>
        </div>
      )}
      <p className="break-words">
        {t("corrections.change", {
          current: formatCharacteristicValue(correction.characteristic, correction.currentValue, t, i18n.language),
          proposed: formatCharacteristicValue(correction.characteristic, correction.proposedValue, t, i18n.language),
        })}
      </p>
      <p className="text-sm break-words text-muted">{t("corrections.proposedBy", { name: correction.proposedByName })}</p>
      {correction.reason !== "" && <p className="whitespace-pre-line break-words">{correction.reason}</p>}
      <p className="text-sm text-muted">
        {t("corrections.tally", { agree: correction.agreeCount, disagree: correction.disagreeCount })}
      </p>
      {status === CorrectionStatusEnum.OPEN ? (
        <>
          <span className="text-sm text-muted">
            {t("corrections.vote.closesIn", { time: formatTimeUntil(correction.closesAt, i18n.language, new Date()) })}
          </span>
          {correction.isMine ? (
            <p className="font-bold">{t("corrections.vote.mine")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.values(CorrectionVoteSenseEnum).map((sense) => (
                <Button
                  key={sense}
                  size="lg"
                  variant={correction.myVote === sense ? "primary" : "tertiary"}
                  aria-pressed={correction.myVote === sense}
                  isPending={pendingSense === sense}
                  isDisabled={pendingSense !== null && pendingSense !== sense}
                  onPress={() => handleVote(sense)}
                >
                  {t(CORRECTION_VOTE_SENSE_LABEL_KEYS[sense])}
                </Button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Chip color={status === CorrectionStatusEnum.ACCEPTED ? "accent" : "default"} variant="primary">
            {t(CORRECTION_STATUS_LABEL_KEYS[status])}
          </Chip>
          {resolvedAt !== null && (
            <span className="text-sm text-muted">{t("corrections.resolvedOn", { date: formatCheckinDate(resolvedAt, i18n.language) })}</span>
          )}
        </div>
      )}
    </div>
  );
};
