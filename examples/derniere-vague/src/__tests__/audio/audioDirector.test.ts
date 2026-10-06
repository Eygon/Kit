export {};

const DIRECTOR_MODULE = "@/audio/audioDirector";
const CONFIG_MODULE = "@/config/audioConfig";
const FRAME_S = 1 / 60;
const STRIDE_FRACTION = 0.7;
const WALK_MOVES = 6;
const EXPECTED_STEPS = 4;
const NEAR_X = -3;
const NEAR_Z = 2;

type FakeZombie = { id: number; alive: boolean; state: string; x: number; z: number };
type FakeSession = {
  events: Array<Record<string, unknown>>;
  player: { x: number; z: number; yaw: number; pitch: number };
  horde: { zombies: FakeZombie[] };
  weapon: { weaponId: string };
  rounds: { number: number; phase: { kind: string } };
};

const voices = vi.hoisted(() => ({
  playShot: vi.fn(),
  playReload: vi.fn(),
  playKnife: vi.fn(),
  playFootstep: vi.fn(),
  playHurt: vi.fn(),
  playRoundJingle: vi.fn(),
  playGroan: vi.fn(),
  playZombieAttack: vi.fn(),
  playPurchase: vi.fn(),
  playDeny: vi.fn(),
  playDoor: vi.fn(),
  playPlankTorn: vi.fn(),
  playPlankRepaired: vi.fn(),
  playBoxRoll: vi.fn(),
  playBoxTeddy: vi.fn(),
  playPowerUpTaken: vi.fn(),
  playNuke: vi.fn(),
  playHitMarker: vi.fn(),
  playKillMarker: vi.fn(),
  playDryClick: vi.fn(),
  playRoundEnd: vi.fn(),
}));

const ambience = vi.hoisted(() => ({
  update: vi.fn(),
  createAmbience: vi.fn(),
}));

vi.mock("@/audio/soundVoices", () => voices);
vi.mock("@/audio/ambience", () => ({ createAmbience: ambience.createAmbience }));

const audio = { name: "audio" };
const loadDirector = async () => (await import(/* @vite-ignore */ DIRECTOR_MODULE)).createAudioDirector(audio);
const loadConfig = async () => (await import(/* @vite-ignore */ CONFIG_MODULE)).AUDIO_CONFIG;

const makeSession = (events: Array<Record<string, unknown>> = [], zombies: FakeZombie[] = []): FakeSession => ({
  events,
  player: { x: 0, z: 0, yaw: 0, pitch: 0 },
  horde: { zombies },
  weapon: { weaponId: "pistol" },
  rounds: { number: 1, phase: { kind: "active" } },
});

const zombie = (id: number, x: number, z: number, state = "chasing", alive = true): FakeZombie => ({ id, alive, state, x, z });

const totalCalls = (): number => Object.values(voices).reduce((sum, spy) => sum + spy.mock.calls.length, 0);

