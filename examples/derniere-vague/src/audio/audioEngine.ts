import { AUDIO_CONFIG } from "@/config/audioConfig";

export type AudioEngine = {
  getContext: () => AudioContext | null;
  getMaster: () => GainNode | null;
  unlock: () => void;
  acquireVoice: (stopFn: () => void) => () => void;
  setListener: (x: number, y: number, z: number, yaw: number) => void;
};

type Voice = { readonly stop: () => void };
type ListenerPose = { x: number; y: number; z: number; yaw: number };

const applyListener = (listener: AudioListener, pose: ListenerPose): void => {
  if (!listener.positionX) return;
  listener.positionX.value = pose.x;
  listener.positionY.value = pose.y;
  listener.positionZ.value = pose.z;
  listener.forwardX.value = -Math.sin(pose.yaw);
  listener.forwardY.value = 0;
  listener.forwardZ.value = -Math.cos(pose.yaw);
  listener.upX.value = 0;
  listener.upY.value = 1;
  listener.upZ.value = 0;
};

export const createAudioEngine = (): AudioEngine => {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  const pose: ListenerPose = { x: 0, y: 0, z: 0, yaw: 0 };
  const voices: Voice[] = [];

  const getContext = (): AudioContext | null => {
    if (context) return context;
    if (typeof AudioContext === "undefined") return null;
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = AUDIO_CONFIG.AUDIO_MASTER_GAIN;
    master.connect(context.destination);
    applyListener(context.listener, pose);
    return context;
  };

  const getMaster = (): GainNode | null => {
    getContext();
    return master;
  };

  const unlock = (): void => {
    const ready = getContext();
    if (ready && ready.state === "suspended") void ready.resume();
  };

  const acquireVoice = (stopFn: () => void): (() => void) => {
    const voice: Voice = { stop: stopFn };
    voices.push(voice);
    if (voices.length > AUDIO_CONFIG.AUDIO_VOICE_CAP) voices.shift()?.stop();
    return () => {
      const index = voices.indexOf(voice);
      if (index >= 0) voices.splice(index, 1);
    };
  };

  const setListener = (x: number, y: number, z: number, yaw: number): void => {
    pose.x = x;
    pose.y = y;
    pose.z = z;
    pose.yaw = yaw;
    if (context) applyListener(context.listener, pose);
  };

  return { getContext, getMaster, unlock, acquireVoice, setListener };
};
