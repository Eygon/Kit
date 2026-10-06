export {};

const AMBIENCE_MODULE = "@/audio/ambience";
const CONFIG_MODULE = "@/config/audioConfig";
const FRAME_S = 1 / 60;
const NOW_S = 3;
const LONG_RUN_S = 400;
const LAST_ROUND = 500;

const voices = vi.hoisted(() => ({
  playWind: vi.fn(),
  playCreak: vi.fn(),
}));

vi.mock("@/audio/soundVoices", () => voices);

type FakeParam = { value: number; setValueAtTime: ReturnType<typeof vi.fn>; setTargetAtTime: ReturnType<typeof vi.fn> };
type FakeNode = Record<string, unknown> & { connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> };
type FakeOscillator = FakeNode & { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> };

const param = (): FakeParam => ({ value: 0, setValueAtTime: vi.fn(), setTargetAtTime: vi.fn() });

const makeFake = (state: string | null) => {
  const oscillators: FakeOscillator[] = [];
  const gains: FakeNode[] = [];
  const node = (extra: Record<string, unknown>): FakeNode => ({ connect: vi.fn(), disconnect: vi.fn(), ...extra });
  const context = {
    currentTime: NOW_S,
    state: state ?? "running",
    createOscillator: () => {
      const oscillator = Object.assign(node({ type: "sine", frequency: param() }), { start: vi.fn(), stop: vi.fn() }) as FakeOscillator;
      oscillators.push(oscillator);
      return oscillator;
    },
    createGain: () => {
      const gain = node({ gain: param() });
      gains.push(gain);
      return gain;
    },
    createBiquadFilter: () => node({ type: "lowpass", frequency: param(), Q: param() }),
  };
  const master = node({ name: "master" });
  const audio = {
    getContext: () => (state === null ? null : context),
    getMaster: () => (state === null ? null : master),
    unlock: vi.fn(),
    acquireVoice: vi.fn(),
    setListener: vi.fn(),
  };
  return { audio, context, master, oscillators, gains };
};

const reaches = (from: FakeNode, target: unknown): boolean =>
  from.connect.mock.calls.some((call) => call[0] === target || (typeof call[0] === "object" && reaches(call[0] as FakeNode, target)));

const loadAmbience = async () => await import(/* @vite-ignore */ AMBIENCE_MODULE);
const loadConfig = async () => (await import(/* @vite-ignore */ CONFIG_MODULE)).AUDIO_CONFIG;

const record = async (fake: ReturnType<typeof makeFake>, round: number, seconds: number, spy: ReturnType<typeof vi.fn>): Promise<number[]> => {
  const { createAmbience } = await loadAmbience();
  const ambience = createAmbience(fake.audio);
  const times: number[] = [];
  const frames = Math.ceil(seconds / FRAME_S);
  for (let frame = 0; frame < frames; frame++) {
    const before = spy.mock.calls.length;
    ambience.update(round, FRAME_S);
    if (spy.mock.calls.length > before) times.push(frame * FRAME_S);
  }
  return times;
};