describe("createAudioDirector", () => {
  beforeEach(() => {
    Object.values(voices).forEach((spy) => spy.mockClear());
    ambience.update.mockClear();
    ambience.createAmbience.mockReset();
    ambience.createAmbience.mockReturnValue({ update: ambience.update });
  });

  it.each([
    [{ kind: "reloadStarted" }, "playReload"],
    [{ kind: "knifeSwung" }, "playKnife"],
    [{ kind: "playerHit", damage: 35 }, "playHurt"],
    [{ kind: "roundStarted", round: 2 }, "playRoundJingle"],
  ] as const)("plays %j as %s exactly once", async (event, voiceName) => {
    const director = await loadDirector();
    director.update(makeSession([{ ...event }]), FRAME_S);
    expect(voices[voiceName]).toHaveBeenCalledTimes(1);
    expect(voices[voiceName]).toHaveBeenCalledWith(audio);
    expect(totalCalls()).toBe(1);
  });

  it("stays silent for events that own no sound", async () => {
    const director = await loadDirector();
    const events = [
      { kind: "reloadDone" },
      { kind: "zombieHit", id: 1, damage: 10, head: false, knife: false },
    ];
    director.update(makeSession(events), FRAME_S);
    expect(totalCalls()).toBe(0);
  });

  it("plays one voice per event when a frame holds several", async () => {
    const director = await loadDirector();
    director.update(makeSession([{ kind: "shotFired" }, { kind: "shotFired" }, { kind: "playerHit", damage: 35 }]), FRAME_S);
    expect(voices.playShot).toHaveBeenCalledTimes(2);
    expect(voices.playHurt).toHaveBeenCalledTimes(1);
  });

  it("plays the round jingle on the round change of a freshly started session", async () => {
    const director = await loadDirector();
    director.update(makeSession([{ kind: "roundStarted", round: 1 }]), FRAME_S);
    expect(voices.playRoundJingle).toHaveBeenCalledTimes(1);
  });

  it("plays one footstep per stride walked and none while standing", async () => {
    const AUDIO_CONFIG = await loadConfig();
    const director = await loadDirector();
    const session = makeSession();
    director.update(session, FRAME_S);
    for (let frame = 0; frame < WALK_MOVES; frame++) director.update(session, FRAME_S);
    expect(voices.playFootstep).not.toHaveBeenCalled();
    for (let frame = 0; frame < WALK_MOVES; frame++) {
      session.player.x += AUDIO_CONFIG.FOOTSTEP_STRIDE_M * STRIDE_FRACTION;
      director.update(session, FRAME_S);
    }
    expect(voices.playFootstep).toHaveBeenCalledTimes(EXPECTED_STEPS);
    expect(voices.playFootstep).toHaveBeenCalledWith(audio);
  });

  it("ignores a teleport of the player instead of stepping for it", async () => {
    const AUDIO_CONFIG = await loadConfig();
    const director = await loadDirector();
    const session = makeSession();
    director.update(session, FRAME_S);
    session.player.x += AUDIO_CONFIG.FOOTSTEP_MAX_JUMP_M * 4;
    director.update(session, FRAME_S);
    expect(voices.playFootstep).not.toHaveBeenCalled();
  });

  it("plays one attack sound at the zombie when it starts attacking", async () => {
    const director = await loadDirector();
    const attacker = zombie(1, NEAR_X, NEAR_Z);
    const session = makeSession([], [attacker]);
    director.update(session, FRAME_S);
    expect(voices.playZombieAttack).not.toHaveBeenCalled();
    attacker.state = "attacking";
    director.update(session, FRAME_S);
    director.update(session, FRAME_S);
    expect(voices.playZombieAttack).toHaveBeenCalledTimes(1);
    expect(voices.playZombieAttack).toHaveBeenCalledWith(audio, NEAR_X, NEAR_Z);
    attacker.state = "chasing";
    director.update(session, FRAME_S);
    attacker.state = "attacking";
    director.update(session, FRAME_S);
    expect(voices.playZombieAttack).toHaveBeenCalledTimes(2);
  });

  it("makes a chasing zombie to the player's left groan from the left, within the groan interval", async () => {
    const AUDIO_CONFIG = await loadConfig();
    const director = await loadDirector();
    const session = makeSession([], [zombie(1, NEAR_X, NEAR_Z)]);
    const frames = Math.ceil((AUDIO_CONFIG.GROAN_MAX_S + 1) / FRAME_S);
    for (let frame = 0; frame < frames; frame++) director.update(session, FRAME_S);
    expect(voices.playGroan).toHaveBeenCalled();
    const [firstAudio, x, z] = voices.playGroan.mock.calls[0] as [unknown, number, number];
    expect(firstAudio).toBe(audio);
    expect(x).toBeLessThan(session.player.x);
    expect(z).toBe(NEAR_Z);
  });

  it("spaces the groans of one zombie by at least the minimum interval", async () => {
    const AUDIO_CONFIG = await loadConfig();
    const director = await loadDirector();
    const session = makeSession([], [zombie(1, NEAR_X, NEAR_Z)]);
    const groanFrames: number[] = [];
    const frames = Math.ceil((AUDIO_CONFIG.GROAN_MAX_S * 4) / FRAME_S);
    for (let frame = 0; frame < frames; frame++) {
      const before = voices.playGroan.mock.calls.length;
      director.update(session, FRAME_S);
      if (voices.playGroan.mock.calls.length > before) groanFrames.push(frame);
    }
    expect(groanFrames.length).toBeGreaterThanOrEqual(3);
    for (let index = 1; index < groanFrames.length; index++) {
      const gapS = ((groanFrames[index] as number) - (groanFrames[index - 1] as number)) * FRAME_S;
      expect(gapS).toBeGreaterThanOrEqual(AUDIO_CONFIG.GROAN_MIN_S - FRAME_S);
      expect(gapS).toBeLessThanOrEqual(AUDIO_CONFIG.GROAN_MAX_S + FRAME_S);
    }
  });

  it("only groans for alive chasing zombies within hearing distance", async () => {
    const AUDIO_CONFIG = await loadConfig();
    const director = await loadDirector();
    const far = AUDIO_CONFIG.GROAN_MAX_DISTANCE_M + 5;
    const zombies = [zombie(1, 0, far), zombie(2, NEAR_X, NEAR_Z, "spawning"), zombie(3, NEAR_X, NEAR_Z, "dying"), zombie(4, NEAR_X, NEAR_Z, "chasing", false), zombie(5, NEAR_X, NEAR_Z, "attacking")];
    const session = makeSession([], zombies);
    const frames = Math.ceil((AUDIO_CONFIG.GROAN_MAX_S * 2) / FRAME_S);
    for (let frame = 0; frame < frames; frame++) director.update(session, FRAME_S);
    expect(voices.playGroan).not.toHaveBeenCalled();
  });

  it("replays the same groan schedule for the same presentation seed", async () => {
    const AUDIO_CONFIG = await loadConfig();
    const record = async (): Promise<number[]> => {
      voices.playGroan.mockClear();
      const director = await loadDirector();
      const session = makeSession([], [zombie(1, NEAR_X, NEAR_Z), zombie(2, 5, 5)]);
      const frames: number[] = [];
      const total = Math.ceil((AUDIO_CONFIG.GROAN_MAX_S * 3) / FRAME_S);
      for (let frame = 0; frame < total; frame++) {
        const before = voices.playGroan.mock.calls.length;
        director.update(session, FRAME_S);
        if (voices.playGroan.mock.calls.length > before) frames.push(frame);
      }
      return frames;
    };
    const first = await record();
    const second = await record();
    expect(first.length).toBeGreaterThan(0);
    expect(second).toEqual(first);
  });
});

