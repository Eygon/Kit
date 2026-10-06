export {};

const ENGINE_MODULE = "@/audio/audioEngine";
const CONFIG_MODULE = "@/config/audioConfig";
const LISTENER_X = 3;
const LISTENER_Y = 1.6;
const LISTENER_Z = -4;
const QUARTER_TURN_RAD = Math.PI / 2;

type Param = { value: number };
type FakeNode = { gain: Param; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> };

const created = vi.hoisted(() => ({ contexts: [] as unknown[] }));

class FakeAudioContext {
  state = "suspended";
  destination = { name: "destination" };
  resume = vi.fn(() => Promise.resolve());
  gains: FakeNode[] = [];
  listener = {
    positionX: { value: 0 },
    positionY: { value: 0 },
    positionZ: { value: 0 },
    forwardX: { value: 0 },
    forwardY: { value: 0 },
    forwardZ: { value: 0 },
    upX: { value: 0 },
    upY: { value: 0 },
    upZ: { value: 0 },
  };
  constructor() {
    created.contexts.push(this);
  }
  createGain(): FakeNode {
    const node = { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() };
    this.gains.push(node);
    return node;
  }
}

const loadEngine = async () => (await import(/* @vite-ignore */ ENGINE_MODULE)).createAudioEngine;
const loadConfig = async () => (await import(/* @vite-ignore */ CONFIG_MODULE)).AUDIO_CONFIG;
const lastContext = (): FakeAudioContext => created.contexts[created.contexts.length - 1] as FakeAudioContext;

describe("createAudioEngine", () => {
  beforeEach(() => {
    created.contexts.length = 0;
    vi.stubGlobal("AudioContext", FakeAudioContext);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates the audio context and the master gain lazily, once", async () => {
    const AUDIO_CONFIG = await loadConfig();
    const engine = (await loadEngine())();
    expect(created.contexts).toHaveLength(0);
    const first = engine.getContext();
    const second = engine.getContext();
    expect(first).toBe(second);
    expect(created.contexts).toHaveLength(1);
    const context = lastContext();
    expect(context.gains).toHaveLength(1);
    expect(engine.getMaster()).toBe(context.gains[0]);
    expect(context.gains[0]?.gain.value).toBe(AUDIO_CONFIG.AUDIO_MASTER_GAIN);
    expect(context.gains[0]?.connect).toHaveBeenCalledWith(context.destination);
  });

  it("resumes the suspended context on unlock and not again once running", async () => {
    const engine = (await loadEngine())();
    engine.unlock();
    const context = lastContext();
    expect(context.resume).toHaveBeenCalledTimes(1);
    context.state = "running";
    engine.unlock();
    expect(context.resume).toHaveBeenCalledTimes(1);
    expect(created.contexts).toHaveLength(1);
  });

  it("stays silent without throwing when the platform has no AudioContext", async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("AudioContext", undefined);
    const engine = (await loadEngine())();
    expect(engine.getContext()).toBeNull();
    expect(engine.getMaster()).toBeNull();
    expect(() => engine.unlock()).not.toThrow();
    expect(() => engine.setListener(0, 0, 0, 0)).not.toThrow();
    const release = engine.acquireVoice(() => undefined);
    expect(() => release()).not.toThrow();
  });

  it("stops the oldest voice first once the voice cap is exceeded", async () => {
    const AUDIO_CONFIG = await loadConfig();
    const engine = (await loadEngine())();
    const stops = Array.from({ length: AUDIO_CONFIG.AUDIO_VOICE_CAP + 2 }, () => vi.fn());
    stops.slice(0, AUDIO_CONFIG.AUDIO_VOICE_CAP).forEach((stop) => engine.acquireVoice(stop));
    stops.forEach((stop) => expect(stop).not.toHaveBeenCalled());
    engine.acquireVoice(stops[AUDIO_CONFIG.AUDIO_VOICE_CAP] ?? vi.fn());
    expect(stops[0]).toHaveBeenCalledTimes(1);
    expect(stops[1]).not.toHaveBeenCalled();
    engine.acquireVoice(stops[AUDIO_CONFIG.AUDIO_VOICE_CAP + 1] ?? vi.fn());
    expect(stops[1]).toHaveBeenCalledTimes(1);
    expect(stops[0]).toHaveBeenCalledTimes(1);
    expect(stops[2]).not.toHaveBeenCalled();
  });

  it("does not count a released voice against the cap", async () => {
    const AUDIO_CONFIG = await loadConfig();
    const engine = (await loadEngine())();
    const stops = Array.from({ length: AUDIO_CONFIG.AUDIO_VOICE_CAP }, () => vi.fn());
    const releases = stops.map((stop) => engine.acquireVoice(stop));
    releases[0]?.();
    const extra = vi.fn();
    engine.acquireVoice(extra);
    stops.forEach((stop) => expect(stop).not.toHaveBeenCalled());
    expect(extra).not.toHaveBeenCalled();
  });

  it("ignores the release of a voice that was already evicted", async () => {
    const AUDIO_CONFIG = await loadConfig();
    const engine = (await loadEngine())();
    const stops = Array.from({ length: AUDIO_CONFIG.AUDIO_VOICE_CAP }, () => vi.fn());
    const releases = stops.map((stop) => engine.acquireVoice(stop));
    engine.acquireVoice(vi.fn());
    releases[0]?.();
    engine.acquireVoice(vi.fn());
    expect(stops[0]).toHaveBeenCalledTimes(1);
    expect(stops[1]).toHaveBeenCalledTimes(1);
    expect(stops[2]).not.toHaveBeenCalled();
  });

  it("places the listener at the camera and faces it along the yaw", async () => {
    const engine = (await loadEngine())();
    engine.getContext();
    const { listener } = lastContext();
    engine.setListener(LISTENER_X, LISTENER_Y, LISTENER_Z, 0);
    expect([listener.positionX.value, listener.positionY.value, listener.positionZ.value]).toEqual([LISTENER_X, LISTENER_Y, LISTENER_Z]);
    expect(listener.forwardX.value).toBeCloseTo(0, 6);
    expect(listener.forwardY.value).toBeCloseTo(0, 6);
    expect(listener.forwardZ.value).toBeCloseTo(-1, 6);
    expect(listener.upY.value).toBe(1);
    engine.setListener(LISTENER_X, LISTENER_Y, LISTENER_Z, QUARTER_TURN_RAD);
    expect(listener.forwardX.value).toBeCloseTo(-1, 6);
    expect(listener.forwardZ.value).toBeCloseTo(0, 6);
  });

  it("applies a listener pose given before the context existed", async () => {
    const engine = (await loadEngine())();
    engine.setListener(LISTENER_X, LISTENER_Y, LISTENER_Z, 0);
    expect(created.contexts).toHaveLength(0);
    engine.getContext();
    const { listener } = lastContext();
    expect(listener.positionX.value).toBe(LISTENER_X);
    expect(listener.positionZ.value).toBe(LISTENER_Z);
    expect(listener.forwardZ.value).toBeCloseTo(-1, 6);
  });
});
