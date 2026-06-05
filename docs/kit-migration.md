# svUltra `src/kit/` migration

## Context

svUltra ships only the build-time preprocessors today. The demo carries `Button`, `Card`, `IconWithLabel`, `LoadingIndicator` and a `ripple` action in `demo/src/components/` and `demo/src/lib/` — copied from Relonee. The plan is to spin up three sites from `django-svelte-starter`; those components will be copy-pasted into every site unless they live in a published package. Maintaining a second npm package (`svUltra-kit`) is unwanted overhead for a side project.

Solution: keep **one published package**, add a `src/kit/` subtree alongside the existing `src/preprocessors/`, expose it via subpath exports. svUltra is no longer pure preprocessors — that tradeoff is explicitly accepted in exchange for one-package management.

## Concept — three rules

**1. Inside `svUltra/src/`, every import is relative.** No aliases, no package paths. Source must work without any consumer-side bundler config.

**2. The demo installs svUltra as a workspace dependency.** Demo imports use the real package name (`svUltra/kit/components`), identical to what an external consumer writes. The previous `@svUltra` Vite alias goes away.

**3. The `package.json` `exports` field is the entire public API.** Five barrel entries, no wildcards, no deep paths.

```json
"exports": {
  ".":                "./index.js",
  "./snippet":        "./src/snippet.svelte.js",
  "./kit/actions":    "./src/kit/actions/index.js",
  "./kit/components": "./src/kit/components/index.js",
  "./kit/icons":      "./src/kit/icons/index.js"
}
```

`?raw` and `?preprocessed` imports in the demo (Attribute Transformer / Component Styles source-viewer panels) use **relative paths** to the moved kit files (e.g. `'../../src/kit/components/Button.svelte?raw'`), not package paths. They're a demo-only UI concern, not part of the consumer-facing API — they don't earn a place in `exports`.

```json
"peerDependencies": {
  "svelte": "*",
  "@iconify/svelte": "*"
},
"peerDependenciesMeta": {
  "@iconify/svelte": { "optional": true }
},
"workspaces": ["demo"]
```

No `@iconify-icons/*` dependency. svUltra in-sources the two icons its own components need as defaults.

## Target shape

```
svUltra/
  index.js                      ← unchanged, preprocessor barrel
  package.json                  ← exports + peers + workspaces (see above)
  src/
    preprocessors/              ← unchanged
    kit/
      actions/
        ripple.js               ← moved from demo/src/lib/
        index.js                ← export { ripple } from './ripple.js'
      components/
        Button.svelte           ← moved from demo
        Card.svelte             ← moved from demo
        IconWithLabel.svelte    ← moved from demo, default icon swapped
        LoadingIndicator.svelte ← moved from demo, default icon swapped
        index.js                ← Button, Card, IconWithLabel, Icon (alias), LoadingIndicator
      icons/
        smiley.js               ← Iconify icon data, default export
        spinner.js              ← Iconify icon data, default export
        index.js                ← export { smiley, spinner }
  demo/
    package.json                ← adds "svUltra": "*" under dependencies
    vite.config.js              ← drops @svUltra alias; @components stays for demo-only
    src/
      components/               ← only demo-only files (see §2 DELETE list)
      lib/                      ← deleted (only held ripple.js)
```

## §1 — In-source icons

Two icon-data files vendored into `src/kit/icons/`:

- `smiley.js` — copied verbatim from `node_modules/@iconify-icons/ph/smiley-duotone.js`. Used as the default for `IconWithLabel`.
- `spinner.js` — copied verbatim from `node_modules/@iconify-icons/ph/arrow-clockwise-duotone.js`. Used as the default for `LoadingIndicator`.

Each file is the standard Iconify format:
```js
const data = { body: '<g>…</g>', width: 256, height: 256 };
export default data;
```

`src/kit/icons/index.js`:
```js
export { default as smiley }  from './smiley.js';
export { default as spinner } from './spinner.js';
```

## §2 — File operations

### ADD
- `src/kit/actions/ripple.js` — content from `demo/src/lib/ripple.js`, unchanged.
- `src/kit/actions/index.js` — `export { ripple } from './ripple.js';`
- `src/kit/components/index.js`:
  ```js
  export { default as Button }           from './Button.svelte';
  export { default as Card }             from './Card.svelte';
  export { default as IconWithLabel }    from './IconWithLabel.svelte';
  export { default as Icon }             from './IconWithLabel.svelte';
  export { default as LoadingIndicator } from './LoadingIndicator.svelte';
  ```
