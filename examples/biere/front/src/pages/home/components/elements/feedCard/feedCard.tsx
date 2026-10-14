import { Chip } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { CheckinPhoto } from "@/components/elements/checkinPhoto/checkinPhoto";
import { UserAvatar } from "@/components/elements/userAvatar/userAvatar";
import type { FeedCardProps } from "@/pages/home/types/feedCard";
import { FeedItemKindEnum } from "@/types/enums/feed/feedItemKindEnum";
import { buildBeerDetailPath, buildUserProfilePath } from "@/types/enums/routing/routePathEnum";
import { LEVEL_TITLE_LABEL_KEYS } from "@/types/enums/user/levelTitleEnum";
import { formatRating } from "@/utils/beer/formatRating";
import { formatRelativeTime } from "@/utils/date/formatRelativeTime";

const LINK_CLASSES = "inline-flex min-h-11 items-center break-words focus-visible:focus-ring";
const SENTENCE_LINK_CLASSES = `${LINK_CLASSES} text-accent underline underline-offset-2`;
const BADGE_CLASSES = "shrink-0 rounded-full border-mousse bg-highlight px-3 py-0.5 font-display text-sm text-highlight-foreground";

export const FeedCard = ({ item, now }: FeedCardProps) => {
  const { t, i18n } = useTranslation();
  const { actor, beerId, reachedLevel, reachedTitle } = item;
  const isCheckin = item.kind === FeedItemKindEnum.CHECKIN && beerId !== null;
  const hasDiscoveries = item.kind === FeedItemKindEnum.DISCOVERIES && item.discoveryCount !== null;
  const hasLevelUp =
    item.kind === FeedItemKindEnum.LEVEL_UP && reachedLevel !== null && reachedTitle !== null;
  const isReview = item.kind === FeedItemKindEnum.REVIEW && beerId !== null;
  const hasReviewText = item.reviewText !== null && item.reviewText !== "";
  const ratingText =
    item.rating === null ? null : new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }).format(item.rating);

  return (
    <li className="flex min-w-0 flex-col gap-2 rounded-mousse border-mousse bg-surface p-3 shadow-mousse">
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar avatar={actor.avatar} isDecorative />
        <div className="flex min-w-0 flex-1 flex-col">
          <Link to={buildUserProfilePath(actor.id)} className={`${LINK_CLASSES} font-bold`}>
            {actor.displayName}
          </Link>
          <span className="break-words text-sm text-muted">
            {t("level.short", { level: actor.level, title: t(LEVEL_TITLE_LABEL_KEYS[actor.title]) })}
          </span>
        </div>
        <time dateTime={item.occurredAt} className="shrink-0 text-sm text-muted">
          {formatRelativeTime(item.occurredAt, i18n.language, now)}
        </time>
      </div>
      {isCheckin && (
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="break-words">
              {t("pages.home.feed.drank")}{" "}
              <Link to={buildBeerDetailPath(beerId)} className={SENTENCE_LINK_CLASSES}>
                {item.beerName}
              </Link>
            </p>
            {item.place !== null && <span className="break-words text-sm text-muted">{item.place}</span>}
            {item.isDiscovery && (
              <Chip color="accent" variant="primary" className="mt-1 w-fit">
                {t("pages.home.feed.discovery")}
              </Chip>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {item.photoId !== null && <CheckinPhoto photoId={item.photoId} alt={t("common.photo.alt")} />}
            {ratingText !== null && (
              <span className="shrink-0 rounded-full border-mousse bg-highlight px-3 py-0.5 font-display text-sm text-highlight-foreground">
                <span aria-hidden="true">{t("pages.home.feed.rating", { rating: ratingText })}</span>
                <span className="sr-only">{t("pages.home.feed.ratingLabel", { rating: ratingText })}</span>
              </span>
            )}
          </div>
        </div>
      )}
      {hasDiscoveries && <p className="break-words">{t("pages.home.feed.discoveries", { count: item.discoveryCount })}</p>}
      {hasLevelUp && (
        <div className="flex min-w-0 items-center justify-between gap-3">
          <p className="min-w-0 flex-1 break-words">
            {t("pages.home.feed.levelUp", {
              level: reachedLevel,
              title: t(LEVEL_TITLE_LABEL_KEYS[reachedTitle]),
            })}
          </p>
          <span className={BADGE_CLASSES}>
            {t("level.short", { level: reachedLevel, title: t(LEVEL_TITLE_LABEL_KEYS[reachedTitle]) })}
          </span>
        </div>
      )}
      {isReview && (
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <p className="min-w-0 flex-1 break-words">
              {t("pages.home.feed.reviewed")}{" "}
              <Link to={buildBeerDetailPath(beerId)} className={SENTENCE_LINK_CLASSES}>
                {item.beerName}
              </Link>
            </p>
            {item.rating !== null && (
              <span className={BADGE_CLASSES}>
                <span aria-hidden="true">{formatRating(item.rating, i18n.language)}</span>
                <span className="sr-only">
                  {t("pages.home.feed.ratingLabel", { rating: formatRating(item.rating, i18n.language) })}
                </span>
              </span>
            )}
          </div>
          {hasReviewText && <p className="line-clamp-3 break-words">{item.reviewText}</p>}
        </div>
      )}
    </li>
  );
};
