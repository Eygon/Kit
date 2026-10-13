import type { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";

export type EmptyStatePanelProps = Readonly<{
  title: string;
  description: string;
  mood?: MascotMoodEnum;
}>;
