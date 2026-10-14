import { ArrowShapeTurnUpRight } from "@gravity-ui/icons";
import { Button, toast } from "@heroui/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ShareProgressButtonProps } from "@/pages/profile/types/shareProgressButton";
import { ShareOutcomeEnum } from "@/pages/profile/types/shareOutcomeEnum";
import { shareProgress } from "@/pages/profile/utils/shareProgress";

export const ShareProgressButton = ({ discovered, total, isDisabled }: ShareProgressButtonProps) => {
  const { t } = useTranslation();
  const [isSharing, setIsSharing] = useState(false);
  const percent = total === 0 ? 0 : Math.round((discovered / total) * 100);

  const handleShare = async () => {
    setIsSharing(true);
    const outcome = await shareProgress(t("pages.profile.share.text", { count: discovered, percent }));
    setIsSharing(false);
    if (outcome === ShareOutcomeEnum.COPIED) toast.success(t("pages.profile.share.copied"));
    if (outcome === ShareOutcomeEnum.FAILED) toast.warning(t("pages.profile.share.failed"));
  };

  return (
    <Button variant="secondary" size="lg" isDisabled={isDisabled} isPending={isSharing} onPress={() => void handleShare()}>
      <ArrowShapeTurnUpRight aria-hidden="true" />
      {t("pages.profile.share.action")}
    </Button>
  );
};
