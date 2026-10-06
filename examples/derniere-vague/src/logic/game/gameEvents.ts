import type { ZoneId } from "@/config/mapConfig";
import type { PowerUpKind } from "@/config/powerUpConfig";
import type { WeaponId } from "@/config/weaponConfig";

export type GameEvent =
  | { readonly kind: "shotFired" }
  | { readonly kind: "reloadStarted" }
  | { readonly kind: "reloadDone" }
  | { readonly kind: "knifeSwung" }
  | { readonly kind: "dryFired" }
  | { readonly kind: "targetHit"; readonly targetId: number; readonly damage: number; readonly head: boolean; readonly knife: boolean }
  | { readonly kind: "zombieHit"; readonly id: number; readonly damage: number; readonly head: boolean; readonly knife: boolean }
  | { readonly kind: "zombieKilled"; readonly id: number; readonly headshot: boolean }
  | { readonly kind: "playerHit"; readonly damage: number; readonly x: number; readonly z: number }
  | { readonly kind: "roundStarted"; readonly round: number }
  | { readonly kind: "purchaseDone"; readonly pointId: string; readonly costPoints: number }
  | { readonly kind: "purchaseDenied"; readonly pointId: string }
  | { readonly kind: "doorOpening"; readonly zoneId: ZoneId }
  | { readonly kind: "doorOpened"; readonly zoneId: ZoneId }
  | { readonly kind: "plankTorn"; readonly windowId: string; readonly x: number; readonly z: number }
  | { readonly kind: "plankRepaired"; readonly windowId: string; readonly x: number; readonly z: number }
  | { readonly kind: "boxOpened" }
  | { readonly kind: "boxOffered"; readonly weaponId: WeaponId }
  | { readonly kind: "boxTeddy" }
  | { readonly kind: "boxMoved"; readonly spot: number }
  | { readonly kind: "boxWeaponTaken"; readonly weaponId: WeaponId }
  | { readonly kind: "powerUpDropped"; readonly slot: number; readonly powerUpKind: PowerUpKind; readonly x: number; readonly z: number }
  | { readonly kind: "powerUpTaken"; readonly powerUpKind: PowerUpKind }
  | { readonly kind: "powerUpExpired"; readonly slot: number }
  | { readonly kind: "nukeDetonated" };

export const GAME_EVENTS = {
  shotFired: { kind: "shotFired" },
  reloadStarted: { kind: "reloadStarted" },
  reloadDone: { kind: "reloadDone" },
  knifeSwung: { kind: "knifeSwung" },
  dryFired: { kind: "dryFired" },
} as const satisfies Record<string, GameEvent>;
