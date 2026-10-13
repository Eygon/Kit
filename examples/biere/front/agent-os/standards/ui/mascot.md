---
name: mascot
description: When and how to show the Mousse mascot — the Mascot element only (src/components/elements/mascot), one per screen, mood by context (searching, captured, confused, loaded), CSS stand-ins until the real variants are drawn, decorative (aria-hidden) next to a message or a t() alt otherwise, motion-safe animations, never deformed, recoloured, cropped or imported as a raw image
metadata:
  type: project
  checks:
    - re: "assets/mascot/"
      files: "^src/.*\\.(tsx|ts|css)$"
      skip: "(__tests__/|components/elements/mascot/)"
      msg: "image de la mascotte importee hors du composant Mascot (utiliser <Mascot mood=... />)"
    - re: "\\b(?:hue-rotate|grayscale|sepia|invert|saturate|brightness|contrast|mix-blend|object-fill|object-cover|scale-x|scale-y|skew)-?"
      files: "^src/components/elements/mascot/.*\\.(tsx|ts)$"
      skip: "(__tests__/|\\.(test|spec)\\.)"
      msg: "mascotte deformee ou recoloree"
    - re: "<Mascot\\b[^>]*\\b(?:className|style)="
      files: "^src/.*\\.tsx$"
      skip: "(__tests__/|\\.(test|spec)\\.)"
      msg: "Mascot ne se restyle pas : mood, size et isDecorative seulement"
---

# Mascot

Mousse — a hop cone wearing a beer-foam hat, with a backpack, a notebook and a magnifying
glass — is the app's sticker. It appears where the app talks to the user about *their*
progress: nothing found yet, a beer captured, something unknown, a level reached. Its look
is part of the art direction (`ui/design-system`).

## The only entry point: `Mascot`

```tsx
import { Mascot } from "@/components/elements/mascot/mascot";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";
import { MascotSizeEnum } from "@/types/enums/mascot/mascotSizeEnum";

<Mascot mood={MascotMoodEnum.CAPTURED} size={MascotSizeEnum.LG} />
```

| Prop | Values | Default |
|---|---|---|
| `mood` | `MascotMoodEnum.SEARCHING` `CAPTURED` `CONFUSED` `LOADED` | `SEARCHING` |
| `size` | `MascotSizeEnum.SM` (6rem) `MD` (9rem) `LG` (12rem) — always a square | `MD` |
| `isDecorative` | `true` when visible text next to it already says the message | `false` |

- The illustration is `src/assets/mascot/mascot.png` (512px, transparent background, cut out
  of the paper of the original) with `mascot-256.png` in its `srcSet`;
  `mascot-original.jpg` is the untouched source, kept for re-exports and never imported.
- Never import the PNG anywhere else, never use it as a CSS `background-image`, an icon, a
  favicon or an `Avatar` — the check above flags the import.
- An empty result is `EmptyStatePanel` (`src/components/elements/emptyStatePanel`), which
  already renders a decorative `Mascot` at `LG` above the title and description:

```tsx
import { EmptyStatePanel } from "@/components/elements/emptyStatePanel/emptyStatePanel";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";

<EmptyStatePanel
  mood={MascotMoodEnum.SEARCHING}
  title={t("pages.encyclopedia.emptyTitle")}
  description={t("pages.encyclopedia.emptyDescription")}
/>
```

## Which mood, when

| Context | Mood | Stand-in shown today (CSS around the single drawing) |
|---|---|---|
| Empty Pokédex / journal / map, search with no result | `SEARCHING` | a cream "?" bubble that floats by the magnifying glass |
| Beer captured / unlocked, tasting saved | `CAPTURED` | amber sparkles that twinkle, drawing tilted 6° |
| Error, unknown beer, scan not recognised | `CONFUSED` | hop grains falling from the head, drawing tilted 3° |
| Stats, level, profile | `LOADED` | amber, green and brown badges pinned on the backpack |

- The moods are named after the **situation**, not after the decoration: when the real
  variants are drawn (a magnifier pose, a toast, a head scratch, a fuller backpack), only
  the inside of `Mascot` changes — one image per mood replaces `MascotMoodStandIn`.
  Callers keep passing the same `mood`. Do not add a mood for a decoration ("sparkles");
  add one for a new situation, with its alt text in `MASCOT_MOOD_ALT_KEYS`.
- One mascot per screen, at most. Not in lists, cards, the tab bar, page headers, toasts or
  buttons, and never as a filler on a screen that already has content.
- The stand-in pieces are flat palette tokens with ink borders (`ui/design-system`): amber
  only for the capture sparkles and the stats badges.

## Accessibility

- Next to a message (an empty state, a success card): `isDecorative` — the wrapper is
  `aria-hidden="true"` and the image `alt=""`. `EmptyStatePanel` does it.
- Alone, carrying meaning (a celebration screen): leave `isDecorative` off — the image is
  announced with the mood's alt text, from `t(MASCOT_MOOD_ALT_KEYS[mood])`
  (`mascot.alt.*` in `fr.json` / `en.json`).
- Stand-in pieces are always `aria-hidden` and empty (the "?" is CSS `content`).
- Animations run under `motion-safe:` only; with reduced motion the pieces stay still and
  visible (the falling grains are shown at rest).

## Never deform or recolour

- No `className` or `style` on `Mascot` (it does not accept them) and no wrapper that
  stretches it: the box is a square from `MascotSizeEnum`, the image is `object-contain`
  with its intrinsic 512x512 ratio.
- No filter (`grayscale`, `hue-rotate`, `sepia`, `invert`, `brightness`, `opacity`),
  no `mix-blend-*`, no recolour to match a section, no crop, no flip, no rotation other
  than the mood's own tilt, no outline or shadow around the drawing (it already has its
  ink line).
- A new size or mood is a change to `MascotSizeEnum` / `MascotMoodEnum` and their tests,
  not a one-off override.