const WINDOW_X = 6.5;
const WINDOW_Z = -4.25;

describe("createAudioDirector economy events", () => {
  beforeEach(() => {
    Object.values(voices).forEach((spy) => spy.mockClear());
  });

  it.each([
    [{ kind: "purchaseDone", pointId: "wall-smg", costPoints: 1000 }, "playPurchase"],
    [{ kind: "purchaseDenied", pointId: "wall-smg" }, "playDeny"],
    [{ kind: "doorOpening", zoneId: "north" }, "playDoor"],
    [{ kind: "boxOpened" }, "playBoxRoll"],
    [{ kind: "boxTeddy" }, "playBoxTeddy"],
  ] as const)("plays %j as %s exactly once", async (event, voiceName) => {
    const director = await loadDirector();
    director.update(makeSession([{ ...event }]), FRAME_S);
    expect(voices[voiceName]).toHaveBeenCalledTimes(1);
    expect(voices[voiceName]).toHaveBeenCalledWith(audio);
    expect(totalCalls()).toBe(1);
  });

  it.each([
    ["plankTorn", "playPlankTorn"],
    ["plankRepaired", "playPlankRepaired"],
  ] as const)("plays %s at its window, spatialised, exactly once", async (kind, voiceName) => {
    const director = await loadDirector();
    director.update(makeSession([{ kind, windowId: "north-left", x: WINDOW_X, z: WINDOW_Z }]), FRAME_S);
    expect(voices[voiceName]).toHaveBeenCalledTimes(1);
    expect(voices[voiceName]).toHaveBeenCalledWith(audio, WINDOW_X, WINDOW_Z);
    expect(totalCalls()).toBe(1);
  });

  it("keeps the two plank sounds apart", async () => {
    const director = await loadDirector();
    director.update(makeSession([{ kind: "plankTorn", windowId: "a", x: 1, z: 2 }]), FRAME_S);
    expect(voices.playPlankRepaired).not.toHaveBeenCalled();
    director.update(makeSession([{ kind: "plankRepaired", windowId: "a", x: 3, z: 4 }]), FRAME_S);
    expect(voices.playPlankTorn).toHaveBeenCalledTimes(1);
    expect(voices.playPlankRepaired).toHaveBeenCalledWith(audio, 3, 4);
  });

  it("plays one voice per event when a frame mixes several economy events", async () => {
    const director = await loadDirector();
    const events = [
      { kind: "purchaseDone", pointId: "wall-smg", costPoints: 1000 },
      { kind: "purchaseDenied", pointId: "wall-carbine" },
      { kind: "plankTorn", windowId: "a", x: 1, z: 2 },
      { kind: "plankTorn", windowId: "b", x: 5, z: 6 },
      { kind: "boxOpened" },
    ];
    director.update(makeSession(events), FRAME_S);
    expect(voices.playPurchase).toHaveBeenCalledTimes(1);
    expect(voices.playDeny).toHaveBeenCalledTimes(1);
    expect(voices.playPlankTorn).toHaveBeenCalledTimes(2);
    expect(voices.playBoxRoll).toHaveBeenCalledTimes(1);
    expect(totalCalls()).toBe(5);
  });

  it("stays silent for the economy events that own no sound", async () => {
    const director = await loadDirector();
    const events = [
      { kind: "doorOpened", zoneId: "north" },
      { kind: "boxOffered", weaponId: "smg" },
      { kind: "boxMoved", spot: 1 },
      { kind: "boxWeaponTaken", weaponId: "smg" },
    ];
    director.update(makeSession(events), FRAME_S);
    expect(totalCalls()).toBe(0);
  });
});

