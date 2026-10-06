import type { AudioEngine } from "@/audio/audioEngine";
import { playCreak, playWind } from "@/audio/soundVoices";
import { AUDIO_CONFIG } from "@/config/audioConfig";
import { createRandom } from "@/logic/random";

export type Ambience = {
  update: (round: number, frameS: number) => void;
};

const AMBIENCE = AUDIO_CONFIG.AMBIENCE;

export const droneGainForRound = (round: number): number => Math.min(AMBIENCE.DRONE_MAX_GAIN, AMBIENCE.DRONE_BASE_GAIN + AMBIENCE.DRONE_GAIN_PER_ROUND * round);

const startDrone = (context: AudioContext, master: GainNode): GainNode => {
  const droneGain = context.createGain();
  droneGain.gain.value = 0;
  droneGain.connect(master);
  const low = context.createOscillator();
  low.type = "sine";
  low.frequency.value = AMBIENCE.DRONE_LOW_HZ;
  low.connect(droneGain);
  const high = context.createOscillator();
  high.type = "sawtooth";
  high.frequency.value = AMBIENCE.DRONE_HIGH_HZ;
  const highFilter = context.createBiquadFilter();
  highFilter.type = "lowpass";
  highFilter.frequency.value = AMBIENCE.DRONE_HIGH_LOWPASS_HZ;
  const highShare = context.createGain();
  highShare.gain.value = AMBIENCE.DRONE_HIGH_SHARE;
  high.connect(highFilter);
  highFilter.connect(highShare);
  highShare.connect(droneGain);
  low.start();
  high.start();
  return droneGain;
};

export const createAmbience = (audio: AudioEngine): Ambience => {
  const random = createRandom(AUDIO_CONFIG.PRESENTATION_SEED);
  let droneGain: GainNode | null = null;
  let shownRound: number | null = null;
  let windRemainingS = random.range(AMBIENCE.WIND_MIN_S, AMBIENCE.WIND_MAX_S);
  let creakRemainingS = random.range(AMBIENCE.CREAK_MIN_S, AMBIENCE.CREAK_MAX_S);

  const followRound = (context: AudioContext, gain: GainNode, round: number): void => {
    if (round === shownRound) return;
    shownRound = round;
    gain.gain.setTargetAtTime(droneGainForRound(round), context.currentTime, AMBIENCE.DRONE_GAIN_SMOOTH_S);
  };

  const tickWind = (frameS: number): void => {
    windRemainingS -= frameS;
    if (windRemainingS > 0) return;
    playWind(audio);
    windRemainingS = random.range(AMBIENCE.WIND_MIN_S, AMBIENCE.WIND_MAX_S);
  };

  const tickCreak = (frameS: number): void => {
    creakRemainingS -= frameS;
    if (creakRemainingS > 0) return;
    playCreak(audio);
    creakRemainingS = random.range(AMBIENCE.CREAK_MIN_S, AMBIENCE.CREAK_MAX_S);
  };

  const update = (round: number, frameS: number): void => {
    const context = audio.getContext();
    const master = audio.getMaster();
    if (!context || !master || context.state !== "running") return;
    droneGain ??= startDrone(context, master);
    followRound(context, droneGain, round);
    tickWind(frameS);
    tickCreak(frameS);
  };

  return { update };
};
