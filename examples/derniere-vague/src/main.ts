import { createAudioDirector } from "@/audio/audioDirector";
import { createAudioEngine } from "@/audio/audioEngine";
import { GAME_CONFIG } from "@/config/gameConfig";
import { AIM_ASSIST_CONE_RAD, COARSE_POINTER_QUERY } from "@/config/weaponConfig";
import { createKeyboardMouse } from "@/engine/input/keyboardMouse";
import { createTouchButtons } from "@/engine/input/touchButtons";
import { startGameLoop } from "@/engine/gameLoop";
import { installQaHook } from "@/engine/qaHook";
import { createTouchControls } from "@/engine/input/touchControls";
import { createGameSession, stepGameSession } from "@/logic/game/gameSession";
import { clearLatches, createInputState } from "@/logic/input/inputState";
import { createBloodDecals } from "@/render/effects/bloodDecals";
import { createBloodParticles } from "@/render/effects/bloodParticles";
import { createDustParticles } from "@/render/effects/dustParticles";
import { createBarricadeView } from "@/render/map/barricadeView";
import { createBoxView } from "@/render/map/boxView";
import { buildStation } from "@/render/map/buildStation";
import { createDoorView } from "@/render/map/doorView";
import { createWallBuyView } from "@/render/map/wallBuyView";
import { createPowerUpView } from "@/render/powerUps/powerUpView";
import { createAdaptiveQuality } from "@/render/adaptiveQuality";
import { createCameraShake } from "@/render/cameraShake";
import { createRenderer } from "@/render/createRenderer";
import { createZombieParts } from "@/render/models/zombieModel";
import { createZombieView } from "@/render/zombies/zombieView";
import { createViewModel } from "@/render/weapon/viewModel";
import { createCrosshair } from "@/ui/crosshair";
import { createDamageIndicator } from "@/ui/damageIndicator";
import { createDebugOverlay } from "@/ui/debugOverlay";
import { createHud } from "@/ui/hud";
import { createMenus } from "@/ui/menus";
import { TEXTS } from "@/ui/texts";

const host = document.getElementById("app");
if (!host) throw new Error("#app missing");
const { renderer, scene, camera } = createRenderer(host);
let session = createGameSession(Date.now());
const station = buildStation(scene, camera, session.layout);
createWallBuyView(scene);
const doorView = createDoorView(scene, session.layout);
const barricadeView = createBarricadeView(scene, session.layout);
const boxView = createBoxView(scene);
const powerUpView = createPowerUpView(scene);
const dust = createDustParticles(scene);
const bloodDecals = createBloodDecals(scene, session.layout);
const bloodParticles = createBloodParticles(scene);
const cameraShake = createCameraShake();
const adaptiveQuality = createAdaptiveQuality(renderer, bloodParticles);
const frameStats = { fps: 0, drawCalls: 0, triangles: 0 };
const input = createInputState();
const audio = createAudioEngine();
const audioDirector = createAudioDirector(audio);
Object.assign(host.dataset, TEXTS.buttonLabels);
const hud = createHud(host);
const crosshair = createCrosshair(host);
const damageIndicator = createDamageIndicator(host);
const debugOverlay = createDebugOverlay(host, window.location.search);
const isTouchDevice = typeof window.matchMedia === "function" && window.matchMedia(COARSE_POINTER_QUERY).matches;
const assistRad = isTouchDevice ? AIM_ASSIST_CONE_RAD : 0;
createTouchControls(host, input);
const touchButtons = createTouchButtons(host, input);
createKeyboardMouse(renderer.domElement, input);
const menus = createMenus(host, {
  onStart: () => {
    audio.unlock();
    session = createGameSession(Date.now());
  },
});
const viewModel = createViewModel(camera);
const zombieView = createZombieView(scene, createZombieParts(), bloodParticles);
camera.rotation.order = "YXZ";
installQaHook(window, () => ({
  fps: frameStats.fps,
  drawCalls: frameStats.drawCalls,
  triangles: frameStats.triangles,
  phase: session.phase.kind,
  round: session.rounds.number,
  alive: session.horde.zombies.filter((zombie) => zombie.alive && zombie.state !== "dying").length,
}));
let interactVisible = false;

const syncCamera = (): void => {
  camera.position.set(session.player.x, GAME_CONFIG.PLAYER_EYE_HEIGHT_M, session.player.z);
  camera.rotation.set(session.player.pitch, session.player.yaw, 0);
};

syncCamera();
startGameLoop({
  update: (stepS) => {
    if (menus.isPaused()) clearLatches(input);
    else stepGameSession(session, input, stepS, assistRad);
    input.look.dx = 0;
    input.look.dy = 0;
  },
  render: (alpha, frameS) => {
    syncCamera();
    cameraShake.trigger(session.events);
    cameraShake.apply(camera, frameS);
    audio.setListener(camera.position.x, camera.position.y, camera.position.z, session.player.yaw);
    if (!menus.isPaused()) audioDirector.update(session, frameS);
    station.update(frameS);
    doorView.update(session.doors);
    barricadeView.update(session.barricades);
    boxView.update(session.box, frameS);
    powerUpView.update(session.powerUps, frameS);
    zombieView.update(session.horde, session.events, alpha, frameS);
    dust.update(camera.position, frameS);
    bloodParticles.update(frameS);
    bloodDecals.update(session.events, session.horde);
    viewModel.update(frameS, session.player, session.weapon, session.events, input);
    menus.update(session);
    hud.update(session, frameS);
    crosshair.update(session, input, frameS);
    damageIndicator.update(session, frameS);
    const promptShown = session.interactions.prompt !== null;
    if (promptShown !== interactVisible) {
      interactVisible = promptShown;
      touchButtons.setInteractVisible(promptShown);
    }
    renderer.render(scene, camera);
    frameStats.fps = frameS > 0 ? 1 / frameS : 0;
    frameStats.drawCalls = renderer.info.render.calls;
    frameStats.triangles = renderer.info.render.triangles;
    adaptiveQuality.update(frameS);
    debugOverlay?.update(frameStats.fps, frameStats.drawCalls);
    session.events.length = 0;
  },
});
