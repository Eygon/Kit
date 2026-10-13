export enum DemoUserIdEnum {
  ALICE = 1,
  BOB = 2,
  CAROL = 3,
}

export const DEFAULT_DEMO_USER_ID = DemoUserIdEnum.ALICE;

export const DEMO_USER_OPTIONS: readonly { id: DemoUserIdEnum; labelKey: string }[] = [
  { id: DemoUserIdEnum.ALICE, labelKey: "pages.profile.demoUser.users.alice" },
  { id: DemoUserIdEnum.BOB, labelKey: "pages.profile.demoUser.users.bob" },
  { id: DemoUserIdEnum.CAROL, labelKey: "pages.profile.demoUser.users.carol" },
];

export const isDemoUserId = (value: unknown): value is DemoUserIdEnum =>
  typeof value === "number" && Object.values(DemoUserIdEnum).includes(value);
