# Imports

svUltra resolves imports in two layers: **inside the package**, where kit source imports its own modules, and **from outside**, where a consumer imports svUltra by name. Each layer uses a different mechanism, on purpose.

## Inside the package (`src/kit`)

Kit source never imports svUltra by its package name. It uses two forms:

- **Same directory** — a plain relative path:

  ```js
  import Icon from './IconWithLabel.svelte';
  ```

- **Across directories** — the `#kit/*` subpath alias, declared in `package.json`:

  ```json
  "imports": {
    "#kit/*": "./src/kit/*"
  }
  ```

  ```js
  import { ripple }      from '#kit/actions/ripple.js';
  import { configStore } from '#kit/stores.js';
  import Layout          from '#kit/components/Layout.svelte';
  ```

`#kit/*` replaces `../../` path-walking with a stable root-relative path, so a file's imports don't change when it moves within the tree. The `#` prefix is a Node.js `imports`-map feature and resolves the same under Vite, Rollup, and native Node — no consumer config.

Third-party packages are imported bare: `svelte`, `@iconify/svelte`, `@zerodevx/svelte-toast`, `magic-string`, and so on.

## From outside (consumers)

A consumer imports svUltra by its npm name, `svultra`. Only what `package.json` `exports` lists is reachable — everything else is private:

```js
import { syntaxSugar }  from 'svultra';                              // preprocessors
import { Button, Card } from 'svultra/kit/components';               // barrel
import Layout           from 'svultra/kit/components/Layout.svelte';  // specific file
import { ripple }       from 'svultra/kit/actions';
import { smiley }       from 'svultra/kit/assets/icons';
import { Router }       from 'svultra/kit/router';
import { configStore }  from 'svultra/kit/stores';
```

Public entries come in two shapes — **barrels** (a namespace like `svultra/kit/components`, imported by name) and **specific items** (a file or module like `svultra/kit/components/Layout.svelte`, default-imported). The readme's "Import shapes" covers when to use which, with the full list.

## Overriding a kit module

A consumer can replace any public `svultra/kit/*` module with their own by aliasing that exact specifier in their bundler. The alias resolves before the package's `exports` field, so the kit transparently picks up the consumer's file:

```js
// vite.config.js
resolve: {
  alias: {
    // the consumer's logo replaces svUltra's default
    'svultra/kit/assets/logo.svg': path.resolve(__dirname, 'src/logo.svg'),
  },
},
```

This is the seam for app-specific content — a logo, a stores module, an auth backend. The readme's "Wiring your backend" works through it for `svultra/kit/api`. For non-Vite toolchains, use that bundler's equivalent alias option.