describe("createAudioDirector power-ups", () => {
  beforeEach(() => {
    Object.values(voices).forEach((spy) => spy.mockClear());
  });

  it("plays the announce chime exactly once for a taken power-up", async () => {
    const director = await loadDirector();
    director.update(makeSession([{ kind: "powerUpTaken", powerUpKind: "doublePoints" }]), FRAME_S);
    expect(voices.playPowerUpTaken).toHaveBeenCalledTimes(1);
    expect(voices.playPowerUpTaken).toHaveBeenCalledWith(audio);
    expect(totalCalls()).toBe(1);
  });

  it("plays the nuke boom exactly once when the nuke detonates", async () => {
    const director = await loadDirector();
    director.update(makeSession([{ kind: "nukeDetonated" }]), FRAME_S);
    expect(voices.playNuke).toHaveBeenCalledTimes(1);
    expect(voices.playNuke).toHaveBeenCalledWith(audio);
    expect(totalCalls()).toBe(1);
  });

  it("plays the chime and the boom together when a nuke is taken", async () => {
    const director = await loadDirector();
    director.update(makeSession([{ kind: "powerUpTaken", powerUpKind: "nuke" }, { kind: "nukeDetonated" }]), FRAME_S);
    expect(voices.playPowerUpTaken).toHaveBeenCalledTimes(1);
    expect(voices.playNuke).toHaveBeenCalledTimes(1);
  });

  it("stays silent for a drop that appears or expires", async () => {
    const director = await loadDirector();
    director.update(makeSession([{ kind: "powerUpDropped", slot: 0, powerUpKind: "nuke", x: 1, z: 1 }, { kind: "powerUpExpired", slot: 0 }]), FRAME_S);
    expect(totalCalls()).toBe(0);
  });

  it("does not replay the chime on a later frame without the event", async () => {
    const director = await loadDirector();
    const session = makeSession([{ kind: "powerUpTaken", powerUpKind: "maxAmmo" }]);
    director.update(session, FRAME_S);
    session.events.length = 0;
    director.update(session, FRAME_S);
    expect(voices.playPowerUpTaken).toHaveBeenCalledTimes(1);
  });
});

const HIT = { kind: "targetHit", targetId: 1, damage: 10, head: false, knife: false };
const KILL = { kind: "zombieKilled", id: 1, headshot: false };
const PELLETS = 8;

describe("createAudioDirector hit markers", () => {
  beforeEach(() => {
    Object.values(voices).forEach((spy) => spy.mockClear());
  });

  it("plays the hit tick exactly once for a hit", async () => {
    const director = await loadDirector();
    director.update(makeSession([{ ...HIT }]), FRAME_S);
    expect(voices.playHitMarker).toHaveBeenCalledTimes(1);
    expect(voices.playHitMarker).toHaveBeenCalledWith(audio);
    expect(voices.playKillMarker).not.toHaveBeenCalled();
    expect(totalCalls()).toBe(1);
  });

  it("plays the kill marker for a kill", async () => {
    const director = await loadDirector();
    director.update(makeSession([{ ...KILL }]), FRAME_S);
    expect(voices.playKillMarker).toHaveBeenCalledTimes(1);
    expect(voices.playKillMarker).toHaveBeenCalledWith(audio);
    expect(voices.playHitMarker).not.toHaveBeenCalled();
  });

  it("plays one hit tick for the eight pellets of a shotgun blast", async () => {
    const director = await loadDirector();
    const pellets = Array.from({ length: PELLETS }, () => ({ ...HIT }));
    director.update(makeSession(pellets), FRAME_S);
    expect(voices.playHitMarker).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["before", [HIT, KILL]],
    ["after", [KILL, HIT]],
  ] as const)("skips the hit tick when the kill comes %s it in the same update", async (_order, events) => {
    const director = await loadDirector();
    director.update(makeSession(events.map((event) => ({ ...event }))), FRAME_S);
    expect(voices.playKillMarker).toHaveBeenCalledTimes(1);
    expect(voices.playHitMarker).not.toHaveBeenCalled();
  });

  it("plays a hit tick again on a later update", async () => {
    const director = await loadDirector();
    director.update(makeSession([{ ...HIT }]), FRAME_S);
    director.update(makeSession([{ ...HIT }]), FRAME_S);
    expect(voices.playHitMarker).toHaveBeenCalledTimes(2);
  });

  it("keeps the shot sound next to the hit tick", async () => {
    const director = await loadDirector();
    director.update(makeSession([{ kind: "shotFired" }, { ...HIT }]), FRAME_S);
    expect(voices.playShot).toHaveBeenCalledTimes(1);
    expect(voices.playHitMarker).toHaveBeenCalledTimes(1);
  });
});

