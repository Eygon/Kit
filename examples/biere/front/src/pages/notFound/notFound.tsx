import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { EmptyStatePanel } from "@/components/elements/emptyStatePanel/emptyStatePanel";
import { PageHeader } from "@/components/elements/pageHeader/pageHeader";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";
import { RoutePathEnum } from "@/types/enums/routing/routePathEnum";

export const NotFoundPage = () => {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader title={t("pages.notFound.title")} />
      <EmptyStatePanel
        mood={MascotMoodEnum.CONFUSED}
        title={t("pages.notFound.emptyTitle")}
        description={t("pages.notFound.emptyDescription")}
      />
      <Link
        to={RoutePathEnum.HOME}
        className="inline-flex min-h-11 items-center self-start text-link underline focus-visible:focus-ring"
      >
        {t("pages.notFound.backHome")}
      </Link>
    </>
  );
};
