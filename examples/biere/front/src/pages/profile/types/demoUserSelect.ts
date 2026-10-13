import type { DemoUserIdEnum } from "@/types/enums/user/demoUserIdEnum";

export type DemoUserSelectProps = Readonly<{
  selectedUserId: DemoUserIdEnum;
  onSelectUser: (userId: DemoUserIdEnum) => void;
}>;
