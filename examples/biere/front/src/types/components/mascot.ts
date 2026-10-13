import type { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";
import type { MascotSizeEnum } from "@/types/enums/mascot/mascotSizeEnum";

export type MascotProps = Readonly<{
  mood?: MascotMoodEnum;
  size?: MascotSizeEnum;
  isDecorative?: boolean;
}>;
