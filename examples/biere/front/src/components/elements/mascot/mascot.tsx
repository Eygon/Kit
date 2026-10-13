import { useTranslation } from "react-i18next";
import mascotSmallImageUrl from "@/assets/mascot/mascot-256.png";
import mascotImageUrl from "@/assets/mascot/mascot.png";
import { MascotMoodStandIn } from "@/components/elements/mascot/components/mascotMoodStandIn/mascotMoodStandIn";
import { getMascotImageClasses } from "@/components/elements/mascot/utils/getMascotImageClasses";
import { MASCOT_IMAGE_WIDTH_PX, MASCOT_SMALL_IMAGE_WIDTH_PX } from "@/components/elements/mascot/utils/mascotConstants";
import type { MascotProps } from "@/types/components/mascot";
import { DEFAULT_MASCOT_MOOD, MASCOT_MOOD_ALT_KEYS } from "@/types/enums/mascot/mascotMoodEnum";
import { DEFAULT_MASCOT_SIZE, MASCOT_IMAGE_SIZES, MASCOT_SIZE_CLASSES } from "@/types/enums/mascot/mascotSizeEnum";

export const Mascot = ({ mood = DEFAULT_MASCOT_MOOD, size = DEFAULT_MASCOT_SIZE, isDecorative = false }: MascotProps) => {
  const { t } = useTranslation();

  return (
    <div
      data-slot="mascot"
      data-mood={mood}
      aria-hidden={isDecorative || undefined}
      className={`@container relative shrink-0 ${MASCOT_SIZE_CLASSES[size]}`}
    >
      <img
        src={mascotImageUrl}
        srcSet={`${mascotSmallImageUrl} ${MASCOT_SMALL_IMAGE_WIDTH_PX}w, ${mascotImageUrl} ${MASCOT_IMAGE_WIDTH_PX}w`}
        sizes={MASCOT_IMAGE_SIZES[size]}
        width={MASCOT_IMAGE_WIDTH_PX}
        height={MASCOT_IMAGE_WIDTH_PX}
        alt={isDecorative ? "" : t(MASCOT_MOOD_ALT_KEYS[mood])}
        draggable={false}
        className={getMascotImageClasses(mood)}
      />
      <MascotMoodStandIn mood={mood} />
    </div>
  );
};
