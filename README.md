# ShaOn Tech — website (Phase 2)

Editorial / cinematic studio site for ShaOn Tech, built around the approved
**Folded Signal** mark (logo direction A). React + TypeScript + Vite, with a
real-time React Three Fiber scene and a complete SVG/CSS fallback.

## Pages

| Route | What it is |
| --- | --- |
| `/` | Hero → idea-to-product story → Services → Work → Lab → Process → Studio → brief lead-in |
| `/work/product-workspace` | Studio concept: sample SaaS task workspace with search, status and category filters |
| `/work/objects-commerce` | Studio concept: fictional capsule lamp, variants, editable sample cart (sample prices, no checkout) |
| `/work/hospitality-stay` | Studio concept: fictional pavilion availability with validation (sample inventory, no booking) |
| `/start-project` | Three-step project brief with local JSON / UTF-8 text download (nothing is sent) |
| `/privacy` | What the site actually stores and sends (almost nothing) |
| anything else | A useful not-found page |

Routing uses the History API (real URLs, browser back/forward, per-page
titles, focus moved to the new page, scroll restored on back). `pnpm dev` and
`pnpm preview` serve deep links directly; a static host needs an SPA fallback
that serves `index.html` for unknown paths.

## Run it

Requires Node ≥ 20.19 and pnpm 10 (`corepack enable` will pick up the pinned version).

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm typecheck    # strict tsc, app + config
pnpm test         # vitest: geometry, timeline, switches, navigation, routes, Lab params, demo/brief models and exports
pnpm build        # typecheck, then production build to dist/
pnpm preview      # serve dist/ on http://localhost:4173
```

Nothing is fetched from third parties: fonts (Geist / Geist Mono, OFL) are
bundled from npm, the chrome studio lighting is generated procedurally, the
only images are the local concept renders below, and there are no videos,
analytics or external services.

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

## Concept media

Concept renders are referenced from `public/media/` (see `src/content/media.ts`):
`form-lamp-silver-{640,960,1680}.{avif,webp}` (largest file is 1254×1254) and
`still-pavilion-blue-{640,960,1680}.{avif,webp}` (largest 1672×941). They are
**not committed** — the media owner places them in a local preview. Each image is
an AVIF/WebP `<picture>` with real dimensions, `loading="lazy"`,
`decoding="async"` and a reserved aspect ratio; if a file is missing, a
code-native drawing of the same fictional object stays in place, labelled as a
stand-in. No video is referenced.

## Lab defaults

The Lab drives the hero's S directly. "Reset to defaults" restores: light angle
40°, light intensity 1.00×, blue edge glow 0.55×, fold 100%, twist 0°, particle
intensity 30%, flow speed 1.00× (`src/lib/labParams.ts`). Settings live only
in memory. Dragging over the Lab (mouse or touch) optionally steers light and
tilt; `touch-action: pan-y` keeps vertical page scrolling native.

On phones the same Lab viewport (one canvas) becomes a compact sticky preview
under the glass bar, so every adjustment is visible while tuning; it is bounded
by the Lab section and releases before Process. Keyboard focus on a control is
nudged just below the preview. Short landscape phones show preview and controls
side by side.

## Mobile

Phone layouts are art-directed at 375 and 390 px rather than scaled: a
floating liquid-glass nav pill (blur limited to the small bar; denser tint over
paper sections; solid fallback without `backdrop-filter` or with
`prefers-reduced-transparency`), a full-screen folded-panel menu built from the
mark's 21.6° bands over an opaque ink backing (no full-screen blur; the bar
with Close stays fixed and only the links scroll if they must; two columns on
short landscape phones), swipeable Work panels, and touch on
the hero S: finger position steers light and tilt with inertia, taps pulse the
cobalt edge light, and native scroll velocity adds a restrained twist. All
touch listeners are passive — nothing hijacks scrolling.

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
  sections/     Hero, Story (sequence + still version), Wireframe, InterfacePreview,
                Services (+ OfferingGraphic), Work, Lab, Process, Studio, BriefLeadIn, Footer
  pages/        HomePage, CasePage, StartProjectPage, PrivacyPage, NotFoundPage
  router/       routes.ts (pure matching, titles, link classification), Router.tsx
  features/     workspace/, commerce/, stay/, brief/ — each a self-contained
                demo with a pure model and its own tests
  ui/           Header, MobileMenu, CtaLink, MotionToggle, MediaImage,
                ConceptDrawings, BriefPlanes, DebugReadout
  styles/       tokens, base, stage, story, sections, controls, chapters, pages
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

## Known limits

- The brief cannot be sent: contact delivery is not connected. It can be
  downloaded as JSON or UTF-8 text (or copied from the text preview). The page
  reports a download as *requested*, because a browser can block a save
  silently. Answers stay in memory for the visit (moving between pages keeps
  them); no storage API is used, and a reload or closed tab discards them.
- Studio concepts use sample data, sample prices and sample inventory; there is
  no checkout, payment, booking or persistence.
- `@react-three/fiber` 9.8 logs a `THREE.Clock` deprecation warning from inside
  the library; it is harmless.
- Visual QA was done in headless Chromium with software WebGL (SwiftShader)
  and touch emulation at 1440×900, 820×1180, 390×844, 375×667 and short
  landscape (667×375, 844×390, 568×320). Real-device Safari / iOS, real touch
  hardware, screen readers and GPU performance still need checking.
- The concept renders were not available in the build environment, so their
  in-page appearance was verified only through the fallback path and markup.
