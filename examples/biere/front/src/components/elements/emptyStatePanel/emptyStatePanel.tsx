import { EmptyState } from "@heroui/react";
import { Mascot } from "@/components/elements/mascot/mascot";
import type { EmptyStatePanelProps } from "@/types/components/emptyStatePanel";
import { DEFAULT_MASCOT_MOOD } from "@/types/enums/mascot/mascotMoodEnum";
import { MascotSizeEnum } from "@/types/enums/mascot/mascotSizeEnum";

export const EmptyStatePanel = ({ title, description, mood = DEFAULT_MASCOT_MOOD }: EmptyStatePanelProps) => (
  <EmptyState className="flex flex-col items-center gap-3 rounded-mousse border-mousse bg-surface px-5 py-8 text-center shadow-mousse">
    <Mascot mood={mood} size={MascotSizeEnum.LG} isDecorative />
    <h2 className="font-display text-xl break-words text-foreground">{title}</h2>
    <p className="max-w-prose text-sm break-words text-muted">{description}</p>
  </EmptyState>
);
