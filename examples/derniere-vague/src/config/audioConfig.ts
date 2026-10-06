import type { WeaponId } from "@/config/weaponConfig";

export type ToneSpec = {
  readonly wave: OscillatorType;
  readonly fromHz: number;
  readonly toHz: number;
  readonly startS: number;
  readonly attackS: number;
  readonly durationS: number;
  readonly peak: number;
  readonly lowpassHz?: number;
};

export type NoiseSpec = {
  readonly filter: BiquadFilterType;
  readonly fromHz: number;
  readonly toHz: number;
  readonly q: number;
  readonly startS: number;
  readonly attackS: number;
  readonly durationS: number;
  readonly peak: number;
};

export type SoundSpec = { readonly tones: readonly ToneSpec[]; readonly noises: readonly NoiseSpec[] };

export type SoundName = "RELOAD" | "KNIFE" | "FOOTSTEP" | "HURT" | "ROUND_JINGLE" | "ROUND_END_JINGLE" | "DRY_CLICK" | "GROAN" | "ZOMBIE_ATTACK" | "PURCHASE" | "DENY" | "DOOR" | "PLANK_TORN" | "PLANK_REPAIRED" | "BOX_ROLL" | "BOX_TEDDY" | "POWER_UP_TAKEN" | "NUKE" | "HIT_MARKER" | "KILL_MARKER";

