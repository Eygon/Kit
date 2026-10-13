import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";

const MASCOT_IMAGE_BASE_CLASSES = "pointer-events-none size-full object-contain select-none";

const getMascotImageTiltClasses = (mood: MascotMoodEnum): string => {
  switch (mood) {
    case MascotMoodEnum.CAPTURED:
      return "-rotate-6";
    case MascotMoodEnum.CONFUSED:
      return "rotate-3";
    case MascotMoodEnum.SEARCHING:
    case MascotMoodEnum.LOADED:
      return "";
  }
};

export const getMascotImageClasses = (mood: MascotMoodEnum): string =>
  `${MASCOT_IMAGE_BASE_CLASSES} ${getMascotImageTiltClasses(mood)}`.trim();
