export {};

const VOICES_MODULE = "@/audio/soundVoices";
const CONFIG_MODULE = "@/config/audioConfig";
const NOW_S = 0.5;
const SAMPLE_RATE = 44100;
const ZOMBIE_X = -4;
const ZOMBIE_Z = 2;
const FLAT_SOUNDS = ["playReload", "playKnife", "playFootstep", "playHurt", "playRoundJingle", "playDryClick", "playRoundEnd"] as const;
const SOUND_NAMES: Record<string, string> = {
  playReload: "RELOAD",
  playKnife: "KNIFE",
  playFootstep: "FOOTSTEP",
  playHurt: "HURT",
  playRoundJingle: "ROUND_JINGLE",
  playDryClick: "DRY_CLICK",
  playRoundEnd: "ROUND_END_JINGLE",
  playGroan: "GROAN",
  playZombieAttack: "ZOMBIE_ATTACK",
};

type FakeParam = {
  value: number;
  setValueAtTime: ReturnType<typeof vi.fn>;
  linearRampToValueAtTime: ReturnType<typeof vi.fn>;
  exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
};
type FakeNode = Record<string, unknown> & { connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> };
type FakeSource = FakeNode & { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; onended: (() => void) | null };

const param = (): FakeParam => ({
  value: 0,
  setValueAtTime: vi.fn(),
  linearRampToValueAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
});

const makeContext = () => {
  const sources: FakeSource[] = [];
  const panners: FakeNode[] = [];
  const buffers: unknown[] = [];
  const nodes: FakeNode[] = [];
  const node = (extra: Record<string, unknown>): FakeNode => {
    const created = { connect: vi.fn(), disconnect: vi.fn(), ...extra };
    nodes.push(created);
    return created;
  };
  const source = (extra: Record<string, unknown>): FakeSource => {
    const created = Object.assign(node(extra), { start: vi.fn(), stop: vi.fn(), onended: null }) as FakeSource;
    sources.push(created);
    return created;
  };
  const context = {
    currentTime: NOW_S,
    sampleRate: SAMPLE_RATE,
    createOscillator: () => source({ type: "sine", frequency: param() }),
    createBufferSource: () => source({ buffer: null, loop: false }),
    createBiquadFilter: () => node({ type: "lowpass", frequency: param(), Q: param() }),
    createGain: () => node({ gain: param() }),
    createPanner: () => {
      const panner = node({ positionX: param(), positionY: param(), positionZ: param(), panningModel: "", distanceModel: "", refDistance: 0, maxDistance: 0, rolloffFactor: 0 });
      panners.push(panner);
      return panner;
    },
    createBuffer: (_channels: number, length: number) => {
      const buffer = { length, getChannelData: () => new Float32Array(length) };
      buffers.push(buffer);
      return buffer;
    },
  };
  return { context, sources, panners, buffers, nodes };
};

const makeAudio = (fake: ReturnType<typeof makeContext> | null) => {
  const master = { name: "master", connect: vi.fn(), disconnect: vi.fn() };
  const release = vi.fn();
  const stops: Array<() => void> = [];
  const audio = {
    getContext: () => fake?.context ?? null,
    getMaster: () => (fake ? master : null),
    unlock: vi.fn(),
    setListener: vi.fn(),
    acquireVoice: vi.fn((stopFn: () => void) => {
      stops.push(stopFn);
      return release;
    }),
  };
  return { audio, master, release, stops };
};

const loadVoices = async () => await import(/* @vite-ignore */ VOICES_MODULE);
const loadConfig = async () => (await import(/* @vite-ignore */ CONFIG_MODULE)).AUDIO_CONFIG;
const connectedTo = (nodes: FakeNode[], target: unknown): FakeNode[] => nodes.filter((entry) => entry.connect.mock.calls.some((call) => call[0] === target));
const reaches = (from: FakeNode, target: unknown): boolean =>
  from.connect.mock.calls.some((call) => call[0] === target || (typeof call[0] === "object" && reaches(call[0] as FakeNode, target)));
