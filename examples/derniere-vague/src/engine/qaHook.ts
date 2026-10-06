export type QaSnapshot = {
  fps: number;
  drawCalls: number;
  triangles: number;
  phase: string;
  round: number;
  alive: number;
};

type QaWindow = Window & { __qa?: () => QaSnapshot };

export const installQaHook = (target: Window, read: () => QaSnapshot): void => {
  (target as QaWindow).__qa = () => {
    const { fps, drawCalls, triangles, phase, round, alive } = read();
    return { fps, drawCalls, triangles, phase, round, alive };
  };
};
