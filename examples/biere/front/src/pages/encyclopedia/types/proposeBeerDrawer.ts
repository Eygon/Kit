import type { Beer } from "@/types/models/beer/beer";

export type ProposeBeerDrawerProps = Readonly<{
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialName: string;
  onCreated: (beer: Beer) => void;
}>;
