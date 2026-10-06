export type LatchFlag = "fire" | "knife" | "interact";

export type InputState = {
  move: { x: number; y: number };
  look: { dx: number; dy: number };
  fire: boolean;
  aim: boolean;
  reload: boolean;
  knife: boolean;
  interact: boolean;
  swap: boolean;
  pressed: Record<LatchFlag, boolean>;
};

export const createInputState = (): InputState => ({
  move: { x: 0, y: 0 },
  look: { dx: 0, dy: 0 },
  fire: false,
  aim: false,
  reload: false,
  knife: false,
  interact: false,
  swap: false,
  pressed: { fire: false, knife: false, interact: false },
});

export const latchPress = (input: InputState, flag: LatchFlag): void => {
  input.pressed[flag] = true;
};

export const mergeLatches = (input: InputState, out: InputState): void => {
  out.move.x = input.move.x;
  out.move.y = input.move.y;
  out.look.dx = input.look.dx;
  out.look.dy = input.look.dy;
  out.aim = input.aim;
  out.reload = input.reload;
  out.swap = input.swap;
  out.fire = input.fire || input.pressed.fire;
  out.knife = input.knife || input.pressed.knife;
  out.interact = input.interact || input.pressed.interact;
};

export const clearLatches = (input: InputState): void => {
  input.pressed.fire = false;
  input.pressed.knife = false;
  input.pressed.interact = false;
};