const SOUNDS = {
  RELOAD: {
    tones: [
      { wave: "square", fromHz: 320, toHz: 190, startS: 0.34, attackS: 0.003, durationS: 0.07, peak: 0.14, lowpassHz: 1800 },
      { wave: "square", fromHz: 540, toHz: 260, startS: 0.62, attackS: 0.003, durationS: 0.09, peak: 0.18, lowpassHz: 2200 },
    ],
    noises: [
      { filter: "bandpass", fromHz: 2600, toHz: 1800, q: 4, startS: 0, attackS: 0.004, durationS: 0.06, peak: 0.5 },
      { filter: "bandpass", fromHz: 3200, toHz: 2000, q: 4, startS: 0.58, attackS: 0.004, durationS: 0.05, peak: 0.55 },
    ],
  },
  KNIFE: {
    tones: [],
    noises: [{ filter: "highpass", fromHz: 2400, toHz: 6200, q: 0.7, startS: 0, attackS: 0.05, durationS: 0.24, peak: 0.45 }],
  },
  FOOTSTEP: {
    tones: [{ wave: "sine", fromHz: 95, toHz: 48, startS: 0, attackS: 0.004, durationS: 0.11, peak: 0.32 }],
    noises: [{ filter: "lowpass", fromHz: 520, toHz: 140, q: 0.7, startS: 0, attackS: 0.005, durationS: 0.12, peak: 0.4 }],
  },
  HURT: {
    tones: [
      { wave: "sawtooth", fromHz: 230, toHz: 85, startS: 0, attackS: 0.01, durationS: 0.38, peak: 0.4, lowpassHz: 900 },
      { wave: "sine", fromHz: 64, toHz: 38, startS: 0, attackS: 0.005, durationS: 0.3, peak: 0.55 },
    ],
    noises: [{ filter: "lowpass", fromHz: 800, toHz: 200, q: 0.6, startS: 0, attackS: 0.005, durationS: 0.3, peak: 0.3 }],
  },
  ROUND_JINGLE: {
    tones: [
      { wave: "sine", fromHz: 73.4, toHz: 73.4, startS: 0, attackS: 0.12, durationS: 2, peak: 0.4 },
      { wave: "triangle", fromHz: 146.8, toHz: 146.8, startS: 0, attackS: 0.02, durationS: 1.4, peak: 0.3 },
      { wave: "triangle", fromHz: 174.6, toHz: 174.6, startS: 0.2, attackS: 0.02, durationS: 1.3, peak: 0.28 },
      { wave: "triangle", fromHz: 220, toHz: 220, startS: 0.4, attackS: 0.02, durationS: 1.2, peak: 0.26 },
      { wave: "triangle", fromHz: 293.7, toHz: 293.7, startS: 0.65, attackS: 0.03, durationS: 1.3, peak: 0.24 },
    ],
    noises: [],
  },
  ROUND_END_JINGLE: {
    tones: [
      { wave: "triangle", fromHz: 392, toHz: 392, startS: 0, attackS: 0.02, durationS: 1.2, peak: 0.26 },
      { wave: "sine", fromHz: 98, toHz: 98, startS: 0, attackS: 0.15, durationS: 2.4, peak: 0.4 },
      { wave: "triangle", fromHz: 311.1, toHz: 311.1, startS: 0.35, attackS: 0.02, durationS: 1.2, peak: 0.26 },
      { wave: "triangle", fromHz: 261.6, toHz: 261.6, startS: 0.7, attackS: 0.02, durationS: 1.3, peak: 0.24 },
      { wave: "triangle", fromHz: 196, toHz: 196, startS: 1.05, attackS: 0.03, durationS: 1.5, peak: 0.24 },
    ],
    noises: [],
  },
  DRY_CLICK: {
    tones: [{ wave: "square", fromHz: 900, toHz: 400, startS: 0, attackS: 0.001, durationS: 0.03, peak: 0.16, lowpassHz: 2400 }],
    noises: [{ filter: "bandpass", fromHz: 3600, toHz: 2200, q: 5, startS: 0, attackS: 0.001, durationS: 0.025, peak: 0.4 }],
  },
  GROAN: {
    tones: [
      { wave: "sawtooth", fromHz: 96, toHz: 62, startS: 0, attackS: 0.28, durationS: 1.2, peak: 0.5, lowpassHz: 520 },
      { wave: "sawtooth", fromHz: 101, toHz: 58, startS: 0.04, attackS: 0.3, durationS: 1.1, peak: 0.35, lowpassHz: 420 },
    ],
    noises: [{ filter: "bandpass", fromHz: 240, toHz: 150, q: 3, startS: 0.05, attackS: 0.25, durationS: 1, peak: 0.3 }],
  },
  ZOMBIE_ATTACK: {
    tones: [{ wave: "sawtooth", fromHz: 190, toHz: 70, startS: 0, attackS: 0.03, durationS: 0.42, peak: 0.5, lowpassHz: 760 }],
    noises: [{ filter: "bandpass", fromHz: 950, toHz: 300, q: 2, startS: 0, attackS: 0.03, durationS: 0.36, peak: 0.7 }],
  },
  PURCHASE: {
    tones: [
      { wave: "sine", fromHz: 1318.5, toHz: 1318.5, startS: 0, attackS: 0.004, durationS: 0.18, peak: 0.3 },
      { wave: "sine", fromHz: 1760, toHz: 1760, startS: 0.09, attackS: 0.004, durationS: 0.5, peak: 0.3 },
      { wave: "triangle", fromHz: 2637, toHz: 2637, startS: 0.1, attackS: 0.004, durationS: 0.3, peak: 0.1 },
    ],
    noises: [{ filter: "highpass", fromHz: 6000, toHz: 8000, q: 0.7, startS: 0, attackS: 0.003, durationS: 0.06, peak: 0.25 }],
  },
  DENY: {
    tones: [
      { wave: "square", fromHz: 150, toHz: 110, startS: 0, attackS: 0.005, durationS: 0.12, peak: 0.3, lowpassHz: 700 },
      { wave: "square", fromHz: 140, toHz: 95, startS: 0.16, attackS: 0.005, durationS: 0.16, peak: 0.3, lowpassHz: 700 },
    ],
    noises: [],
  },
  DOOR: {
    tones: [
      { wave: "sine", fromHz: 70, toHz: 38, startS: 0, attackS: 0.1, durationS: 1.1, peak: 0.5 },
      { wave: "sawtooth", fromHz: 90, toHz: 50, startS: 0.05, attackS: 0.1, durationS: 1, peak: 0.18, lowpassHz: 300 },
    ],
    noises: [
      { filter: "lowpass", fromHz: 700, toHz: 150, q: 0.6, startS: 0, attackS: 0.15, durationS: 1.1, peak: 0.45 },
      { filter: "bandpass", fromHz: 1800, toHz: 600, q: 2, startS: 0.02, attackS: 0.05, durationS: 0.35, peak: 0.25 },
    ],
  },
  PLANK_TORN: {
    tones: [{ wave: "sawtooth", fromHz: 160, toHz: 60, startS: 0, attackS: 0.003, durationS: 0.18, peak: 0.3, lowpassHz: 600 }],
    noises: [
      { filter: "bandpass", fromHz: 1400, toHz: 300, q: 1.6, startS: 0, attackS: 0.003, durationS: 0.22, peak: 0.8 },
      { filter: "lowpass", fromHz: 500, toHz: 120, q: 0.6, startS: 0.01, attackS: 0.005, durationS: 0.3, peak: 0.5 },
    ],
  },
  PLANK_REPAIRED: {
    tones: [
      { wave: "sine", fromHz: 190, toHz: 85, startS: 0, attackS: 0.003, durationS: 0.14, peak: 0.5 },
      { wave: "sine", fromHz: 260, toHz: 110, startS: 0.22, attackS: 0.003, durationS: 0.14, peak: 0.5 },
    ],
    noises: [
      { filter: "bandpass", fromHz: 900, toHz: 400, q: 2.5, startS: 0, attackS: 0.003, durationS: 0.08, peak: 0.5 },
      { filter: "bandpass", fromHz: 900, toHz: 400, q: 2.5, startS: 0.22, attackS: 0.003, durationS: 0.08, peak: 0.5 },
    ],
  },
  BOX_ROLL: {
    tones: [
      { wave: "sine", fromHz: 110, toHz: 110, startS: 0, attackS: 0.2, durationS: 3.9, peak: 0.16 },
      { wave: "triangle", fromHz: 261.6, toHz: 261.6, startS: 0.04, attackS: 0.01, durationS: 0.3, peak: 0.2 },
      { wave: "triangle", fromHz: 293.7, toHz: 293.7, startS: 0.28, attackS: 0.01, durationS: 0.3, peak: 0.2 },
      { wave: "triangle", fromHz: 329.6, toHz: 329.6, startS: 0.52, attackS: 0.01, durationS: 0.3, peak: 0.2 },
      { wave: "triangle", fromHz: 392, toHz: 392, startS: 0.76, attackS: 0.01, durationS: 0.3, peak: 0.2 },
      { wave: "triangle", fromHz: 440, toHz: 440, startS: 1.00, attackS: 0.01, durationS: 0.3, peak: 0.2 },
      { wave: "triangle", fromHz: 523.3, toHz: 523.3, startS: 1.24, attackS: 0.01, durationS: 0.3, peak: 0.2 },
      { wave: "triangle", fromHz: 587.3, toHz: 587.3, startS: 1.48, attackS: 0.01, durationS: 0.3, peak: 0.2 },
      { wave: "triangle", fromHz: 659.3, toHz: 659.3, startS: 1.72, attackS: 0.01, durationS: 0.3, peak: 0.2 },
      { wave: "triangle", fromHz: 784, toHz: 784, startS: 1.96, attackS: 0.01, durationS: 0.3, peak: 0.2 },
      { wave: "triangle", fromHz: 880, toHz: 880, startS: 2.20, attackS: 0.01, durationS: 0.3, peak: 0.2 },
      { wave: "triangle", fromHz: 1046.5, toHz: 1046.5, startS: 2.44, attackS: 0.01, durationS: 0.3, peak: 0.2 },
      { wave: "triangle", fromHz: 1174.7, toHz: 1174.7, startS: 2.68, attackS: 0.01, durationS: 0.3, peak: 0.2 },
      { wave: "triangle", fromHz: 1318.5, toHz: 1318.5, startS: 2.92, attackS: 0.01, durationS: 0.3, peak: 0.2 },
      { wave: "triangle", fromHz: 1568, toHz: 1568, startS: 3.16, attackS: 0.01, durationS: 0.3, peak: 0.2 },
      { wave: "triangle", fromHz: 1760, toHz: 1760, startS: 3.40, attackS: 0.01, durationS: 0.3, peak: 0.2 },
      { wave: "sine", fromHz: 1046.5, toHz: 1046.5, startS: 3.64, attackS: 0.01, durationS: 0.45, peak: 0.3 },
      { wave: "triangle", fromHz: 1568, toHz: 1568, startS: 3.68, attackS: 0.01, durationS: 0.4, peak: 0.22 },
    ],
    noises: [],
  },
  BOX_TEDDY: {
    tones: [
      { wave: "triangle", fromHz: 523.3, toHz: 523.3, startS: 0, attackS: 0.01, durationS: 0.35, peak: 0.3 },
      { wave: "triangle", fromHz: 392, toHz: 392, startS: 0.3, attackS: 0.01, durationS: 0.35, peak: 0.3 },
      { wave: "triangle", fromHz: 311.1, toHz: 311.1, startS: 0.6, attackS: 0.01, durationS: 0.35, peak: 0.3 },
      { wave: "sawtooth", fromHz: 196, toHz: 98, startS: 0.9, attackS: 0.05, durationS: 1.2, peak: 0.35, lowpassHz: 500 },
    ],
    noises: [{ filter: "lowpass", fromHz: 600, toHz: 100, q: 0.6, startS: 0.9, attackS: 0.05, durationS: 1.1, peak: 0.25 }],
  },
  POWER_UP_TAKEN: {
    tones: [
      { wave: "triangle", fromHz: 523.3, toHz: 523.3, startS: 0, attackS: 0.006, durationS: 0.32, peak: 0.26 },
      { wave: "triangle", fromHz: 659.3, toHz: 659.3, startS: 0.07, attackS: 0.006, durationS: 0.32, peak: 0.26 },
      { wave: "triangle", fromHz: 784, toHz: 784, startS: 0.14, attackS: 0.006, durationS: 0.36, peak: 0.26 },
      { wave: "triangle", fromHz: 1046.5, toHz: 1046.5, startS: 0.21, attackS: 0.006, durationS: 0.5, peak: 0.28 },
      { wave: "sine", fromHz: 2093, toHz: 2093, startS: 0.21, attackS: 0.006, durationS: 0.6, peak: 0.08 },
    ],
    noises: [{ filter: "highpass", fromHz: 7000, toHz: 9000, q: 0.7, startS: 0.21, attackS: 0.003, durationS: 0.08, peak: 0.18 }],
  },
  NUKE: {
    tones: [
      { wave: "sine", fromHz: 95, toHz: 26, startS: 0, attackS: 0.01, durationS: 1.9, peak: 0.75 },
      { wave: "sawtooth", fromHz: 140, toHz: 40, startS: 0, attackS: 0.01, durationS: 1.4, peak: 0.35, lowpassHz: 400 },
      { wave: "sine", fromHz: 55, toHz: 24, startS: 0.05, attackS: 0.02, durationS: 1.6, peak: 0.5 },
    ],
    noises: [
      { filter: "lowpass", fromHz: 2400, toHz: 80, q: 0.6, startS: 0, attackS: 0.005, durationS: 1.7, peak: 0.8 },
      { filter: "bandpass", fromHz: 900, toHz: 200, q: 1, startS: 0, attackS: 0.005, durationS: 0.5, peak: 0.5 },
    ],
  },
  HIT_MARKER: {
    tones: [
      { wave: "triangle", fromHz: 1900, toHz: 1500, startS: 0, attackS: 0.002, durationS: 0.045, peak: 0.22 },
      { wave: "sine", fromHz: 3800, toHz: 3000, startS: 0, attackS: 0.002, durationS: 0.03, peak: 0.06 },
    ],
    noises: [{ filter: "highpass", fromHz: 5000, toHz: 7000, q: 0.7, startS: 0, attackS: 0.001, durationS: 0.02, peak: 0.12 }],
  },
  KILL_MARKER: {
    tones: [
      { wave: "triangle", fromHz: 1100, toHz: 880, startS: 0, attackS: 0.002, durationS: 0.05, peak: 0.26 },
      { wave: "triangle", fromHz: 880, toHz: 660, startS: 0.07, attackS: 0.002, durationS: 0.08, peak: 0.28 },
      { wave: "sine", fromHz: 220, toHz: 110, startS: 0.07, attackS: 0.003, durationS: 0.1, peak: 0.3 },
    ],
    noises: [{ filter: "bandpass", fromHz: 1800, toHz: 600, q: 1.2, startS: 0.07, attackS: 0.002, durationS: 0.05, peak: 0.2 }],
  },
} as const satisfies Record<SoundName, SoundSpec>;

