export type DeleteCheckinButtonProps = Readonly<{
  checkinId: number;
  isTextTrigger?: boolean;
  onDeleted?: () => void;
}>;
