import { Alert, Button, Skeleton } from "@heroui/react";
import { useId, useRef } from "react";
import { useTranslation } from "react-i18next";
import { EmptyStatePanel } from "@/components/elements/emptyStatePanel/emptyStatePanel";
import { CommunityCriteria } from "@/pages/beerDetail/components/elements/communityCriteria/communityCriteria";
import { RatingHistogram } from "@/pages/beerDetail/components/elements/ratingHistogram/ratingHistogram";
import { ReviewEntry } from "@/pages/beerDetail/components/elements/reviewEntry/reviewEntry";
import { StarRating } from "@/pages/beerDetail/components/elements/starRating/starRating";
import { ReviewSheet } from "@/pages/beerDetail/components/widgets/reviewSheet/reviewSheet";
import { useBeerReviewsQuery } from "@/pages/beerDetail/hooks/useBeerReviewsQuery";
import type { ReviewsSectionProps } from "@/pages/beerDetail/types/reviewsSection";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";
import { formatRating } from "@/utils/beer/formatRating";

const SKELETON_ROW_KEYS = ["first", "second", "third"];

export const ReviewsSection = ({ beer }: ReviewsSectionProps) => {
  const { t, i18n } = useTranslation();
  const titleId = useId();
  const { averageRating, reviewCount, ratingDistribution, criteria } = beer;
  const { mine, reviews, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useBeerReviewsQuery(beer.id);
  const isLoadingMore = useRef(false);

  const loadMore = async () => {
    if (isLoadingMore.current) return;
    isLoadingMore.current = true;
    try {
      await fetchNextPage();
    } finally {
      isLoadingMore.current = false;
    }
  };

  const hasNoTastingYet = mine === null && beer.checkinCount === 0;
  const hasReviews = mine !== null || reviews.length > 0;
  const retry = hasNextPage ? loadMore : refetch;

  const renderSummary = () => {
    if (averageRating === null) return <p className="text-muted">{t("pages.beerDetail.reviews.noRating")}</p>;

    const rating = formatRating(averageRating, i18n.language);
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-display text-4xl text-foreground">{rating}</p>
        <StarRating value={averageRating} label={t("pages.beerDetail.reviews.ratingLabel", { rating })} />
        <p>{t("pages.beerDetail.reviews.count", { count: reviewCount })}</p>
      </div>
    );
  };

  const errorAlert = (
    <Alert status="danger" role="alert">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{t("pages.beerDetail.reviews.list.errorTitle")}</Alert.Title>
      </Alert.Content>
      <Button size="lg" variant="danger-soft" onPress={() => void retry()}>
        {t("common.retry")}
      </Button>
    </Alert>
  );

  const renderList = () => {
    if (isPending)
      return (
        <div aria-busy="true" className="flex flex-col gap-3">
          {SKELETON_ROW_KEYS.map((key) => (
            <Skeleton key={key} className="h-20 w-full" />
          ))}
        </div>
      );
    if (!hasReviews && isError) return errorAlert;
    if (!hasReviews)
      return (
        <EmptyStatePanel
          mood={MascotMoodEnum.SEARCHING}
          title={t("pages.beerDetail.reviews.list.emptyTitle")}
          description={t("pages.beerDetail.reviews.list.emptyDescription")}
        />
      );

    return (
      <>
        <ul className="flex flex-col gap-3">
          {mine !== null && <ReviewEntry review={mine} />}
          {reviews.map((review) => (
            <ReviewEntry key={review.id} review={review} />
          ))}
        </ul>
        {isError && errorAlert}
        {hasNextPage && (
          <div>
            <Button variant="secondary" size="lg" isPending={isFetchingNextPage} onPress={() => void loadMore()}>
              {t("pages.beerDetail.reviews.list.loadMore")}
            </Button>
          </div>
        )}
      </>
    );
  };

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <h2 id={titleId} className="font-display text-xl text-foreground">
        {t("pages.beerDetail.reviews.title")}
      </h2>
      <div className="flex flex-col items-start gap-2">
        <ReviewSheet beer={beer} mine={mine} isDisabled={isPending || isError || hasNoTastingYet} />
        {hasNoTastingYet && <p className="text-muted">{t("pages.beerDetail.reviews.checkinRequired")}</p>}
      </div>
      <div className="flex flex-col gap-4 rounded-mousse border-mousse bg-surface p-4 shadow-mousse">
        {renderSummary()}
        <RatingHistogram distribution={ratingDistribution} reviewCount={reviewCount} />
        <CommunityCriteria criteria={criteria} />
      </div>
      {renderList()}
    </section>
  );
};