describe("createAmbience", () => {
  beforeEach(() => {
    Object.values(voices).forEach((spy) => spy.mockClear());
  });

  it("stays silent and builds nothing while the engine has no context", async () => {
    const { createAmbience } = await loadAmbience();
    const fake = makeFake(null);
    const ambience = createAmbience(fake.audio);
    for (let frame = 0; frame < LONG_RUN_S / FRAME_S / 10; frame++) ambience.update(1, FRAME_S);
    expect(fake.oscillators).toHaveLength(0);
    expect(voices.playWind).not.toHaveBeenCalled();
    expect(voices.playCreak).not.toHaveBeenCalled();
  });

  it("stays silent while the context is still suspended, then starts once it runs", async () => {
    const AUDIO_CONFIG = await loadConfig();
    const { createAmbience } = await loadAmbience();
    const fake = makeFake("suspended");
    const ambience = createAmbience(fake.audio);
    const idleFrames = Math.ceil((AUDIO_CONFIG.AMBIENCE.WIND_MAX_S * 3) / FRAME_S);
    for (let frame = 0; frame < idleFrames; frame++) ambience.update(1, FRAME_S);
    expect(fake.oscillators).toHaveLength(0);
    expect(voices.playWind).not.toHaveBeenCalled();
    fake.context.state = "running";
    ambience.update(1, FRAME_S);
    expect(fake.oscillators.length).toBeGreaterThan(0);
    expect(voices.playWind).not.toHaveBeenCalled();
  });

  it("starts the looping drone once and routes it to the master", async () => {
    const { createAmbience } = await loadAmbience();
    const fake = makeFake("running");
    const ambience = createAmbience(fake.audio);
    ambience.update(1, FRAME_S);
    const started = fake.oscillators.length;
    expect(started).toBeGreaterThan(0);
    fake.oscillators.forEach((oscillator) => {
      expect(oscillator.start).toHaveBeenCalledTimes(1);
      expect(oscillator.stop).not.toHaveBeenCalled();
      expect(reaches(oscillator, fake.master)).toBe(true);
    });
    for (let frame = 0; frame < 600; frame++) ambience.update(2, FRAME_S);
    expect(fake.oscillators).toHaveLength(started);
    fake.oscillators.forEach((oscillator) => expect(oscillator.start).toHaveBeenCalledTimes(1));
  });

  it("raises the drone gain with the round and never above the cap", async () => {
    const AUDIO_CONFIG = await loadConfig();
    const { createAmbience } = await loadAmbience();
    const fake = makeFake("running");
    const ambience = createAmbience(fake.audio);
    const targets: number[] = [];
    const readTarget = (): number => {
      const calls = fake.gains.flatMap((gain) => (gain.gain as FakeParam).setTargetAtTime.mock.calls);
      const last = calls[calls.length - 1] as [number, number, number];
      return last[0];
    };
    for (const round of [1, 3, 6, LAST_ROUND]) {
      ambience.update(round, FRAME_S);
      targets.push(readTarget());
    }
    expect(targets[1]).toBeGreaterThan(targets[0] as number);
    expect(targets[2]).toBeGreaterThan(targets[1] as number);
    expect(targets[3]).toBe(AUDIO_CONFIG.AMBIENCE.DRONE_MAX_GAIN);
    targets.forEach((target) => expect(target).toBeLessThanOrEqual(AUDIO_CONFIG.AMBIENCE.DRONE_MAX_GAIN));
  });

  it("exposes a drone gain that grows by round up to the configured cap", async () => {
    const AUDIO_CONFIG = await loadConfig();
    const { droneGainForRound } = await loadAmbience();
    expect(droneGainForRound(2)).toBeGreaterThan(droneGainForRound(1));
    expect(droneGainForRound(LAST_ROUND)).toBe(AUDIO_CONFIG.AMBIENCE.DRONE_MAX_GAIN);
    expect(droneGainForRound(LAST_ROUND + 1)).toBe(AUDIO_CONFIG.AMBIENCE.DRONE_MAX_GAIN);
    expect(droneGainForRound(1)).toBeGreaterThan(0);
  });

  it("plays wind at random intervals within the configured bounds", async () => {
    const AUDIO_CONFIG = await loadConfig();
    const times = await record(makeFake("running"), 1, LONG_RUN_S, voices.playWind);
    expect(times.length).toBeGreaterThanOrEqual(5);
    expect(times[0] as number).toBeGreaterThanOrEqual(AUDIO_CONFIG.AMBIENCE.WIND_MIN_S - FRAME_S);
    expect(times[0] as number).toBeLessThanOrEqual(AUDIO_CONFIG.AMBIENCE.WIND_MAX_S + FRAME_S);
    const gaps = times.slice(1).map((time, index) => time - (times[index] as number));
    gaps.forEach((gap) => {
      expect(gap).toBeGreaterThanOrEqual(AUDIO_CONFIG.AMBIENCE.WIND_MIN_S - FRAME_S);
      expect(gap).toBeLessThanOrEqual(AUDIO_CONFIG.AMBIENCE.WIND_MAX_S + FRAME_S);
    });
    expect(new Set(gaps.map((gap) => gap.toFixed(2))).size).toBeGreaterThan(1);
  });

  it("plays creaks at random intervals within the configured bounds", async () => {
    const AUDIO_CONFIG = await loadConfig();
    const times = await record(makeFake("running"), 1, LONG_RUN_S, voices.playCreak);
    expect(times.length).toBeGreaterThanOrEqual(5);
    expect(times[0] as number).toBeGreaterThanOrEqual(AUDIO_CONFIG.AMBIENCE.CREAK_MIN_S - FRAME_S);
    const gaps = times.slice(1).map((time, index) => time - (times[index] as number));
    gaps.forEach((gap) => {
      expect(gap).toBeGreaterThanOrEqual(AUDIO_CONFIG.AMBIENCE.CREAK_MIN_S - FRAME_S);
      expect(gap).toBeLessThanOrEqual(AUDIO_CONFIG.AMBIENCE.CREAK_MAX_S + FRAME_S);
    });
  });

  it("replays the same wind schedule for the same presentation seed", async () => {
    const first = await record(makeFake("running"), 1, LONG_RUN_S / 2, voices.playWind);
    voices.playWind.mockClear();
    const second = await record(makeFake("running"), 1, LONG_RUN_S / 2, voices.playWind);
    expect(first.length).toBeGreaterThan(0);
    expect(second).toEqual(first);
  });

  it("passes the engine to the wind and creak voices", async () => {
    const fake = makeFake("running");
    await record(fake, 1, LONG_RUN_S, voices.playWind);
    expect(voices.playWind).toHaveBeenCalledWith(fake.audio);
    expect(voices.playCreak).toHaveBeenCalledWith(fake.audio);
  });
});
