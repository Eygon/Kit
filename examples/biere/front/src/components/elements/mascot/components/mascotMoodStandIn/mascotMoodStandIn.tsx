import { getMascotStandInPieces } from "@/components/elements/mascot/components/mascotMoodStandIn/utils/getMascotStandInPieces";
import type { MascotMoodStandInProps } from "@/components/elements/mascot/types/mascotMoodStandIn";

export const MascotMoodStandIn = ({ mood }: MascotMoodStandInProps) => (
  <>
    {getMascotStandInPieces(mood).map((pieceClasses) => (
      <span key={pieceClasses} aria-hidden="true" data-slot="mascot-mood-stand-in" className={pieceClasses} />
    ))}
  </>
);
