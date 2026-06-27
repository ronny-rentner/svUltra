# Repository Guidelines

## Start Here
Read `readme.md` before changing anything, and keep it in context while you work — it is the source of truth for both halves of svUltra:

- the **preprocessors** (Component Styles, Class Merge, Attribute Transformer, Syntax Sugar, Markdown, Print), each with a deep-dive under `docs/`;
- the **kit** under `src/kit/` — components, actions, icons, `router`, `stores`, `api` — its public import shapes, the `#kit/*` internal aliases, `pageConfig`, and the localStorage-backed `createLocalStorageStore` state layer.

If you catch yourself grepping the source to answer "does svUltra already have an X?", the answer is almost certainly in `readme.md` (and the `docs/` it links) — read it first. If it genuinely isn't there, that's a docs gap: add it, so the next reader never has to grep.

## Svelte 5
The project targets Svelte 5; some parts still use Svelte 4 features (a runes migration is planned, not urgent).

- Props: `let { title, children } = $props();`
- Children over slots: `{render children()}`; template fragments via snippets: `{snippet name()} … {/snippet}`.
- svUltra dialect: `{if condition}` instead of `{#if condition}` (the Syntax Sugar preprocessor — see `readme.md`).

## Build, Test & Publish
- Install: `npm install`
- Test: `npm test` (Node's built-in `node:test` runner; specs in `test/`)
- Package: `npm pack`
- Publish: `npm publish --access public`

## Code Style
- **Imports** — ES modules; external dependencies first, then internal modules; the logger import comes last.
- **Logging** — use the scoped logger: `const log = createScopedLogger('module-name', 'info')`; levels are trace/debug/info/warn/error.
- **CSS** — avoid classes where possible; a single component's scope is usually small enough to style by element selector, and nested CSS styles its child elements and components (svUltra's component-styles). Add a class only when needed for dynamic state. Reuse Pico variables and existing components (e.g. `Toasts`) before inventing styles.
- **Formatting** — 2-space indentation; component order: script, style, markup. No ESLint/Prettier config.
- **Error handling** — try/catch with logging; preprocessors return the original content on error (file processing logged at debug, failures at error).