const SHOT_WEAPONS = ["pistol", "smg", "carbine", "shotgun", "lmg", "rayGun"] as const;
const GAME_ROUND = 4;

describe("createAudioDirector weapon and round audio", () => {
  beforeEach(() => {
    Object.values(voices).forEach((spy) => spy.mockClear());
    ambience.update.mockClear();
    ambience.createAmbience.mockReset();
    ambience.createAmbience.mockReturnValue({ update: ambience.update });
  });

  it.each(SHOT_WEAPONS)("plays the shot of the %s the session holds", async (weaponId) => {
    const director = await loadDirector();
    const session = makeSession([{ kind: "shotFired" }]);
    session.weapon.weaponId = weaponId;
    director.update(session, FRAME_S);
    expect(voices.playShot).toHaveBeenCalledTimes(1);
    expect(voices.playShot).toHaveBeenCalledWith(audio, weaponId);
    expect(totalCalls()).toBe(1);
  });

  it("plays two different shots for two different weapons", async () => {
    const director = await loadDirector();
    const first = makeSession([{ kind: "shotFired" }]);
    const second = makeSession([{ kind: "shotFired" }]);
    second.weapon.weaponId = "shotgun";
    director.update(first, FRAME_S);
    director.update(second, FRAME_S);
    const [firstCall, secondCall] = voices.playShot.mock.calls as Array<[unknown, string]>;
    expect(firstCall?.[1]).not.toBe(secondCall?.[1]);
  });

  it("plays the dry click, and no shot, for a dry fire", async () => {
    const director = await loadDirector();
    director.update(makeSession([{ kind: "dryFired" }]), FRAME_S);
    expect(voices.playDryClick).toHaveBeenCalledTimes(1);
    expect(voices.playDryClick).toHaveBeenCalledWith(audio);
    expect(voices.playShot).not.toHaveBeenCalled();
    expect(totalCalls()).toBe(1);
  });

  it("plays the round end jingle once when the phase switches to intermission", async () => {
    const director = await loadDirector();
    const session = makeSession();
    director.update(session, FRAME_S);
    expect(voices.playRoundEnd).not.toHaveBeenCalled();
    session.rounds.phase = { kind: "intermission" };
    director.update(session, FRAME_S);
    director.update(session, FRAME_S);
    director.update(session, FRAME_S);
    expect(voices.playRoundEnd).toHaveBeenCalledTimes(1);
    expect(voices.playRoundEnd).toHaveBeenCalledWith(audio);
  });

  it("plays the round end jingle again at the next intermission", async () => {
    const director = await loadDirector();
    const session = makeSession();
    director.update(session, FRAME_S);
    session.rounds.phase = { kind: "intermission" };
    director.update(session, FRAME_S);
    session.rounds.phase = { kind: "active" };
    director.update(session, FRAME_S);
    session.rounds.phase = { kind: "intermission" };
    director.update(session, FRAME_S);
    expect(voices.playRoundEnd).toHaveBeenCalledTimes(2);
  });

  it("stays silent while the phase stays active", async () => {
    const director = await loadDirector();
    const session = makeSession();
    for (let frame = 0; frame < 120; frame++) director.update(session, FRAME_S);
    expect(voices.playRoundEnd).not.toHaveBeenCalled();
  });

  it("creates the ambience once and feeds it the round number every update", async () => {
    const director = await loadDirector();
    expect(ambience.createAmbience).toHaveBeenCalledTimes(1);
    expect(ambience.createAmbience).toHaveBeenCalledWith(audio);
    const session = makeSession();
    session.rounds.number = GAME_ROUND;
    director.update(session, FRAME_S);
    session.rounds.number = GAME_ROUND + 1;
    director.update(session, FRAME_S * 2);
    expect(ambience.update).toHaveBeenNthCalledWith(1, GAME_ROUND, FRAME_S);
    expect(ambience.update).toHaveBeenNthCalledWith(2, GAME_ROUND + 1, FRAME_S * 2);
  });
});
