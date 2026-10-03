# ShaOn Tech — website (Phase 1)

Editorial / cinematic studio site for ShaOn Tech, built around the approved
**Folded Signal** mark (logo direction A). React + TypeScript + Vite, with a
real-time React Three Fiber scene and a complete SVG/CSS fallback.

> Phase 1 is a review checkpoint: hero, the idea → product scroll story, and
> honest landing sections for every nav destination. Full services, interactive
> studio concepts, the material lab and the project brief are Phase 2.

## Run it

Requires Node ≥ 20.19 and pnpm 10 (`corepack enable` will pick up the pinned version).

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm typecheck    # strict tsc, app + config
pnpm test         # vitest (geometry, timeline, switches, navigation)
pnpm build        # typecheck, then production build to dist/
pnpm preview      # serve dist/ on http://localhost:4173
```

Nothing is fetched at runtime: fonts (Geist / Geist Mono, OFL) are bundled from
npm, the chrome studio lighting is generated procedurally, and there are no
images, videos or third-party services.

## QA switches

Append to the URL; they combine (`?fallback=1&motion=reduce`). They are also
read by an inline boot script in `index.html`, so the first paint already
matches.

| Switch | Effect |
| --- | --- |
| `?fallback=1` (or `?renderer=fallback`, `?webgl=0`) | Force the SVG/CSS fallback instead of WebGL |
| `?renderer=webgl` | Skip the WebGL capability probe and try WebGL anyway |
| `?motion=reduce` (or `?reduced-motion=1`) | Behave exactly as `prefers-reduced-motion: reduce` |
| `?motion=full` | Ignore an OS reduced-motion preference (comparison only) |
| `?debug=1` | Small live readout: renderer (and why), motion state, story progress |

To exercise a **runtime** WebGL failure, open DevTools on a normal load and run:
`document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()`
— the stage switches to the fallback for the rest of the visit.

## Architecture

```
src/
  brand/        markGeometry.ts — the mark as maths (single source of truth)
                FoldedMark.tsx / Logo.tsx — SVG logo (flat + chrome variants)
  content/      site.ts — all visitor-facing copy, typed and editable
  lib/          storyTimeline.ts — scroll → story frame (pure, tested)
                env.ts — QA switches, WebGL probe, quality tiers
                liveState.ts — mutable state shared with WebGL (no React renders)
                stagePose.ts, previewLayout.ts, navigation.ts, math.ts
  hooks/        useStoryDriver (native scroll → live state + CSS vars), observers
  motion/       MotionProvider — reduced motion, pause, renderer mode
  stage/        Stage (lazy WebGL loader, error boundary, crossfade, visibility)
                FallbackStage, SignalLanes — SVG/CSS rendition of the same story
  scene/        three.js only, lazy-loaded chunk:
                ribbonGeometry, ribbonShader, signalParticles,
                studioEnvironment, Experience (choreography), StageCanvas
  sections/     Hero, Story (sequence + still version), Wireframe,
                InterfacePreview, Work, Services, Lab, Studio, StartProject, Footer
  ui/           Header, MobileMenu, CtaLink, MotionToggle, DebugReadout
  styles/       tokens, base, stage, story, sections
```

### The mark

`markGeometry.ts` models the approved logo as the front view of a real object:
two flat ribbons, each wrapped half a turn around a vertical crease cylinder.
Because every band runs at the same 21.6° slope, a ribbon keeps descending as it
wraps, so the band that comes out in front sits lower than the band that went in
behind (drop = slope × π × r). That reproduces the fold offset, rounded fold
corners and curved crease line measured from the board. The lower ribbon is the
upper one rotated 180°.

From that one module:

- the SVG logo and favicon (front projection; the crease is a mask, so the flat
  logo works on any background),
- the WebGL chrome object: each ribbon is an unrolled, chamfered slab whose
  vertices carry developed coordinates; the vertex shader bends it between the
  folded mark (bend π) and a flat beam (bend 0),
- the particles, which use the same GLSL so they start exactly on the surface,
- the Studio section's construction drawing.

### The story

Native scroll only — no wheel/touch hijacking. The sequence is pinned with
`position: sticky`; `useStoryDriver` turns scroll position into a `StoryFrame`
(`lib/storyTimeline.ts`): `unfold → release → structure → wire → product`.
Every visual is a pure function of that frame, so scrolling back plays the same
states in reverse:

1. **Idea** — the chrome S drifts from the hero into the story.
2. **Signal** — the S unfolds into two beams on its own diagonal, burns away
   from the central slit outwards, and each surface point becomes a particle
   streaming along eleven 21.6° lanes.
3. **Structure** — particles land on the interface outline while the SVG
   wireframe draws in over a column grid.
4. **Product** — the real HTML interface fills the wireframe (it uses the mark
   as its own logo). It is labelled as a studio concept.

The wireframe, the HTML interface and the particle targets all come from one
region list (`lib/previewLayout.ts`); the DOM rect of the preview is measured and
mapped into world space so the particles land on the drawn lines.

Anchor links (nav, CTAs, "Skip the sequence") jump instantly when they would
cross the pinned sequence, move focus to the destination and update the URL.
Large progress jumps snap instead of animating through the story.

### Motion, accessibility, performance

- **Reduced motion** is resolved before first paint (boot script + CSS +
  `MotionProvider`). The hero shows one still WebGL frame and the story becomes
  four stacked chapters with still illustrations, including the full interface.
- **Pause / resume** (bottom-right, always visible) stops all autonomous motion:
  idle drift, particle flow, shimmer, CSS loops. Scroll-linked changes still
  follow the visitor's own scrolling. The choice lasts for the session.
- **Fallback**: shown instantly while three.js loads; used permanently if WebGL
  is unavailable, initialisation throws, a shader fails to compile, or the
  context is lost.
- **Mobile menu**: dialog with focus moved in, Tab trapped, Escape closes and
  returns focus to the Menu button, page behind `inert` and scroll-locked.
- **Rendering**: the three.js chunk loads after first paint (idle callback);
  `frameloop` is `never` when the stage is off-screen or the tab is hidden,
  `demand` when paused/reduced, `always` otherwise. DPR is capped per device
  tier and stepped down (then particle count reduced) if frames run slow. All
  per-frame values flow through refs/uniforms and CSS variables — no per-frame
  React state. GPU resources are disposed on unmount.

### Brand assets

`public/favicon.svg` is generated from the mark geometry:

```bash
node --experimental-strip-types scripts/generate-favicon.ts   # Node ≥ 22.6
```

`favicon-32.png` and `apple-touch-icon.png` are rasterised from that SVG.

## Known limits (Phase 1)

- Work, Lab and Start a project are honest placeholders: studio concepts are
  described but not yet interactive, and the brief builder is not built — the
  page says so and sends nothing.
- `@react-three/fiber` 9.8 logs a `THREE.Clock` deprecation warning from inside
  the library; it is harmless.
- Visual QA so far was done in headless Chromium with software WebGL
  (SwiftShader) at 1440×900, 820×1180, 390×844 and 375×667. Real-device Safari /
  iOS and GPU performance still need checking.
