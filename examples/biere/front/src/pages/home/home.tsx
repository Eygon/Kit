import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { PageHeader } from "@/components/elements/pageHeader/pageHeader";
import { FeedSection } from "@/pages/home/components/widgets/feedSection/feedSection";
import { RoutePathEnum } from "@/types/enums/routing/routePathEnum";

export const HomePage = () => {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader title={t("pages.home.title")} subtitle={t("pages.home.subtitle")} />
      <Link
        to={RoutePathEnum.PEOPLE}
        className="inline-flex min-h-11 items-center self-start text-link underline focus-visible:focus-ring"
      >
        {t("pages.home.findProfiles")}
      </Link>
      <FeedSection />
    </>
  );
};
