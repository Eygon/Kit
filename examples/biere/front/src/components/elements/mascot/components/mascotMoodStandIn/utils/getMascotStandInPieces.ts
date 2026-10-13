import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";

const QUESTION_BUBBLE_CLASSES =
  "absolute -top-[2%] right-[2%] flex size-[30%] items-center justify-center rounded-full border-mousse bg-surface font-display text-[18cqw] leading-none text-foreground shadow-mousse after:content-['?'] motion-safe:animate-mascot-float";
const QUESTION_BUBBLE_TAIL_CLASSES =
  "absolute top-[26%] right-[28%] size-[8%] rounded-full border-mousse bg-surface motion-safe:animate-mascot-float";

const SPARKLE_BASE_CLASSES = "absolute sparkle-shape bg-highlight motion-safe:animate-mascot-twinkle";

const HOP_GRAIN_BASE_CLASSES =
  "absolute size-[10%] rounded-[60%_10%_60%_10%] border-mousse bg-accent opacity-0 motion-safe:animate-mascot-fall motion-reduce:opacity-100";

const BADGE_BASE_CLASSES =
  "absolute size-[17%] rounded-full border-mousse shadow-mousse after:absolute after:inset-[22%] after:rounded-full after:border-mousse after:content-['']";

export const getMascotStandInPieces = (mood: MascotMoodEnum): readonly string[] => {
  switch (mood) {
    case MascotMoodEnum.SEARCHING:
      return [QUESTION_BUBBLE_CLASSES, QUESTION_BUBBLE_TAIL_CLASSES];
    case MascotMoodEnum.CAPTURED:
      return [
        `${SPARKLE_BASE_CLASSES} top-[2%] left-[4%] size-[18%]`,
        `${SPARKLE_BASE_CLASSES} top-[30%] -right-[2%] size-[13%] [animation-delay:.5s]`,
        `${SPARKLE_BASE_CLASSES} bottom-[8%] left-[10%] size-[10%] [animation-delay:1s]`,
      ];
    case MascotMoodEnum.CONFUSED:
      return [
        `${HOP_GRAIN_BASE_CLASSES} top-[6%] left-[26%]`,
        `${HOP_GRAIN_BASE_CLASSES} top-[10%] right-[24%] [animation-delay:1.4s]`,
      ];
    case MascotMoodEnum.LOADED:
      return [
        `${BADGE_BASE_CLASSES} bottom-[30%] -left-[2%] bg-highlight`,
        `${BADGE_BASE_CLASSES} bottom-[12%] left-[6%] bg-accent`,
        `${BADGE_BASE_CLASSES} bottom-[2%] left-[24%] bg-secondary`,
      ];
  }
};