- `src/kit/icons/smiley.js`, `spinner.js`, `index.js` — per §1.

### MOVE (with relative-path edits)
- `demo/src/components/Button.svelte` → `src/kit/components/Button.svelte`
  - `from '@lib/ripple.js'` → `from '../actions/ripple.js'`
  - `from '@components/IconWithLabel.svelte'` → `from './IconWithLabel.svelte'`
- `demo/src/components/Card.svelte` → `src/kit/components/Card.svelte`
  - `from '@components/LoadingIndicator.svelte'` → `from './LoadingIndicator.svelte'`
- `demo/src/components/IconWithLabel.svelte` → `src/kit/components/IconWithLabel.svelte`
  - `from '@icons/ph/smiley-duotone'` → `from '../icons/smiley.js'`
- `demo/src/components/LoadingIndicator.svelte` → `src/kit/components/LoadingIndicator.svelte`
  - `from '@components'` (`Icon`) → `from './IconWithLabel.svelte'` (default import, named `Icon`)
  - `from '@icons/ph/arrow-clockwise-duotone'` → `from '../icons/spinner.js'`
- `demo/src/lib/ripple.js` → `src/kit/actions/ripple.js` (listed in ADD above).

### MODIFY (path updates)
- `package.json` — new `exports`, `peerDependencies`, `peerDependenciesMeta`, `workspaces` per the concept.
- `demo/package.json` — add `"svUltra": "*"` to `dependencies`.
- `demo/vite.config.js` — drop the `@svUltra` alias entry. Keep `@components`, `@icons`, others.
- `demo/src/components/index.js` — slim to demo-only:
  ```js
  export { default as CodeComparison }    from './CodeComparison.svelte';
  export { default as CodeComparison2 }   from './CodeComparison2.svelte';
  export { default as CodeExample }       from './CodeExample.svelte';
  export { default as CodeSource }        from './CodeExample.svelte';
  export { default as ReleasePanel }      from './ReleasePanel.svelte';
  export { default as ReleasePanelPlain } from './ReleasePanelPlain.svelte';
  export { default as ToggleDarkMode }    from './ToggleDarkMode.svelte';
  ```
- `demo/src/components/ToggleDarkMode.svelte` — `Button`, `Icon` imports → `from 'svUltra/kit/components'`.
- `demo/src/components/ReleasePanel.svelte` — `Button`, `Card`, `IconWithLabel` → `from 'svUltra/kit/components'`.
- `demo/src/components/ReleasePanelPlain.svelte` — same.
- `demo/src/components/CodeComparison2.svelte` — split: `{ Button, IconWithLabel }` from `'svUltra/kit/components'`; `{ CodeSource }` from `'@components'`.
- `demo/src/components/CodeExample.svelte` — if it imports `Button`/`Card`, retarget to `'svUltra/kit/components'`.
- `demo/src/App.svelte` — `Button`, `Card` → `'svUltra/kit/components'`; `ReleasePanel`, `ToggleDarkMode`, `CodeComparison2`, `CodeExample` stay on `'@components'`. The `?raw` and `?preprocessed` paths for `Button.svelte`, `Card.svelte`, `IconWithLabel.svelte` use relative paths (e.g. `'../../src/kit/components/Button.svelte?raw'`) — not package paths.
- `demo/src/examples/SyntaxSugarDemo.svelte` — `{ Button, Card }` → `'svUltra/kit/components'`.
- `demo/src/examples/ClassMergeDemo.svelte` — `{ Button }` → `'svUltra/kit/components'`.
- `readme.md` — add a short "Using the kit" section (see §4).

### DELETE
- `demo/src/components/Button.svelte`
- `demo/src/components/Card.svelte`
- `demo/src/components/IconWithLabel.svelte`
- `demo/src/components/LoadingIndicator.svelte`
- `demo/src/lib/ripple.js`
- `demo/src/lib/` (empty after the ripple removal)

## §3 — Workspace wiring

The svUltra root `package.json` declares `"workspaces": ["demo"]`. The demo's `package.json` declares `"svUltra": "*"` in `dependencies`. After `npm install` at the root, `demo/node_modules/svUltra` is a symlink to the root — Vite/Rollup resolve `from 'svUltra/kit/components'` to `src/kit/components/index.js` via the `exports` field, identical to how an external consumer would.

