import {
  Alert,
  Button,
  Checkbox,
  Drawer,
  Label,
  Skeleton,
} from "@heroui/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useCollectionMembershipToggle } from "@/pages/beerDetail/hooks/useCollectionMembershipToggle";
import { useMyCollectionsQuery } from "@/pages/beerDetail/hooks/useMyCollectionsQuery";
import type { AddToCollectionSheetProps } from "@/pages/beerDetail/types/addToCollectionSheet";
import { CollectionKindEnum } from "@/types/enums/collection/collectionKindEnum";
import { RoutePathEnum } from "@/types/enums/routing/routePathEnum";

const AddToCollectionSkeleton = () => (
  <div
    data-testid="add-to-collection-skeleton"
    aria-busy="true"
    className="flex flex-col gap-3"
  >
    <Skeleton className="h-11 w-full" />
    <Skeleton className="h-11 w-full" />
  </div>
);

export const AddToCollectionSheet = ({ beerId }: AddToCollectionSheetProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const { collections, isPending, isError, refetch } = useMyCollectionsQuery(
    beerId,
    isOpen,
  );
  const { toggleMembership, isTogglePending } =
    useCollectionMembershipToggle(beerId);

  const renderCollections = () => {
    if (isError) {
      return (
        <Alert status="danger" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>
              {t("pages.beerDetail.collections.errorTitle")}
            </Alert.Title>
          </Alert.Content>
          <Button
            size="lg"
            variant="danger-soft"
            onPress={() => void refetch()}
          >
            {t("common.retry")}
          </Button>
        </Alert>
      );
    }
    if (isPending) return <AddToCollectionSkeleton />;

    return (
      <ul className="flex flex-col gap-2">
        {collections.map((collection) => (
          <li key={collection.id ?? collection.kind} className="min-w-0">
            <Checkbox
              className="w-full min-w-0"
              isSelected={collection.containsBeer}
              isDisabled={isTogglePending(collection)}
              onChange={(isMember) =>
                void toggleMembership(collection, isMember)
              }
            >
              <Checkbox.Content className="min-h-11 w-full min-w-0 flex-row items-center justify-start gap-3">
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <Label className="min-w-0 flex-1 text-left break-words">
                  {collection.kind === CollectionKindEnum.WISHLIST
                    ? t("collections.wishlist")
                    : collection.name}
                </Label>
              </Checkbox.Content>
            </Checkbox>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <Drawer isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button variant="secondary" size="lg">
        {t("pages.beerDetail.collections.open")}
      </Button>
      <Drawer.Backdrop>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog>
            <Drawer.Handle />
            <Drawer.Header>
              <Drawer.Heading>
                {t("pages.beerDetail.collections.title")}
              </Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="flex max-h-[calc(100dvh-8rem)] min-w-0 flex-col gap-4 overflow-y-auto p-1 md:max-h-[60dvh]">
              {renderCollections()}
              <Link
                to={RoutePathEnum.PROFILE}
                className="inline-flex min-h-11 items-center text-link underline focus-visible:focus-ring"
              >
                {t("pages.beerDetail.collections.create")}
              </Link>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
};
