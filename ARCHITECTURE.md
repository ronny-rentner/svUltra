# svUltra Ecosystem Architecture

How the reusable Svelte layer is split, why, and what goes where. This doc exists to
stop the "copy code between apps" cycle by deciding — once — what is a *versioned
dependency* vs. *owned template source*.

## The problem

Relonee (`/home/ronny/Projects/Relonee`) accumulated a lot of reusable frontend
machinery: preprocessors, a router, actions, styled components. New apps "like Relonee"
currently mean copying that machinery and letting copies drift. We want the genuinely
generic parts to live in versioned packages so a `npm update` propagates fixes, while the
parts every app customizes stay owned by each app.

There is a parallel backend story: **djultra** does for the Django backend what svUltra +
companion do for the Svelte frontend. djultra is out of scope here but is the reason the
naming and the "extract generic core" philosophy exist.

## The litmus test

For any piece of code, ask **two** questions:

1. **Build-time or runtime?** Preprocessors and Vite plugins run at build; components,
   actions, and stores run in the browser.
2. **Will I `npm update` it, or fork it per app?** If you'd bump a version and never
   touch it → package it. If app #3 will want it to look/behave differently → it's
   *template source* you own per app, not a dependency.

These two axes produce the layout below.

## The four pieces

```
┌─ build-time ───────────────┐   ┌─ runtime ──────────────────────────────┐
│ svUltra                    │   │ svUltra-kit (companion, NEW)            │
│   the 6 preprocessors      │   │   generic behavior, zero design opinion │
│   Pico-agnostic, no runtime│   │   actions (ripple), router, route-gen   │
│   publishable standalone   │   │   plugin, DOM utils                     │
└────────────────────────────┘   └─────────────────────────────────────────┘
              ▲                                   ▲
              │ both consumed by                  │
              └───────────────┬───────────────────┘
                              │
                  ┌─ owned template source ─────────────────┐
                  │ django-svelte-starter (frontend/)        │
                  │   styled components (Button, Card, …)    │
                  │   Layout, theme bootstrap, app glue      │
                  │   PicoCSS-coupled, forked per app        │
                  └──────────────────────────────────────────┘

   djultra (Django/Python) ── backend counterpart, consumed by the same starter
```

> **Naming note:** `svUltra-kit` is a placeholder for the companion package. It needs a
> real name (parallels: svUltra = Svelte build, djultra = Django). Decision pending.

---

## 1. svUltra — the preprocessors (build-time, versioned)

**Keep svUltra exactly this and nothing more.** Its value is that it's a focused,
unopinionated, publishable Svelte build tool that doesn't care about PicoCSS or any
runtime. The demo's job is to sell *this*.

Contents (already correct today — `index.js` + `src/`):

- `syntaxSugar` — `{if}`, `{each}`, `{const}`, store/bind shorthands, media shortcuts
- `attributeTransformer` — `tooltip`→`data-tooltip`, `ariaLabel`→`aria-label`, …
- `transformComponentStyles` — style component trees with `Card { Button { … } }`
- `classMergePreprocessor` — merge static + `class:` + spread class sources
- `markdownPreprocessor` — `<markdown file="x.md" />` → compiled HTML, HMR-tracked
- `printSourceCode` — debug helper

**Dependency profile:** build-only (`svelte/compiler`, `magic-string`, `postcss`,
`postcss-selector-parser`, `estree-walker`, `marked`). Svelte is a `peerDependency`.
No runtime code ships.

**Why nothing else belongs here:** the moment svUltra ships a `.svelte` component or a
runtime action, consumers installing it for the preprocessors drag runtime/peer surface,
and svUltra's clean identity ("Svelte preprocessors") blurs.

---

## 2. svUltra-kit — generic runtime (runtime, versioned)

Behavior-only code with **no design opinion** — you'd never restyle a ripple or rewrite
route-matching per app, so it's safe to centralize and version. Separate from svUltra
because it's runtime, not build-time (keeps each package's dependency surface honest).

| Item | From | Notes for the move |
|---|---|---|
| `ripple` action | `demo/src/lib/ripple.js` | Pure action. Depends on a `.ripple` CSS contract — ship the companion CSS or document the contract. Drop the inline-style hack / `TODO`. |
| `renderComponentToHTML` + helpers | `demo/src/lib/utils.js` | Generic DOM/snippet utility. |
| Router (logic) | `demo/src/components/Router.svelte` | **Needs decoupling first** — see below. Migrate off `context="module"` to `module` while moving. |
| `generateRoutes` Vite plugin | `demo/src/lib/vite/generateRoutes.js` | Build-time, but it's the *build half of the routing feature*; cohesion says keep it with the Router it feeds. Expose via a `/vite` subpath. |

**Subpath exports** keep the build-time plugin and runtime code from contaminating each
other's import graph:

```jsonc
// svUltra-kit package.json (sketch)
"exports": {
  "./actions":  "./src/actions/index.js",   // ripple, …
  "./router":   "./src/router/Router.svelte",
  "./vite":     "./src/vite/generateRoutes.js",
  "./utils":    "./src/utils.js"
}
```

**Router decoupling (prerequisite):** today `Router.svelte` imports `LoadingOverlay` and
references a `Layout` — both styled/app concerns. To live in a generic package it must
take the loading UI and layout as props/snippets (or emit state and let the app render
them). The route-matching, history, and navigation logic is the generic part worth
keeping; the chrome is not.

**Dependency profile:** `svelte` as `peerDependency`; `chokidar` for the Vite plugin
(could be a `peerDependency` on `vite`). No PicoCSS, no Iconify.

---

## 3. The starter — owned template source (forked per app)

Everything PicoCSS-coupled or design-bearing lives in
`/home/ronny/Projects/django-svelte-starter` as source you copy once and then own:

- **Styled components:** `Button`, `Card`, `Icon`/`IconWithLabel`, `LoadingIndicator`,
  `LoadingOverlay`, `ToggleDarkMode`, `Layout`, `Accordion`, etc.
- **App glue:** `init.js` (theme detection, `window.config`, prototype monkey-patches —
  these mutate globals and are app policy, they must **not** sit in a shared package).
- **The headline `Menu.svelte` pattern:** parent-driven hierarchical theming
  (`ul.menu { &.contrast { UserMenu { --pico-color: … } } }`) is inherently per-app — it
  *uses* svUltra's `transformComponentStyles` but the styling is the app's own.

**Why these are not packaged:** app #3 will want a different Card, a different Layout, a
different brand. Trapping them in a versioned dependency builds a design system you can't
escape — every app then fights the package. They consume svUltra (build) and svUltra-kit
(runtime) but remain owned.

---

## Implications for the demo (next task)

- The demo proves **Bucket 1 (svUltra preprocessors)**. It should *use* a minimal set of
  local styled components as vehicles, not try to also be a component-library showcase.
- It's fine for the demo to depend on svUltra-kit (router, ripple) once that exists; until
  then the demo keeps local copies. The local copies are the extraction candidates.
- Per `demo-checklist.md`, each feature page must show the *payoff* on screen (e.g. the
  `Menu.svelte`-style parent theming for component-styles), not just a rewritten class.

## Open decisions

1. **Name** for the companion package (`svUltra-kit`?).
2. **Router decoupling** shape — props vs. emitted state for loading/layout chrome.
3. Whether the `generateRoutes` plugin and Router ship together (recommended) or split.
4. `ripple` CSS contract — bundle CSS with the package or document the required `.ripple`
   keyframes for the app to provide.
