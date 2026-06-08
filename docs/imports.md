# Imports

svUltra uses two import styles, no more. One inside the package, one outside. Per-app customisation happens via Vite alias *overrides*, not via a third import style.

## The two styles

### Style A — relative paths (inside svUltra)
```js
import IconWithLabel from './IconWithLabel.svelte';
import { ripple }    from '../actions/ripple.js';
import defaultIcon   from '../icons/smiley.js';
import LoginForm     from './LoginForm.svelte';     // ships as a default stub
import logo          from '../assets/logo.svg';      // ships as a default asset
```

Every file under `src/` resolves its dependencies by walking the file tree. No aliases, no package self-references. Works in any toolchain — Vite, Rollup, esbuild, plain Node — with zero consumer config.

### Style B — package paths (outside svUltra, importing svUltra)
```js
import { syntaxSugar }      from 'svultra';
import { Button, Card }     from 'svultra/kit/components';
import { ripple }           from 'svultra/kit/actions';
import { smiley, spinner }  from 'svultra/kit/icons';
import { Router, navigate } from 'svultra/kit/router';
```

The demo, the starter, and any third-party consumer import svUltra by its npm name. Resolution goes through `package.json`'s `exports` field. Anything not listed there is unreachable from outside.

## Where each style is allowed

| Location | Imports may use | Imports must NOT use |
|---|---|---|
| Anywhere in `src/` | Style A; node-modules packages (`magic-string`, `@iconify/svelte`, `@zerodevx/svelte-toast`, …) | Style B; `@…` aliases |
| `demo/src/*`, starter, third-party consumer | Style B for svUltra; the consumer's own `@…` aliases for the consumer's own paths; node-modules packages | Style A reaching into `svultra/src/…` |

That's the whole table.

## Per-app customisation: Vite alias overrides

The kit's chrome (Layout, Menu, Footer, etc.) refers to per-app content — a logo, an auth form, a contact form, a stores file — via plain relative imports to **default files svUltra ships**:

```js
// svultra/src/kit/components/Layout.svelte
import logo     from '../assets/logo.svg';            // svultra's default logo
import logoDark from '../assets/logo-dark.svg';
import LoginForm from './LoginForm.svelte';            // svultra's stub LoginForm
import { configStore } from '../stores.js';           // svultra's default stores
```

Out of the box, every consumer gets svUltra's defaults — the kit *just works* with no extra config. Customisation has two granularities — **per-file** for one-off overrides, **per-directory** for taking over a whole bucket — and both use the same plain string alias:

```js
resolve: {
  alias: {
    // Per-file: override one thing, keep every other svUltra default.
    'svultra/kit/components/LoginForm.svelte': path.resolve(__dirname, 'src/LoginForm.svelte'),
    'svultra/kit/stores.js':                   path.resolve(__dirname, 'src/stores.js'),

    // Per-directory: the consumer owns the entire assets folder.
    // Vite string aliases match at path boundaries, so the alias key
    // `svultra/kit/assets` (no trailing slash, no regex) matches both
    // the exact path and any subpath like `svultra/kit/assets/logo.svg`,
    // which then resolves to `<replacement>/logo.svg`.
    'svultra/kit/assets': path.resolve(__dirname, 'src/assets'),
  },
}
```

Vite resolves aliases before hitting the package's `exports` field, so the consumer's file (or whole directory) transparently replaces svUltra's defaults. Nothing inside svUltra changes — the kit still imports `../assets/logo.svg`, but Vite hands it a different file.

**Granularity tradeoff.** Per-file is surgical — the consumer overrides only what they care about and everything else stays on svUltra's defaults. Per-directory is simple — one line for the whole bucket — but the consumer must provide every file the kit chrome imports from that directory (e.g. both `logo.svg` and `logo-dark.svg`); copy the defaults out of `node_modules/svultra/src/kit/assets/` and edit the ones that matter.

**Per-file beats per-directory when both apply.** If both `svultra/kit/components/LoginForm.svelte` and `svultra/kit/components` are aliased, Vite picks the longest matching key. The consumer doesn't have to think about ordering.

## What svUltra ships as defaults

Each file the chrome references has a real default in `src/kit/`:

- **`assets/logo.svg`**, **`assets/logo-dark.svg`** — generic logos (text or simple mark)
- **`components/LoginForm.svelte`** — placeholder that renders "Configure `svultra/kit/components/LoginForm.svelte` to enable sign-in"
- **`components/ContactForm.svelte`** — same shape, contact-flavoured
- **`stores.js`** — exports `configStore` (theme), `personStore` (null until set), `authLoading` (initial state), plus the `createLocalStorageStore` helper used by Relonee

The kit is therefore self-contained from day one. A consumer who never touches their Vite alias config gets svUltra's plain-vanilla shell, with placeholder text where their site-specific UI would slot in.

## Why this is correct

**One mechanism for every per-app concern.** Customising the logo, the LoginForm, the stores, and the Footer all happen the same way: one entry in `vite.config.js`. There's no contract surface to remember ("Layout expects `@assets/logo.svg`, Menu expects `@components/LoginForm.svelte`, Footer expects `@stores`, …"). Every customisation point is just the file path inside svUltra.

**Zero alias config required out of the box.** A consumer can `npm install svultra` and import Layout with no Vite tweaks; the placeholders render and the structure is visible. Customisation is opt-in.

**Same code in svUltra works in every toolchain.** Aliases were a Vite-specific contract. With aliases gone, svUltra's source compiles via plain Node/Rollup/esbuild resolution — useful for testing and for any future non-Vite consumer.

**Forbidden combinations stay forbidden.** A file inside `src/` writing `import { x } from 'svultra/…'` tries to resolve its own package by name; in development there's no `node_modules/svultra` to find. Internal imports are Style A, always. A consumer writing `import x from 'svultra/src/internal/…'` bypasses the `exports` field and couples the consumer to internal layout. External imports are Style B, always.

## Non-Vite consumers

Vite is the only toolchain we test. For other build tools, the alias-override mechanism varies:

- **Rollup**: `@rollup/plugin-alias` with the same exact-file mapping.
- **esbuild standalone**: `alias` option in build config.
- **Webpack**: `resolve.alias` with file-suffixed keys.
- **Node.js native ESM (e.g. SvelteKit SSR)**: `package.json` `"imports"` map for in-package rewrites doesn't help cross-package; use the bundler's alias.

The pattern is the same everywhere: map the kit's internal file path to the consumer's per-app file. Document this per tool as it comes up.

## What's deliberately *not* in this doc

- **No "chrome layer" rules**, no special cases for `Layout`/`Menu`/`Footer`. The chrome is just code inside `src/` that uses Style A like everything else.
- **No `@…` aliases anywhere in svUltra source.** If you see one in `src/`, it's a bug.
- **No `svultra/…` paths anywhere in svUltra source.** Same — Style B is for consumers only.
