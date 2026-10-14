import { Alert, Button, Skeleton } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { EmptyStatePanel } from "@/components/elements/emptyStatePanel/emptyStatePanel";
import { PageHeader } from "@/components/elements/pageHeader/pageHeader";
import { CollectionNameSheet } from "@/components/widgets/collectionNameSheet/collectionNameSheet";
import { CollectionBeerRow } from "@/pages/collection/components/elements/collectionBeerRow/collectionBeerRow";
import { DeleteCollectionButton } from "@/pages/collection/components/elements/deleteCollectionButton/deleteCollectionButton";
import { useCollectionQuery } from "@/pages/collection/hooks/useCollectionQuery";
import { useRemoveCollectionBeerMutation } from "@/pages/collection/hooks/useRemoveCollectionBeerMutation";
import { useRenameCollectionMutation } from "@/pages/collection/hooks/useRenameCollectionMutation";
import { CollectionKindEnum } from "@/types/enums/collection/collectionKindEnum";
import { CollectionNameSheetModeEnum } from "@/types/enums/collection/collectionNameSheetModeEnum";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";
import {
  buildUserProfilePath,
  parseBeerIdParam,
  RoutePathEnum,
} from "@/types/enums/routing/routePathEnum";
import { getCurrentUserId } from "@/utils/currentUser/getCurrentUserId";

const SKELETON_ROW_COUNT = 3;
const SKELETON_ROW_KEYS = Array.from(
  { length: SKELETON_ROW_COUNT },
  (_, index) => index,
);
const LIST_CLASSES = "flex flex-col gap-3";

export const CollectionPage = () => {
  const { t } = useTranslation();
  const { userId: userIdParam, collectionId: collectionIdParam } = useParams();
  const userId = parseBeerIdParam(userIdParam);
  const isWishlist = collectionIdParam === undefined;
  const collectionId = isWishlist ? null : parseBeerIdParam(collectionIdParam);
  const isInvalid = userId === null || (!isWishlist && collectionId === null);
  const { collection, isPending, isError, refetch } = useCollectionQuery(
    isInvalid ? null : userId,
    collectionId,
  );
  const navigate = useNavigate();
  const { renameCollection, isPending: isRenaming } =
    useRenameCollectionMutation();
  const { removeBeer, removingBeerIds } = useRemoveCollectionBeerMutation();

  const backPath =
    userId === null ? RoutePathEnum.PEOPLE : buildUserProfilePath(userId);
  const backLink = (
    <Link
      to={backPath}
      className="min-h-11 self-center text-accent focus-visible:focus-ring"
    >
      {t("pages.collection.backToProfile")}
    </Link>
  );
  const isNotFound =
    isInvalid || (!isPending && !isError && collection === null);

  if (isNotFound)
    return (
      <div className="flex flex-col gap-4">
        <EmptyStatePanel
          mood={MascotMoodEnum.CONFUSED}
          title={t("pages.collection.notFoundTitle")}
          description={t("pages.collection.notFoundDescription")}
        />
        {backLink}
      </div>
    );

  if (isPending)
    return (
      <div className="flex flex-col gap-4">
        <ul aria-busy="true" className={LIST_CLASSES}>
          {SKELETON_ROW_KEYS.map((key) => (
            <li
              key={key}
              data-testid="collection-skeleton"
              className="rounded-mousse border-mousse bg-surface p-3 shadow-mousse"
            >
              <Skeleton className="h-5 w-40 max-w-full" />
            </li>
          ))}
        </ul>
        {backLink}
      </div>
    );

  if (isError || collection === null)
    return (
      <div className="flex flex-col gap-4">
        <Alert status="danger" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t("pages.collection.errorTitle")}</Alert.Title>
          </Alert.Content>
          <Button
            size="lg"
            variant="danger-soft"
            onPress={() => void refetch()}
          >
            {t("common.retry")}
          </Button>
        </Alert>
        {backLink}
      </div>
    );

  const isMine = collection.ownerId === getCurrentUserId();
  const ownedCollectionId =
    collection.kind === CollectionKindEnum.CUSTOM && isMine
      ? collection.id
      : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={
          collection.kind === CollectionKindEnum.WISHLIST
            ? t("collections.wishlist")
            : collection.name
        }
      />
      {ownedCollectionId !== null && (
        <div className="flex flex-wrap gap-2">
          <CollectionNameSheet
            mode={CollectionNameSheetModeEnum.RENAME}
            initialName={collection.name}
            isPending={isRenaming}
            onSave={(name) => renameCollection(ownedCollectionId, name)}
          />
          <DeleteCollectionButton
            collectionId={ownedCollectionId}
            onDeleted={() => void navigate(RoutePathEnum.PROFILE)}
          />
        </div>
      )}
      {collection.beers.length === 0 ? (
        <EmptyStatePanel
          mood={MascotMoodEnum.SEARCHING}
          title={t("pages.collection.emptyTitle")}
          description={t("pages.collection.emptyDescription")}
        />
      ) : (
        <ul className={LIST_CLASSES}>
          {collection.beers.map((beer) => (
            <CollectionBeerRow
              key={beer.beerId}
              beer={beer}
              isRemoving={removingBeerIds.includes(beer.beerId)}
              onRemove={
                isMine
                  ? () =>
                      void removeBeer(collection.id, beer.beerId).catch(
                        () => undefined,
                      )
                  : undefined
              }
            />
          ))}
        </ul>
      )}
      {backLink}
    </div>
  );
};