const envelopeOf = (source: FakeSource): FakeParam => (source.connect.mock.calls[0]?.[0] as { gain: FakeParam }).gain;

describe("flat sound voices", () => {
  it.each(FLAT_SOUNDS)("%s starts every spec source once, routes to the master and takes one voice", async (name) => {
    const AUDIO_CONFIG = await loadConfig();
    const voices = await loadVoices();
    const fake = makeContext();
    const { audio, release } = makeAudio(fake);
    voices[name](audio);
    const spec = AUDIO_CONFIG.SOUNDS[SOUND_NAMES[name] as string];
    expect(fake.sources).toHaveLength(spec.tones.length + spec.noises.length);
    expect(fake.sources.length).toBeGreaterThan(0);
    fake.sources.forEach((source) => {
      expect(source.start).toHaveBeenCalledTimes(1);
      expect(source.stop).toHaveBeenCalledTimes(1);
      expect(source.start.mock.calls[0]?.[0]).toBeGreaterThanOrEqual(NOW_S);
      expect(source.stop.mock.calls[0]?.[0]).toBeGreaterThan(source.start.mock.calls[0]?.[0]);
    });
    expect(audio.acquireVoice).toHaveBeenCalledTimes(1);
    expect(fake.panners).toHaveLength(0);
    expect(release).not.toHaveBeenCalled();
  });

  it("sends every sound through the master gain", async () => {
    const voices = await loadVoices();
    const fake = makeContext();
    const { audio, master } = makeAudio(fake);
    voices.playShot(audio, "pistol");
    expect(fake.sources.length).toBeGreaterThan(0);
    fake.sources.forEach((source) => expect(reaches(source, master)).toBe(true));
  });

  it("shapes an envelope that rises from silence and decays on each source", async () => {
    const voices = await loadVoices();
    const fake = makeContext();
    const { audio } = makeAudio(fake);
    voices.playHurt(audio);
    fake.sources.forEach((source) => {
      const envelope = envelopeOf(source);
      expect(envelope.setValueAtTime).toHaveBeenCalledWith(0, expect.any(Number));
      expect(envelope.linearRampToValueAtTime).toHaveBeenCalledTimes(1);
      expect(envelope.exponentialRampToValueAtTime).toHaveBeenCalledTimes(1);
    });
  });

  it("builds the noise buffer once per context and reuses it", async () => {
    const voices = await loadVoices();
    const fake = makeContext();
    const { audio } = makeAudio(fake);
    voices.playShot(audio, "pistol");
    voices.playKnife(audio);
    expect(fake.buffers).toHaveLength(1);
    const noiseSources = fake.sources.filter((source) => source.buffer);
    expect(noiseSources.length).toBeGreaterThan(1);
    noiseSources.forEach((source) => expect(source.buffer).toBe(fake.buffers[0]));
  });

  it("releases the voice only when its last source ended", async () => {
    const voices = await loadVoices();
    const fake = makeContext();
    const { audio, release } = makeAudio(fake);
    voices.playShot(audio, "pistol");
    const [first, ...others] = fake.sources;
    first?.onended?.();
    expect(release).not.toHaveBeenCalled();
    others.forEach((source) => source.onended?.());
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("stops and disconnects every source when the engine evicts the voice", async () => {
    const voices = await loadVoices();
    const fake = makeContext();
    const { audio, stops } = makeAudio(fake);
    voices.playRoundJingle(audio);
    fake.sources.forEach((source) => expect(source.stop).toHaveBeenCalledTimes(1));
    stops[0]?.();
    fake.sources.forEach((source) => {
      expect(source.stop).toHaveBeenCalledTimes(2);
      expect(source.stop.mock.calls[1]?.[0]).toBe(0);
      expect(source.disconnect).toHaveBeenCalled();
    });
  });

  it("does nothing and takes no voice when audio is unavailable", async () => {
    const voices = await loadVoices();
    const { audio } = makeAudio(null);
    for (const name of FLAT_SOUNDS) expect(() => voices[name](audio)).not.toThrow();
    expect(() => voices.playShot(audio, "pistol")).not.toThrow();
    expect(() => voices.playGroan(audio, ZOMBIE_X, ZOMBIE_Z)).not.toThrow();
    expect(() => voices.playZombieAttack(audio, ZOMBIE_X, ZOMBIE_Z)).not.toThrow();
    expect(audio.acquireVoice).not.toHaveBeenCalled();
  });
});

describe("positional sound voices", () => {
  it.each(["playGroan", "playZombieAttack"] as const)("%s sits at the zombie position and fades with distance", async (name) => {
    const AUDIO_CONFIG = await loadConfig();
    const voices = await loadVoices();
    const fake = makeContext();
    const { audio, master } = makeAudio(fake);
    voices[name](audio, ZOMBIE_X, ZOMBIE_Z);
    expect(fake.panners).toHaveLength(1);
    const panner = fake.panners[0] as FakeNode;
    expect((panner.positionX as FakeParam).value).toBe(ZOMBIE_X);
    expect((panner.positionY as FakeParam).value).toBe(AUDIO_CONFIG.PANNER.SOURCE_HEIGHT_M);
    expect((panner.positionZ as FakeParam).value).toBe(ZOMBIE_Z);
    expect(panner.distanceModel).toBe("inverse");
    expect(panner.refDistance).toBe(AUDIO_CONFIG.PANNER.REF_DISTANCE_M);
    expect(panner.maxDistance).toBe(AUDIO_CONFIG.PANNER.MAX_DISTANCE_M);
    expect(panner.rolloffFactor).toBeGreaterThan(0);
    expect(panner.connect).toHaveBeenCalledWith(master);
    const spec = AUDIO_CONFIG.SOUNDS[SOUND_NAMES[name] as string];
    expect(fake.sources).toHaveLength(spec.tones.length + spec.noises.length);
    expect(audio.acquireVoice).toHaveBeenCalledTimes(1);
  });

  it("routes positional sources through the panner and not straight to the master", async () => {
    const voices = await loadVoices();
    const fake = makeContext();
    const { audio, master } = makeAudio(fake);
    voices.playGroan(audio, ZOMBIE_X, ZOMBIE_Z);
    const panner = fake.panners[0] as FakeNode;
    fake.sources.forEach((source) => expect(reaches(source, panner)).toBe(true));
    expect(connectedTo(fake.nodes, master)).toEqual([panner]);
  });

  it("places two zombies on opposite sides of the listener at different panner positions", async () => {
    const voices = await loadVoices();
    const fake = makeContext();
    const { audio } = makeAudio(fake);
    voices.playGroan(audio, ZOMBIE_X, ZOMBIE_Z);
    voices.playGroan(audio, -ZOMBIE_X, ZOMBIE_Z);
    const [left, right] = fake.panners as FakeNode[];
    expect((left?.positionX as FakeParam).value).toBeLessThan(0);
    expect((right?.positionX as FakeParam).value).toBeGreaterThan(0);
  });
});

const ECONOMY_FLAT = [
  ["playPurchase", "PURCHASE"],
  ["playDeny", "DENY"],
  ["playDoor", "DOOR"],
  ["playBoxRoll", "BOX_ROLL"],
  ["playBoxTeddy", "BOX_TEDDY"],
] as const;
const ECONOMY_POSITIONAL = [
  ["playPlankTorn", "PLANK_TORN"],
  ["playPlankRepaired", "PLANK_REPAIRED"],
] as const;
const BOX_ROLL_TARGET_S = 4;
const BOX_ROLL_TOLERANCE_S = 0.4;
const MIN_ARPEGGIO_NOTES = 8;
const MIN_TEDDY_S = 1;
const WINDOW_X = 6;
const WINDOW_Z = -3;

type SpecShape = {
  tones: Array<{ fromHz: number; toHz: number; startS: number; durationS: number; peak: number }>;
  noises: Array<{ startS: number; durationS: number; peak: number }>;
};

const specEndS = (spec: SpecShape): number => Math.max(...spec.tones.map((tone) => tone.startS + tone.durationS), ...spec.noises.map((noise) => noise.startS + noise.durationS));
const meanHz = (spec: SpecShape): number => spec.tones.reduce((sum, tone) => sum + tone.fromHz, 0) / spec.tones.length;

describe("economy sound voices", () => {
  it("declares a spec for every economy sound name", async () => {
    const AUDIO_CONFIG = await loadConfig();
    for (const [, name] of [...ECONOMY_FLAT, ...ECONOMY_POSITIONAL]) {
      const spec = AUDIO_CONFIG.SOUNDS[name] as SpecShape | undefined;
      expect(spec).toBeDefined();
      expect(spec ? spec.tones.length + spec.noises.length : 0).toBeGreaterThan(0);
      for (const source of [...(spec?.tones ?? []), ...(spec?.noises ?? [])]) {
        expect(source.durationS).toBeGreaterThan(0);
        expect(source.peak).toBeGreaterThan(0);
        expect(source.peak).toBeLessThanOrEqual(1);
      }
    }
  });

  it.each(ECONOMY_FLAT)("%s plays its whole spec once through the master as a single voice", async (fn, name) => {
    const AUDIO_CONFIG = await loadConfig();
    const voices = await loadVoices();
    const fake = makeContext();
    const { audio, master, release } = makeAudio(fake);
    voices[fn](audio);
    const spec = AUDIO_CONFIG.SOUNDS[name] as SpecShape;
    expect(fake.sources).toHaveLength(spec.tones.length + spec.noises.length);
    fake.sources.forEach((source) => {
      expect(source.start).toHaveBeenCalledTimes(1);
      expect(source.stop).toHaveBeenCalledTimes(1);
      expect(reaches(source, master)).toBe(true);
    });
    expect(audio.acquireVoice).toHaveBeenCalledTimes(1);
    expect(fake.panners).toHaveLength(0);
    expect(release).not.toHaveBeenCalled();
  });

  it.each(ECONOMY_POSITIONAL)("%s sits at the window it is given and fades with distance", async (fn, name) => {
    const AUDIO_CONFIG = await loadConfig();
    const voices = await loadVoices();
    const fake = makeContext();
    const { audio, master } = makeAudio(fake);
    voices[fn](audio, WINDOW_X, WINDOW_Z);
    expect(fake.panners).toHaveLength(1);
    const panner = fake.panners[0] as FakeNode;
    expect((panner.positionX as FakeParam).value).toBe(WINDOW_X);
    expect((panner.positionZ as FakeParam).value).toBe(WINDOW_Z);
    expect(panner.distanceModel).toBe("inverse");
    expect(panner.connect).toHaveBeenCalledWith(master);
    const spec = AUDIO_CONFIG.SOUNDS[name] as SpecShape;
    expect(fake.sources).toHaveLength(spec.tones.length + spec.noises.length);
    fake.sources.forEach((source) => expect(reaches(source, panner)).toBe(true));
    expect(audio.acquireVoice).toHaveBeenCalledTimes(1);
  });

  it("places two plank sounds at two different windows", async () => {
    const voices = await loadVoices();
    const fake = makeContext();
    const { audio } = makeAudio(fake);
    voices.playPlankTorn(audio, -WINDOW_X, WINDOW_Z);
    voices.playPlankRepaired(audio, WINDOW_X, WINDOW_Z);
    const [left, right] = fake.panners as FakeNode[];
    expect((left?.positionX as FakeParam).value).toBeLessThan(0);
    expect((right?.positionX as FakeParam).value).toBeGreaterThan(0);
  });

  it("plays the box roll as a rising run of notes lasting about four seconds", async () => {
    const AUDIO_CONFIG = await loadConfig();
    const spec = AUDIO_CONFIG.SOUNDS.BOX_ROLL as SpecShape;
    expect(spec.tones.length).toBeGreaterThanOrEqual(MIN_ARPEGGIO_NOTES);
    expect(Math.abs(specEndS(spec) - BOX_ROLL_TARGET_S)).toBeLessThanOrEqual(BOX_ROLL_TOLERANCE_S);
    const starts = spec.tones.map((tone) => tone.startS);
    expect(new Set(starts).size).toBe(starts.length);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
    const firstHalf = spec.tones.slice(0, Math.floor(spec.tones.length / 2));
    const secondHalf = spec.tones.slice(Math.floor(spec.tones.length / 2));
    expect(meanHz({ ...spec, tones: secondHalf })).toBeGreaterThan(meanHz({ ...spec, tones: firstHalf }));
  });

  it("plays the teddy as a descending sound that outlasts the short feedback blips", async () => {
    const AUDIO_CONFIG = await loadConfig();
    const teddy = AUDIO_CONFIG.SOUNDS.BOX_TEDDY as SpecShape;
    const last = teddy.tones[teddy.tones.length - 1];
    const first = teddy.tones[0];
    expect(specEndS(teddy)).toBeGreaterThanOrEqual(MIN_TEDDY_S);
    expect(last?.toHz ?? Infinity).toBeLessThan(first?.fromHz ?? 0);
    expect(specEndS(teddy)).toBeGreaterThan(specEndS(AUDIO_CONFIG.SOUNDS.DENY as SpecShape));
  });

  it("tells a purchase from a refusal by pitch and a door from a plank by length", async () => {
    const AUDIO_CONFIG = await loadConfig();
    expect(meanHz(AUDIO_CONFIG.SOUNDS.PURCHASE as SpecShape)).toBeGreaterThan(meanHz(AUDIO_CONFIG.SOUNDS.DENY as SpecShape));
    expect(specEndS(AUDIO_CONFIG.SOUNDS.DOOR as SpecShape)).toBeGreaterThan(specEndS(AUDIO_CONFIG.SOUNDS.PLANK_TORN as SpecShape));
    expect(specEndS(AUDIO_CONFIG.SOUNDS.DOOR as SpecShape)).toBeGreaterThan(specEndS(AUDIO_CONFIG.SOUNDS.PLANK_REPAIRED as SpecShape));
  });

  it("does nothing and takes no voice when audio is unavailable", async () => {
    const voices = await loadVoices();
    const { audio } = makeAudio(null);
    for (const [fn] of ECONOMY_FLAT) expect(() => voices[fn](audio)).not.toThrow();
    for (const [fn] of ECONOMY_POSITIONAL) expect(() => voices[fn](audio, WINDOW_X, WINDOW_Z)).not.toThrow();
    expect(audio.acquireVoice).not.toHaveBeenCalled();
  });
});

const POWER_UP_FLAT = [
  ["playPowerUpTaken", "POWER_UP_TAKEN"],
  ["playNuke", "NUKE"],
] as const;
const NUKE_MIN_S = 1;
const CHIME_MAX_S = 1.5;

describe("power-up sound voices", () => {
  it("declares a spec for the power-up chime and the nuke", async () => {
    const AUDIO_CONFIG = await loadConfig();
    for (const [, name] of POWER_UP_FLAT) {
      const spec = AUDIO_CONFIG.SOUNDS[name] as SpecShape | undefined;
      expect(spec).toBeDefined();
      expect(spec ? spec.tones.length + spec.noises.length : 0).toBeGreaterThan(0);
      for (const source of [...(spec?.tones ?? []), ...(spec?.noises ?? [])]) {
        expect(source.durationS).toBeGreaterThan(0);
        expect(source.peak).toBeGreaterThan(0);
        expect(source.peak).toBeLessThanOrEqual(1);
      }
    }
  });

  it.each(POWER_UP_FLAT)("%s plays its whole spec once through the master as a single voice", async (fn, name) => {
    const AUDIO_CONFIG = await loadConfig();
    const voices = await loadVoices();
    const fake = makeContext();
    const { audio, master, release } = makeAudio(fake);
    voices[fn](audio);
    const spec = AUDIO_CONFIG.SOUNDS[name] as SpecShape;
    expect(fake.sources).toHaveLength(spec.tones.length + spec.noises.length);
    fake.sources.forEach((source) => {
      expect(source.start).toHaveBeenCalledTimes(1);
      expect(source.stop).toHaveBeenCalledTimes(1);
      expect(reaches(source, master)).toBe(true);
    });
    expect(audio.acquireVoice).toHaveBeenCalledTimes(1);
    expect(fake.panners).toHaveLength(0);
    expect(release).not.toHaveBeenCalled();
  });

  it("plays the power-up chime as a short rising run of notes", async () => {
    const AUDIO_CONFIG = await loadConfig();
    const spec = AUDIO_CONFIG.SOUNDS.POWER_UP_TAKEN as SpecShape;
    const sorted = [...spec.tones].sort((a, b) => a.startS - b.startS);
    expect(sorted.length).toBeGreaterThanOrEqual(3);
    expect(sorted[sorted.length - 1]?.fromHz ?? 0).toBeGreaterThan(sorted[0]?.fromHz ?? Infinity);
    expect(specEndS(spec)).toBeLessThanOrEqual(CHIME_MAX_S);
  });

  it("plays the nuke as a low boom with noise that outlasts the chime", async () => {
    const AUDIO_CONFIG = await loadConfig();
    const nuke = AUDIO_CONFIG.SOUNDS.NUKE as SpecShape;
    expect(nuke.noises.length).toBeGreaterThan(0);
    expect(specEndS(nuke)).toBeGreaterThanOrEqual(NUKE_MIN_S);
    expect(specEndS(nuke)).toBeGreaterThan(specEndS(AUDIO_CONFIG.SOUNDS.POWER_UP_TAKEN as SpecShape));
    expect(meanHz(nuke)).toBeLessThan(meanHz(AUDIO_CONFIG.SOUNDS.POWER_UP_TAKEN as SpecShape));
    expect(Math.min(...nuke.tones.map((tone) => tone.toHz))).toBeLessThan(meanHz(AUDIO_CONFIG.SOUNDS.HURT as SpecShape));
  });

  it("does nothing and takes no voice when audio is unavailable", async () => {
    const voices = await loadVoices();
    const { audio } = makeAudio(null);
    for (const [fn] of POWER_UP_FLAT) expect(() => voices[fn](audio)).not.toThrow();
    expect(audio.acquireVoice).not.toHaveBeenCalled();
  });
});

const MARKER_FLAT = [
  ["playHitMarker", "HIT_MARKER"],
  ["playKillMarker", "KILL_MARKER"],
] as const;
const MARKER_MAX_S = 0.3;
const MIN_KILL_TICKS = 2;

describe("hit marker sound voices", () => {
  it("declares a short spec for the hit tick and the kill double tick", async () => {
    const AUDIO_CONFIG = await loadConfig();
    for (const [, name] of MARKER_FLAT) {
      const spec = AUDIO_CONFIG.SOUNDS[name] as SpecShape | undefined;
      expect(spec).toBeDefined();
      expect(spec ? spec.tones.length + spec.noises.length : 0).toBeGreaterThan(0);
      expect(spec ? specEndS(spec) : Infinity).toBeLessThanOrEqual(MARKER_MAX_S);
      for (const source of [...(spec?.tones ?? []), ...(spec?.noises ?? [])]) {
        expect(source.durationS).toBeGreaterThan(0);
        expect(source.peak).toBeGreaterThan(0);
        expect(source.peak).toBeLessThanOrEqual(1);
      }
    }
  });

  it.each(MARKER_FLAT)("%s plays its whole spec once through the master as a single voice", async (fn, name) => {
    const AUDIO_CONFIG = await loadConfig();
    const voices = await loadVoices();
    const fake = makeContext();
    const { audio, master, release } = makeAudio(fake);
    voices[fn](audio);
    const spec = AUDIO_CONFIG.SOUNDS[name] as SpecShape;
    expect(fake.sources).toHaveLength(spec.tones.length + spec.noises.length);
    fake.sources.forEach((source) => {
      expect(source.start).toHaveBeenCalledTimes(1);
      expect(source.stop).toHaveBeenCalledTimes(1);
      expect(reaches(source, master)).toBe(true);
    });
    expect(audio.acquireVoice).toHaveBeenCalledTimes(1);
    expect(fake.panners).toHaveLength(0);
    expect(release).not.toHaveBeenCalled();
  });

  it("plays the kill marker lower than the hit tick, as two ticks", async () => {
    const AUDIO_CONFIG = await loadConfig();
    const hit = AUDIO_CONFIG.SOUNDS.HIT_MARKER as SpecShape;
    const kill = AUDIO_CONFIG.SOUNDS.KILL_MARKER as SpecShape;
    expect(meanHz(kill)).toBeLessThan(meanHz(hit));
    expect(new Set(kill.tones.map((tone) => tone.startS)).size).toBeGreaterThanOrEqual(MIN_KILL_TICKS);
    expect(new Set(hit.tones.map((tone) => tone.startS)).size).toBe(1);
  });

  it("does nothing and takes no voice when audio is unavailable", async () => {
    const voices = await loadVoices();
    const { audio } = makeAudio(null);
    for (const [fn] of MARKER_FLAT) expect(() => voices[fn](audio)).not.toThrow();
    expect(audio.acquireVoice).not.toHaveBeenCalled();
  });
});

const WEAPON_IDS = ["pistol", "smg", "carbine", "shotgun", "lmg", "rayGun"] as const;
const DRY_CLICK_MAX_S = 0.15;
const AMBIENCE_VOICES = [
  ["playWind", "WIND"],
  ["playCreak", "CREAK"],
] as const;

describe("per-weapon shot voices", () => {
  it("declares a distinct spec for every weapon", async () => {
    const AUDIO_CONFIG = await loadConfig();
    const shapes = WEAPON_IDS.map((id) => {
      const spec = AUDIO_CONFIG.SHOTS[id] as SpecShape | undefined;
      expect(spec).toBeDefined();
      expect(spec ? spec.tones.length + spec.noises.length : 0).toBeGreaterThan(0);
      for (const source of [...(spec?.tones ?? []), ...(spec?.noises ?? [])]) {
        expect(source.durationS).toBeGreaterThan(0);
        expect(source.peak).toBeGreaterThan(0);
        expect(source.peak).toBeLessThanOrEqual(1);
      }
      return JSON.stringify(spec);
    });
    expect(new Set(shapes).size).toBe(WEAPON_IDS.length);
  });

  it.each(WEAPON_IDS)("playShot(%s) plays that weapon spec once through the master as a single voice", async (id) => {
    const AUDIO_CONFIG = await loadConfig();
    const voices = await loadVoices();
    const fake = makeContext();
    const { audio, master } = makeAudio(fake);
    voices.playShot(audio, id);
    const spec = AUDIO_CONFIG.SHOTS[id] as SpecShape;
    expect(fake.sources).toHaveLength(spec.tones.length + spec.noises.length);
    fake.sources.forEach((source) => {
      expect(source.start).toHaveBeenCalledTimes(1);
      expect(reaches(source, master)).toBe(true);
    });
    expect(audio.acquireVoice).toHaveBeenCalledTimes(1);
    expect(fake.panners).toHaveLength(0);
  });

  it("builds different oscillators for two different weapons", async () => {
    const voices = await loadVoices();
    const startHz = (id: string): number[] => {
      const fake = makeContext();
      const { audio } = makeAudio(fake);
      voices.playShot(audio, id);
      return fake.sources.filter((source) => !source.buffer && source.buffer !== null).map((source) => (source.frequency as FakeParam).setValueAtTime.mock.calls[0]?.[0] as number);
    };
    expect(startHz("pistol")).not.toEqual(startHz("shotgun"));
  });

  it("does nothing when audio is unavailable", async () => {
    const voices = await loadVoices();
    const { audio } = makeAudio(null);
    for (const id of WEAPON_IDS) expect(() => voices.playShot(audio, id)).not.toThrow();
    expect(audio.acquireVoice).not.toHaveBeenCalled();
  });
});

describe("dry click, round end and ambience voices", () => {
  it("plays the dry click as a short spec", async () => {
    const AUDIO_CONFIG = await loadConfig();
    const spec = AUDIO_CONFIG.SOUNDS.DRY_CLICK as SpecShape;
    expect(spec).toBeDefined();
    expect(specEndS(spec)).toBeLessThanOrEqual(DRY_CLICK_MAX_S);
    expect(specEndS(spec)).toBeLessThan(specEndS(AUDIO_CONFIG.SHOTS.pistol as SpecShape));
  });

  it("plays the round end jingle as a descending run that outlasts the round start jingle notes", async () => {
    const AUDIO_CONFIG = await loadConfig();
    const end = AUDIO_CONFIG.SOUNDS.ROUND_END_JINGLE as SpecShape;
    expect(end).toBeDefined();
    const sorted = [...end.tones].sort((a, b) => a.startS - b.startS);
    expect(sorted.length).toBeGreaterThanOrEqual(3);
    expect(sorted[sorted.length - 1]?.fromHz ?? Infinity).toBeLessThan(sorted[0]?.fromHz ?? 0);
    expect(JSON.stringify(end)).not.toBe(JSON.stringify(AUDIO_CONFIG.SOUNDS.ROUND_JINGLE));
  });

  it("declares the ambience drone, wind and creak settings", async () => {
    const AUDIO_CONFIG = await loadConfig();
    const ambience = AUDIO_CONFIG.AMBIENCE;
    expect(ambience.DRONE_MAX_GAIN).toBeGreaterThan(0);
    expect(ambience.DRONE_MAX_GAIN).toBeLessThanOrEqual(1);
    expect(ambience.DRONE_BASE_GAIN).toBeLessThan(ambience.DRONE_MAX_GAIN);
    expect(ambience.DRONE_GAIN_PER_ROUND).toBeGreaterThan(0);
    expect(ambience.WIND_MIN_S).toBeGreaterThan(0);
    expect(ambience.WIND_MAX_S).toBeGreaterThan(ambience.WIND_MIN_S);
    expect(ambience.CREAK_MIN_S).toBeGreaterThan(0);
    expect(ambience.CREAK_MAX_S).toBeGreaterThan(ambience.CREAK_MIN_S);
    expect(ambience.WIND.noises.length).toBeGreaterThan(0);
    expect(ambience.CREAK.tones.length).toBeGreaterThan(0);
  });

  it.each(AMBIENCE_VOICES)("%s plays its ambience spec once through the master as a single voice", async (fn, name) => {
    const AUDIO_CONFIG = await loadConfig();
    const voices = await loadVoices();
    const fake = makeContext();
    const { audio, master } = makeAudio(fake);
    voices[fn](audio);
    const spec = AUDIO_CONFIG.AMBIENCE[name] as SpecShape;
    expect(fake.sources).toHaveLength(spec.tones.length + spec.noises.length);
    fake.sources.forEach((source) => expect(reaches(source, master)).toBe(true));
    expect(audio.acquireVoice).toHaveBeenCalledTimes(1);
  });
});