const SHOTS = {
  pistol: {
    tones: [{ wave: "sawtooth", fromHz: 170, toHz: 42, startS: 0, attackS: 0.002, durationS: 0.16, peak: 0.55, lowpassHz: 900 }],
    noises: [
      { filter: "bandpass", fromHz: 2200, toHz: 420, q: 0.8, startS: 0, attackS: 0.002, durationS: 0.18, peak: 0.9 },
      { filter: "lowpass", fromHz: 1000, toHz: 180, q: 0.5, startS: 0.02, attackS: 0.01, durationS: 0.4, peak: 0.28 },
    ],
  },
  smg: {
    tones: [{ wave: "square", fromHz: 240, toHz: 70, startS: 0, attackS: 0.001, durationS: 0.09, peak: 0.4, lowpassHz: 1400 }],
    noises: [
      { filter: "bandpass", fromHz: 3200, toHz: 800, q: 1, startS: 0, attackS: 0.001, durationS: 0.1, peak: 0.8 },
      { filter: "lowpass", fromHz: 1400, toHz: 260, q: 0.5, startS: 0.01, attackS: 0.005, durationS: 0.2, peak: 0.2 },
    ],
  },
  carbine: {
    tones: [{ wave: "sawtooth", fromHz: 210, toHz: 52, startS: 0, attackS: 0.001, durationS: 0.2, peak: 0.6, lowpassHz: 1100 }],
    noises: [
      { filter: "bandpass", fromHz: 2800, toHz: 500, q: 1.2, startS: 0, attackS: 0.001, durationS: 0.14, peak: 0.95 },
      { filter: "lowpass", fromHz: 1200, toHz: 200, q: 0.5, startS: 0.02, attackS: 0.01, durationS: 0.5, peak: 0.32 },
    ],
  },
  shotgun: {
    tones: [
      { wave: "sawtooth", fromHz: 120, toHz: 30, startS: 0, attackS: 0.002, durationS: 0.32, peak: 0.7, lowpassHz: 700 },
      { wave: "sine", fromHz: 68, toHz: 26, startS: 0, attackS: 0.003, durationS: 0.4, peak: 0.6 },
    ],
    noises: [
      { filter: "lowpass", fromHz: 3000, toHz: 240, q: 0.6, startS: 0, attackS: 0.002, durationS: 0.35, peak: 1 },
      { filter: "lowpass", fromHz: 900, toHz: 120, q: 0.5, startS: 0.05, attackS: 0.02, durationS: 0.7, peak: 0.35 },
    ],
  },
  lmg: {
    tones: [
      { wave: "sawtooth", fromHz: 150, toHz: 38, startS: 0, attackS: 0.002, durationS: 0.14, peak: 0.6, lowpassHz: 800 },
      { wave: "sine", fromHz: 80, toHz: 34, startS: 0, attackS: 0.002, durationS: 0.12, peak: 0.5 },
    ],
    noises: [
      { filter: "bandpass", fromHz: 1900, toHz: 360, q: 0.7, startS: 0, attackS: 0.002, durationS: 0.15, peak: 0.85 },
      { filter: "lowpass", fromHz: 800, toHz: 150, q: 0.5, startS: 0.02, attackS: 0.01, durationS: 0.3, peak: 0.3 },
    ],
  },
  rayGun: {
    tones: [
      { wave: "sine", fromHz: 2200, toHz: 260, startS: 0, attackS: 0.004, durationS: 0.28, peak: 0.4 },
      { wave: "triangle", fromHz: 1100, toHz: 130, startS: 0.01, attackS: 0.004, durationS: 0.34, peak: 0.3 },
      { wave: "sawtooth", fromHz: 90, toHz: 45, startS: 0, attackS: 0.01, durationS: 0.2, peak: 0.25, lowpassHz: 500 },
    ],
    noises: [{ filter: "highpass", fromHz: 4200, toHz: 9000, q: 0.8, startS: 0, attackS: 0.003, durationS: 0.12, peak: 0.3 }],
  },
} as const satisfies Record<WeaponId, SoundSpec>;