No `@svUltra` alias in `demo/vite.config.js`. Runtime imports in the demo all use the real package path.

## §4 — README addition

After the existing preprocessor docs:

````markdown
## Using the kit

svUltra ships a small set of Svelte 5 components, an action, and the icons
they use under `svUltra/kit/*`:

```js
import { Button, Card, IconWithLabel } from 'svUltra/kit/components';
import { ripple }                       from 'svUltra/kit/actions';
import { smiley, spinner }              from 'svUltra/kit/icons';
```

Kit components use svUltra's component-styles syntax internally
(`<style> Button { ... } </style>`), so your `svelte.config.js` must include
at least `transformComponentStyles`:

```js
import { transformComponentStyles } from 'svUltra';

export default {
  preprocess: [ transformComponentStyles() ],
};
```

`@iconify/svelte` is an optional peer — install it if you use any of
`Button`, `IconWithLabel`, `LoadingIndicator`. The two icons exported from
`svUltra/kit/icons` are vendored; no `@iconify-icons/*` install needed for
defaults. Pass your own Iconify icons via the `icon` prop.
````

## §5 — Verification

```bash
# 1. Workspace symlink created
ls -la /home/ronny/Projects/js/svUltra/demo/node_modules/svUltra
# expect: symlink → ../../..

# 2. Subpath resolution via the package name
node -e "console.log(require.resolve('svUltra/kit/components', { paths: ['/home/ronny/Projects/js/svUltra/demo'] }))"
# expect: /home/ronny/Projects/js/svUltra/src/kit/components/index.js

# 3. No stale references to old paths
grep -rn "@lib/ripple\|@svUltra\|@components/Button\.svelte\|@components/Card\.svelte\|@components/IconWithLabel\.svelte\|@components/LoadingIndicator\.svelte" /home/ronny/Projects/js/svUltra/demo
grep -rn "@icons/\|@components" /home/ronny/Projects/js/svUltra/src/kit
# expect: zero hits in both

# 4. Demo build
cd /home/ronny/Projects/js/svUltra && npm install && npm run build
# Look for no "Failed to resolve import" warnings, no Svelte errors,
# bundle size roughly unchanged.

# 5. Manual smoke check
cd /home/ronny/Projects/js/svUltra && npm run preview
# Component Styles section renders; Class Merge demo renders; ripple fires
# on Button click; ToggleDarkMode toggles. The bare-Button next to
# ReleasePanel still shows the scope difference.

# 6. Preprocessor tests still pass (untouched)
cd /home/ronny/Projects/js/svUltra && npm test
```

## §6 — Open risks

1. **`exports` field locks the public surface.** After the change, anything trying to reach inside (e.g. `svUltra/src/logger.js`) fails. The demo's `?raw`/`?preprocessed` paths sidestep this by using relative paths. Grep `test/` and `docs/` for any cross-boundary imports before merging.

2. **`?preprocessed` plugin through the package resolver.** The `preprocessedPlugin` in `demo/vite.config.js` calls `this.resolve(base, importer)` and feeds the resolved path back through the preprocessor chain. With `svUltra` resolved as a real node module (workspace symlink), the resolved id is the real source path — the plugin doesn't care. Verify by opening the Attribute Transformer section of the built demo (it consumes `Button.svelte?preprocessed`).

3. **`demo-checklist.md` and `ARCHITECTURE.md`** still describe the old layout. Out of scope for this PR; note as a follow-up.

## Implementation order (one PR)

1. Create `src/kit/{actions,components,icons}/` with their `index.js` barrels.
2. Vendor `src/kit/icons/smiley.js` + `spinner.js`.
3. Copy `demo/src/lib/ripple.js` → `src/kit/actions/ripple.js`.
4. Move + edit the four kit components into `src/kit/components/`.
5. Update root `package.json` — `exports`, `peerDependencies`, `peerDependenciesMeta`, `workspaces`.
6. Update `demo/package.json` — add `"svUltra": "*"`.
7. Update `demo/vite.config.js` — drop `@svUltra` alias.
8. Rewrite demo imports per §2 MODIFY.
9. Slim `demo/src/components/index.js`.
10. Delete the old files per §2 DELETE.
11. `npm install` at root, then run §5 verification.
12. Add README "Using the kit" section.
