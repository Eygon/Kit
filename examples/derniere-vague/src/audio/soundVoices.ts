import type { AudioEngine } from "@/audio/audioEngine";
import { AUDIO_CONFIG } from "@/config/audioConfig";
import type { WeaponId } from "@/config/weaponConfig";
import type { NoiseSpec, SoundSpec, ToneSpec } from "@/config/audioConfig";
import { createRandom } from "@/logic/random";

type Position = { readonly x: number; readonly z: number };

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

const getNoiseBuffer = (context: AudioContext): AudioBuffer => {
  const cached = noiseBuffers.get(context);
  if (cached) return cached;
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * AUDIO_CONFIG.NOISE_SECONDS), context.sampleRate);
  const samples = buffer.getChannelData(0);
  const random = createRandom(AUDIO_CONFIG.NOISE_SEED);
  for (let index = 0; index < samples.length; index++) samples[index] = random.range(-1, 1);
  noiseBuffers.set(context, buffer);
  return buffer;
};

const createPanner = (context: AudioContext, position: Position, destination: AudioNode): PannerNode => {
  const panner = context.createPanner();
  panner.panningModel = AUDIO_CONFIG.PANNER.MODEL;
  panner.distanceModel = AUDIO_CONFIG.PANNER.DISTANCE_MODEL;
  panner.refDistance = AUDIO_CONFIG.PANNER.REF_DISTANCE_M;
  panner.maxDistance = AUDIO_CONFIG.PANNER.MAX_DISTANCE_M;
  panner.rolloffFactor = AUDIO_CONFIG.PANNER.ROLLOFF_FACTOR;
  panner.positionX.value = position.x;
  panner.positionY.value = AUDIO_CONFIG.PANNER.SOURCE_HEIGHT_M;
  panner.positionZ.value = position.z;
  panner.connect(destination);
  return panner;
};

const createEnvelope = (context: AudioContext, startS: number, attackS: number, durationS: number, peak: number): GainNode => {
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0, startS);
  envelope.gain.linearRampToValueAtTime(peak, startS + attackS);
  envelope.gain.exponentialRampToValueAtTime(AUDIO_CONFIG.ENVELOPE_FLOOR, startS + durationS);
  return envelope;
};

const createFilter = (context: AudioContext, type: BiquadFilterType, fromHz: number, toHz: number, q: number, startS: number, durationS: number): BiquadFilterNode => {
  const filter = context.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(fromHz, startS);
  filter.frequency.exponentialRampToValueAtTime(toHz, startS + durationS);
  return filter;
};

const buildTone = (context: AudioContext, tone: ToneSpec, originS: number, destination: AudioNode, nodes: AudioNode[]): AudioScheduledSourceNode => {
  const startS = originS + tone.startS;
  const oscillator = context.createOscillator();
  oscillator.type = tone.wave;
  oscillator.frequency.setValueAtTime(tone.fromHz, startS);
  oscillator.frequency.exponentialRampToValueAtTime(tone.toHz, startS + tone.durationS);
  const envelope = createEnvelope(context, startS, tone.attackS, tone.durationS, tone.peak);
  oscillator.connect(envelope);
  nodes.push(envelope);
  if (tone.lowpassHz === undefined) envelope.connect(destination);
  else {
    const filter = createFilter(context, "lowpass", tone.lowpassHz, tone.lowpassHz, 0.7, startS, tone.durationS);
    envelope.connect(filter);
    filter.connect(destination);
    nodes.push(filter);
  }
  oscillator.start(startS);
  oscillator.stop(startS + tone.durationS + AUDIO_CONFIG.TAIL_S);
  return oscillator;
};

const buildNoise = (context: AudioContext, noise: NoiseSpec, originS: number, destination: AudioNode, nodes: AudioNode[]): AudioScheduledSourceNode => {
  const startS = originS + noise.startS;
  const source = context.createBufferSource();
  source.buffer = getNoiseBuffer(context);
  source.loop = true;
  const envelope = createEnvelope(context, startS, noise.attackS, noise.durationS, noise.peak);
  const filter = createFilter(context, noise.filter, noise.fromHz, noise.toHz, noise.q, startS, noise.durationS);
  source.connect(envelope);
  envelope.connect(filter);
  filter.connect(destination);
  nodes.push(envelope, filter);
  source.start(startS);
  source.stop(startS + noise.durationS + AUDIO_CONFIG.TAIL_S);
  return source;
};