const AMBIENCE = {
  DRONE_BASE_GAIN: 0.04,
  DRONE_GAIN_PER_ROUND: 0.012,
  DRONE_MAX_GAIN: 0.16,
  DRONE_GAIN_SMOOTH_S: 2.5,
  DRONE_LOW_HZ: 55,
  DRONE_HIGH_HZ: 82.4,
  DRONE_HIGH_LOWPASS_HZ: 220,
  DRONE_HIGH_SHARE: 0.35,
  WIND_MIN_S: 9,
  WIND_MAX_S: 22,
  CREAK_MIN_S: 14,
  CREAK_MAX_S: 34,
  WIND: {
    tones: [],
    noises: [{ filter: "bandpass", fromHz: 260, toHz: 900, q: 1.4, startS: 0, attackS: 1.6, durationS: 4.2, peak: 0.22 }],
  },
  CREAK: {
    tones: [{ wave: "sawtooth", fromHz: 130, toHz: 210, startS: 0, attackS: 0.12, durationS: 0.9, peak: 0.12, lowpassHz: 420 }],
    noises: [{ filter: "bandpass", fromHz: 700, toHz: 1500, q: 6, startS: 0.05, attackS: 0.1, durationS: 0.7, peak: 0.1 }],
  },
} as const;

export const AUDIO_CONFIG = {
  AUDIO_MASTER_GAIN: 0.7,
  AUDIO_VOICE_CAP: 10,
  SOUNDS,
  SHOTS,
  AMBIENCE,
  PANNER: {
    MODEL: "equalpower",
    DISTANCE_MODEL: "inverse",
    REF_DISTANCE_M: 1.5,
    MAX_DISTANCE_M: 30,
    ROLLOFF_FACTOR: 1.4,
    SOURCE_HEIGHT_M: 1.2,
  },
  FOOTSTEP_STRIDE_M: 1.6,
  FOOTSTEP_MAX_JUMP_M: 3,
  GROAN_MIN_S: 3,
  GROAN_MAX_S: 7,
  GROAN_MAX_DISTANCE_M: 18,
  PRESENTATION_SEED: 4242,
  NOISE_SECONDS: 1,
  NOISE_SEED: 7919,
  ENVELOPE_FLOOR: 0.0001,
  TAIL_S: 0.05,
} as const;