const playSpec = (audio: AudioEngine, spec: SoundSpec, position: Position | null): void => {
  const context = audio.getContext();
  const master = audio.getMaster();
  if (!context || !master) return;
  const nodes: AudioNode[] = [];
  const destination = position ? createPanner(context, position, master) : master;
  if (position) nodes.push(destination);
  const originS = context.currentTime;
  const sources = [
    ...spec.tones.map((tone) => buildTone(context, tone, originS, destination, nodes)),
    ...spec.noises.map((noise) => buildNoise(context, noise, originS, destination, nodes)),
  ];
  const disconnectAll = (): void => {
    sources.forEach((source) => source.disconnect());
    nodes.forEach((node) => node.disconnect());
  };
  const release = audio.acquireVoice(() => {
    sources.forEach((source) => {
      source.onended = null;
      source.stop(0);
    });
    disconnectAll();
  });
  let pending = sources.length;
  sources.forEach((source) => {
    source.onended = () => {
      pending -= 1;
      if (pending > 0) return;
      release();
      disconnectAll();
    };
  });
};

export const playShot = (audio: AudioEngine, weaponId: WeaponId): void => playSpec(audio, AUDIO_CONFIG.SHOTS[weaponId], null);
export const playReload = (audio: AudioEngine): void => playSpec(audio, AUDIO_CONFIG.SOUNDS.RELOAD, null);
export const playKnife = (audio: AudioEngine): void => playSpec(audio, AUDIO_CONFIG.SOUNDS.KNIFE, null);
export const playFootstep = (audio: AudioEngine): void => playSpec(audio, AUDIO_CONFIG.SOUNDS.FOOTSTEP, null);
export const playHurt = (audio: AudioEngine): void => playSpec(audio, AUDIO_CONFIG.SOUNDS.HURT, null);
export const playDryClick = (audio: AudioEngine): void => playSpec(audio, AUDIO_CONFIG.SOUNDS.DRY_CLICK, null);
export const playRoundEnd = (audio: AudioEngine): void => playSpec(audio, AUDIO_CONFIG.SOUNDS.ROUND_END_JINGLE, null);
export const playWind = (audio: AudioEngine): void => playSpec(audio, AUDIO_CONFIG.AMBIENCE.WIND, null);
export const playCreak = (audio: AudioEngine): void => playSpec(audio, AUDIO_CONFIG.AMBIENCE.CREAK, null);
export const playRoundJingle = (audio: AudioEngine): void => playSpec(audio, AUDIO_CONFIG.SOUNDS.ROUND_JINGLE, null);
export const playGroan = (audio: AudioEngine, x: number, z: number): void => playSpec(audio, AUDIO_CONFIG.SOUNDS.GROAN, { x, z });
export const playZombieAttack = (audio: AudioEngine, x: number, z: number): void => playSpec(audio, AUDIO_CONFIG.SOUNDS.ZOMBIE_ATTACK, { x, z });
export const playPurchase = (audio: AudioEngine): void => playSpec(audio, AUDIO_CONFIG.SOUNDS.PURCHASE, null);
export const playDeny = (audio: AudioEngine): void => playSpec(audio, AUDIO_CONFIG.SOUNDS.DENY, null);
export const playDoor = (audio: AudioEngine): void => playSpec(audio, AUDIO_CONFIG.SOUNDS.DOOR, null);
export const playBoxRoll = (audio: AudioEngine): void => playSpec(audio, AUDIO_CONFIG.SOUNDS.BOX_ROLL, null);
export const playBoxTeddy = (audio: AudioEngine): void => playSpec(audio, AUDIO_CONFIG.SOUNDS.BOX_TEDDY, null);
export const playPlankTorn = (audio: AudioEngine, x: number, z: number): void => playSpec(audio, AUDIO_CONFIG.SOUNDS.PLANK_TORN, { x, z });
export const playPlankRepaired = (audio: AudioEngine, x: number, z: number): void => playSpec(audio, AUDIO_CONFIG.SOUNDS.PLANK_REPAIRED, { x, z });
export const playPowerUpTaken = (audio: AudioEngine): void => playSpec(audio, AUDIO_CONFIG.SOUNDS.POWER_UP_TAKEN, null);
export const playNuke = (audio: AudioEngine): void => playSpec(audio, AUDIO_CONFIG.SOUNDS.NUKE, null);
export const playHitMarker = (audio: AudioEngine): void => playSpec(audio, AUDIO_CONFIG.SOUNDS.HIT_MARKER, null);
export const playKillMarker = (audio: AudioEngine): void => playSpec(audio, AUDIO_CONFIG.SOUNDS.KILL_MARKER, null);
