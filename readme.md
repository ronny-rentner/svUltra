# svUltra

A collection of Svelte 5 preprocessors for building hierarchical component trees with consistent styling. Works best with class-less CSS frameworks like PicoCSS.

**Status: Alpha (0.0.1-alpha) - Early development**

## Project Goals

- Create a collection of Svelte preprocessors for building hierarchical component trees with consistent styling
- Enable efficient use with class-less CSS frameworks like PicoCSS
- Simplify component development through syntax sugar and attribute transformations
- Provide seamless component styling and class management
- Unify the treatment of HTML elements and Svelte components

The core philosophy is treating Svelte components like HTML elements - using the same syntax conveniences, styling patterns, and attribute handling that you would naturally use with HTML.

## Preprocessors

svUltra includes the following preprocessors:

### 1. Component Styles

Style both your own and third-party components directly in your CSS, enabling hierarchical styling:

```svelte
<script>
  import ThirdPartyButton from 'some-library';
  import MyComponent from './MyComponent.svelte';
</script>

<style>
  /* Style any component that passes down the class attribute */
  ThirdPartyButton {
    margin-bottom: 1rem;
    color: var(--primary);
  }
  
  /* Works with your own components in component hierarchies */
  MyComponent {
    padding: 1rem;
    background: var(--surface-2);
  }
</style>

<!-- Components inherit styles as if they were HTML elements -->
<ThirdPartyButton>Click me</ThirdPartyButton>
<MyComponent>Content here</MyComponent>
```

Works with third-party components that pass down the `class` attribute (like Iconify's `Icon` or `Dropzone` from svelte-file-dropzone). For your own components, implement them with `{...rest}` to enable full hierarchical styling and attribute inheritance:

```svelte
<!-- Inside your component implementation (MyComponent.svelte) -->
<script>
  // Capture and pass down all remaining attributes  
  let { someSpecificProp, ...rest } = $props();
</script>

<div {...rest}>
  <!-- Component content -->
</div>
```

→ [Component Styles Documentation](./docs/component-styles.md)

### 2. Class Merge

Automatically merge class attributes from multiple sources:

```svelte
<Button class:primary={isPrimary} class="large" {...props} />
```

→ [Class Merge Documentation](./docs/class-merge.md)

### 3. Attribute Transformer

Transform attributes to different formats:

```svelte
<div tooltip="Help text" placement="top">Hover me</div>
<!-- Becomes -->
<div data-tooltip="Help text" data-placement="top">Hover me</div>
```

→ [Attribute Transformer Documentation](./docs/attribute-transformer.md)

### 4. Syntax Sugar

Simplifies Svelte template syntax with concise shorthand patterns, and
compiles Svelte 4 `slot="…"`/`let:` markup to Svelte 5 snippets:

```svelte
<!-- Simplified syntax -->
{if condition}
  <Component {$store}>
    <h2 slot="header">Title</h2>
  </Component>
{else}
  <div tooltip="Help text">Other content</div>
{/if}
```

→ [Syntax Sugar Documentation](./docs/syntax-sugar.md)

### 5. Markdown Preprocessor

Import markdown content directly:

```svelte
<script>
  import content from './content.md';
</script>

<div>{content}</div>
```

→ [Markdown Documentation](./docs/markdown.md)

### 6. Print Source Code

Debugging tool to print transformed component code:

→ [Print Source Code Documentation](./docs/print.md)

## Installation

```bash
npm install svUltra
```

## Basic Usage

In your `svelte.config.js` file:

```javascript
import { 
  syntaxSugar,
  transformComponentStyles,
  classMergePreprocessor,
  attributeTransformer,
  markdownPreprocessor
} from 'svUltra';

const replacements = [
  // Syntax replacements (see docs)
  ['{if ', '{#if '],
  ['{else}', '{:else}'],
  // ...more replacements
];

export default {
  preprocess: [
    // Order matters!
    syntaxSugar(replacements),
    attributeTransformer({
      attributes: [
        ['tooltip', 'data-tooltip'],
        ['placement', 'data-placement'],
      ]
    }),
    transformComponentStyles(),
    classMergePreprocessor(),
    markdownPreprocessor({ path: './src/markdown' })
  ],
  // rest of your config
};
```

## Example Component

Here's an example component using svUltra features:

```svelte
<script>
  import Icon from '@iconify/svelte';
  import defaultIcon from '@icons/ph/smiley-duotone';

  let { icon = defaultIcon, iconSize = '1.25rem', width, height, size,
        label, tooltip, placement, children, ...rest } = $props();

  if (children) {
    label = children;
  }

  if (size) {
    iconSize = size;
  }
  if (!width) {
    width = iconSize;
  }
  if (!height) {
    height = iconSize;
  }
</script>

<style>
  span.wrapper {
    display: inline-flex;
    align-items: center;

    Icon {
      margin-right: 0.25rem;
      flex-shrink: 0;
    }

    > span {
      align-self: baseline;
    }
  }
</style>

{if label}
  {if icon}
    <span class="wrapper">
      <Icon {icon} {width} {height} class="margin" {...rest} />
      <span {tooltip} {placement}>{render label()}</span>
    </span>
  {else}
    {render label()}
  {/if}
{else}
  <Icon {icon} {width} {height} {...rest} {tooltip} {placement} />
{/if}
```

## Using the kit

svUltra ships a small set of Svelte 5 components, an action, and the icons
they use under `svultra/kit/*`:

```js
import { Button, Card, IconWithLabel } from 'svultra/kit/components';
import { ripple }                       from 'svultra/kit/actions';
import { smiley, spinner }              from 'svultra/kit/assets/icons';
```

Kit components are written in the svUltra dialect (`{if}` shorthand,
`tooltip` attributes, `<style> Button { ... } </style>`, `let:` snippet
sugar), so your `svelte.config.js` needs the full preprocessor chain in its
required order. The `svultraPreprocess` preset sets it up in one line:

```js
import { svultraPreprocess } from 'svultra';

export default {
  preprocess: svultraPreprocess(),
};
```

It accepts `replacements` and `ignoreTags` (passed to `syntaxSugar`),
`attributes` (extra `attributeTransformer` pairs), and `markdown`
(`markdownPreprocessor` options; the preprocessor is only added when set).
The preprocessors skip `node_modules` except the installed `svultra`
package itself, so the kit components compile in your app like your own
sources do.

`@iconify/svelte` is an optional peer — install it if you use any of
`Button`, `IconWithLabel`, or `LoadingIndicator`. The icons exported
from `svultra/kit/assets/icons` are vendored; no `@iconify-icons/*` install
is needed for the defaults. Pass your own Iconify icons via the `icon` prop.

## Badges (`Badge`, `Badges`)

`Badge` displays its children as a colored label. Its `color` prop defaults to `red`.
`Badges` arranges its children in a flex row.

```svelte
<script>
  import { Badge, Badges } from 'svultra/kit/components';
</script>

<Badges>
  <Badge color="blue">Finance</Badge>
  <Badge color="green">Leadership</Badge>
</Badges>
```

`Badges` uses half of Pico's `--pico-spacing` for its bottom margin and flex `gap`.

## Loading content (`Loader`)

`Loader` retains the current view while its replacement loads. It takes a `next`
view object and renders it through the `children(loaded)` snippet. The view's optional
`load()` function imports a Svelte module; its default export becomes `loaded.loadedComponent`.

The view's optional `onload()` callback runs when Loader accepts that view, including
views without `load()`. It runs before the DOM update and is skipped for superseded loads.

By default (`translucent={false}`), the current content fades out over 400 ms, revealing
the page background. With `translucent={true}`, it stays visible beneath a translucent overlay.
Both modes retain the old content and its layout height until the replacement is ready.

On subsequent loads, the overlay appears after a 400 ms wait; faster loads show no overlay.
In translucent mode, the backdrop and loading text then fade in together over 400 ms.
The backdrop uses Pico's `--pico-modal-overlay-background-color` and
`--pico-modal-overlay-backdrop-filter`; site component styles can override these variables on Loader.
The overlay covers the viewport and centers its text on screen, including on long, scrolled pages.
`window.config.loadingDelay` adds the same test delay in milliseconds as Router.

## Accordions (`accordion`)

`use:accordion` animates a `<details>` panel. The element immediately after its
`<summary>` holds the answer. Opening an ordinary accordion leaves focus where it is;
Tab and Shift+Tab follow the page's normal order.

`use:accordion={{ trapFocus: true }}` opts into trapping focus inside the open panel,
as used by the user menu. Closing or removing the panel releases the trap.

The action adds `.accordion`; its `accordion.css` handles clipping, summary spacing
and the closing arrow. General Pico colour and focus fixes live in the application's
always-loaded `app.css`, as in [the demo](demo/src/styles/app.css).

## Hero banner (`HeroBanner`)

A full-viewport picture with the page's headline on top, for a home page. The page
supplies the words, the component the picture and a scroll hint pointing at the section
below.

```svelte
<script>
  import { HeroBanner, Main } from 'svultra/kit/components';
  import picture from '@assets/hero.webp';
</script>

<Main>
  <HeroBanner image={picture} scrollTo="#features">
    {#snippet headline()}Headline{/snippet}
    {#snippet subheadline()}Subheadline.{/snippet}
    <a role="button" href="/start">Get started</a>
  </HeroBanner>

  <section id="features">…</section>
</Main>
```

`headline` and `subheadline` are snippets, so they can carry markup; the children are the
buttons. `image` is a URL, `scrollTo` the `#id` the scroll hint leads to — without it there
is no hint.

Attributes go to the text block, the part a page adjusts, and the `image:` and `section:`
prefixes reach the picture and the section around it:

```svelte
<HeroBanner {image} class="narrow" image:class="dimmed" section:aria-label="Intro">
```

### Contrast for the header over the picture

A full-viewport picture runs behind the site's header, and a header styled for the page
background can become unreadable on it. The `pageConfig` the Router provides carries a
`contrast` flag for that, and the page sets it, because whether the header overlays the
picture is a property of the site's layout, not of this component:

```svelte
<script>
  import { getContext, onDestroy } from 'svelte';

  const pageConfig = getContext('pageConfig');
  pageConfig.contrast = true;
  onDestroy(() => { pageConfig.contrast = false; });
</script>
```

What the layout does with the flag is the layout's own business — the starter's
`Layout.svelte` passes it to the nav, which switches its links to `--pico-contrast`.

## Wiring your backend

There is no single correct way to do authentication, registration, or contact
forms — every app's backend differs, and svUltra doesn't impose one. It
provides backend-agnostic API helpers — a request wrapper with CSRF handling
and automatic aborting of superseded requests — and your app builds its own
endpoint functions on top, against whatever backend you run.

The helpers live in `svultra/kit/api`:

- `apiRequest(endpoint, options, key)` — fetch wrapper returning
  `{ success, data, error, endpoint }`. Sets the `X-CSRFToken` header from the
  `csrftoken` cookie on mutating methods, sends credentials, and aborts a
  still-running request with the same key before starting the new one.
- `cancelRequest(key)` / `cancelAll()` — cancel requests in flight; all
  requests are cancelled automatically on page unload.
- `apiClient(apiFunction)` — wraps an endpoint function for use in a
  component: exposes a `loading` state while requests run and cancels the
  request when the component is destroyed.
- `loadRecaptcha()` / `executeRecaptcha(action)` — load the reCAPTCHA script
  on demand (site key from `window.config.recaptchaKey`) and produce a token
  for a form submission.

## Generating routes (`svultra/kit/router/generateRoutes`)

`Router` takes a `routes` map. You can write it by hand (see the kit demo) or
generate it from a `src/pages/` directory with the bundled Vite plugin:

```js
// vite.config.js
import generateRoutesPlugin from 'svultra/kit/router/generateRoutes';

export default defineConfig({
  plugins: [
    svelte(),
    generateRoutesPlugin({
      // optional: map generated paths to final ones
      routeRenames: { '/home': '/', '/404': '*' },
    }),
  ],
});
```

It writes `src/generatedRoutes.svelte.js` from your `.svelte` page files
(basenames kebab-cased, `index` mapped to its directory, nested dirs
supported) and regenerates with a reload on add / remove / change during dev.
Hand the map to `Router`:

```svelte
import { Router } from 'svultra/kit/router';
import Layout from 'svultra/kit/components/Layout.svelte';
import { routes } from './generatedRoutes.svelte.js';

<Router {routes} {Layout} />
```

Router waits until the page and its Loader content have rendered before scrolling.
Back and forward navigation then restore the browser's saved scroll position.

Loader registers each load synchronously with `startLoad()` before awaiting content and
releases the registration when it finishes. Router checks these registrations after rendering,
so it waits for both page imports and content changes within the same page.

Firefox 156.0.1 restored scroll positions before the intercepted navigation handler finished,
even with `intercept({ scroll: 'manual' })`. Returning to a long list while the shorter article
was still rendered clipped the saved position to the article's height. Router therefore sets
`history.scrollRestoration = 'manual'` before subsequent history entries are created.
After rendering, it temporarily enables `'auto'`, calls `event.scroll()`, then restores `'manual'`.
The browser retains the saved coordinates. This same path passed the Chrome navigation checks,
so Router uses it without browser detection.

Defaults: `pagesDir: './src/pages'`, `outputFile: './src/generatedRoutes.svelte.js'`,
`nestedRoutes: true`, `urlPrefix: ''` — all resolved against the Vite root, so
they work for any consumer.

## Markdown directory indexes

`generateMarkdownIndexPlugin` writes an `index.js` inside each configured Markdown directory:

```js
// vite.config.js
import generateMarkdownIndexPlugin from 'svultra/kit/markdown/generateIndex';

// First entry in plugins:
generateMarkdownIndexPlugin({ inputDirs: ['./src/markdown/articles'] }),
```

`inputDirs` is an array of paths relative to the Vite root. Each index contains its directory's
immediate `.md` files, sorted by filename with numeric ordering (`1`, `2`, `10`).
Generation runs at startup for development and builds. During development, Vite's
watcher regenerates the index when a Markdown file is added, changed or removed.
Unchanged output is not rewritten.

Pages import the plain data:

```js
import { entries } from '../markdown/articles/index.js';
```

Each entry contains `id` (filename without `.md`), `title` and `excerpt`.
Frontmatter `title` and `description` take precedence. Otherwise, a leading Markdown
heading supplies the complete title; without one, the first sentence supplies the title,
limited to `titleLength` (default 100 characters) at a word boundary. The generated
excerpt starts after that heading or inferred title and is limited to `descriptionLength`
(default 250 characters) at a word boundary. Markdown formatting is removed; files
with empty bodies are skipped. Display punctuation such as an ellipsis belongs to the page.
The index contains no images, route URLs or article imports.

Frontmatter `tags` is included when present. A string such as `tags: private, work, books`
is split on commas and each tag is trimmed. YAML lists are preserved unchanged.

## pageConfig

`pageConfig` is a reactive object passed to the page and the layout via Svelte
context (key `'pageConfig'`). A page sets flags on it; the layout reads them.

Defaults:

```js
{ showHeader: true, showFooter: true, contrast: false }
```

Read it from context and set a flag. Restore it on unmount so it does not carry
to the next page:

```svelte
<script>
  import { getContext, onDestroy } from 'svelte';

  const pageConfig = getContext('pageConfig');
  pageConfig.showHeader = false;
  onDestroy(() => { pageConfig.showHeader = true; });
</script>
```

| Flag | Default | Effect |
| ---- | ------- | ------ |
| `showHeader` | `true` | render the site header |
| `showFooter` | `true` | render the site footer |
| `contrast` | `false` | use the contrast nav styling |

These flags are a convention a layout implements. The kit's default layout is empty
and implements none; demo-kit's Layout implements all three. Custom flags can be
added the same way.

## Build info (`svultra/kit/buildInfo`)

Sometimes it is important to know exactly which version of a live site you are seeing:
whether the browser has the build just deployed or something stale from a proxy or
cache, or which build a bug report came from. svUltra stamps every build with a number
and a time for the page to show, typically in the footer.

The stamp identifies a build on the machine that made it, not a git revision: the file
is build output, kept out of git, and each machine counts its own builds. The count on
the live host is the one that identifies what is deployed.

- `src/kit/updateBuildInfo.js` counts `src/build-info.json` up by one and sets the
  timestamp, creating the file on the first run. Run it before each build, for example
  as the `prebuild` script:

  ```json
  "prebuild": "node node_modules/svultra/src/kit/updateBuildInfo.js"
  ```

- `loadBuildInfo()` returns that file as an object, or `undefined` when there is none,
  where a plain import would fail to resolve. A component renders either way:

```svelte
<script>
  import { loadBuildInfo } from 'svultra/kit/buildInfo';
  const buildInfo = loadBuildInfo();
</script>

{#if buildInfo}
  Last build: {buildInfo.lastBuildTimestamp} — v{buildInfo.buildNumber}
{/if}
```

## State & storage (`svultra/kit/stores`)

`createSyncedState` returns a reactive object or array backed by localStorage:

```js
import { createSyncedState } from 'svultra/kit/stores';

export const settings = createSyncedState('settings', { appearance: { dark: false } });
settings.appearance.dark = true;
```

Components read `settings.appearance.dark` directly and can bind to it with
`bind:checked={settings.appearance.dark}`. Nested assignments, additions, deletions,
and array mutations are reactive and saved by a batched Svelte effect.

`createSyncedState(key, initialValue, updateFromLocalStorage = true)` loads saved JSON,
using `initialValue` when the entry is missing, contains `null`, or cannot be read.
For an object, the saved data is laid over `initialValue` with `merge`, so a key added
to `initialValue` later arrives with its initial value for everyone; an array is taken as
saved. Changes from other tabs replace the root's contents while preserving its reference
and are not written back, so two tabs never answer each other's storage events; removing
the key restores `initialValue`. Pass `false` as the third argument to disable incoming
tab updates while keeping persistence.

Declare shared state once at module scope; synchronization lasts for the browser page's
lifetime. Use JSON-compatible objects or arrays whose root type stays the same.
Assign properties or replace nested values directly. The returned value has no
`subscribe`, `set`, or `update` methods.

`createLocalStorageStore` provides a localStorage-backed Svelte writable:

```js
import { createLocalStorageStore } from 'svultra/kit/stores';

const theme = createLocalStorageStore('theme', { dark: false });
// $theme reads reactively in a component; theme.set(...) / theme.update(...)
// write through to localStorage[key] as JSON.
```

`createLocalStorageStore(key, initialValue, updateFromLocalStorage = true)`:

- seeds from `localStorage[key]` (JSON-parsed), falling back to `initialValue`
  when unset or unparseable; saved data is not merged with defaults, and stored `null` is preserved;
- synchronously persists the initial value and subsequent store notifications,
  writing only when the serialized value differs from localStorage;
- `set(value)` replaces the value; `update(fn)` replaces it with the function's result;
- `update(object)` **deep-merges** into the current object
  (array fields replace wholesale; wrap a field with `overwrite(value)` to replace
  rather than merge — both `overwrite` and `merge` are exported here);
- mirrors changes from other tabs via the `storage` event, unless
  `updateFromLocalStorage` is `false`.

Persistence requires a store notification through `set` or `update`; directly
mutating the value does not notify the store. A binding to a member of its value in a
component, `bind:value={$draft.name}`, is fine: Svelte compiles the write as
the mutation followed by `draft.set($draft)`. A write inside a child that
received a member as a bindable prop is not: `bind:value={value[i]}` in the
child mutates the object silently, and nothing is saved until another store
notification. In such a child, reassign the prop after the write so the
binding passes it up to the component with the store:

```svelte
<input bind:value={() => value[i], v => { value[i] = v; value = value; }} />
```

Pre-built stores live in the same module:

| Export | Key | Initial |
| ------ | --- | ------- |
| `configStore` | `config` | `{ darkMode: false }` |
| `personStore` | `person_data` | `null` |

## Conventions

The kit preserves the folder structure it was extracted from: a component or
module keeps its source location (`components/`, `components/layout/`, the
`actions/` and `router/` subtrees) rather than being flattened or relocated.
Import through the established paths (the `#kit/*` internal aliases and the
public subpath exports) instead of moving files around — the path tells you
where the thing lives and how the code is organized.

## Import shapes

svUltra ships two kinds of public entry: **barrels** (paths that end at a
namespace, like `svultra/kit/components`) and **specific items** (paths
that name a file or module, like `svultra/kit/components/Layout.svelte`).

**When to use which.** Barrels expose a curated set of *common primitives*
that are typically reached by name from many places — `Button`, `Card`,
`Icon`, `Link`, `LoadingIndicator` and friends. Use the barrel when you
want one or more of those primitives by name: `import { Button, Card }
from 'svultra/kit/components'`. The barrel keeps the common case
ergonomic, lets you group several related imports on one line, and
tree-shakes cleanly (unused names are dropped by the bundler).

Use a **specific-item path** when the thing isn't in the barrel — that's
the case for everything else: layout shells (`Layout`), per-app stubs
(`LoginForm`, `ContactForm`), single-use widgets (`ToggleDarkMode`,
`Toasts`, `LoadingOverlay`), and assets (`logo.svg`). These items aren't
in the barrel deliberately: they're either less commonly imported, or
they ship default + named exports together (a single `import Toaster, {
toastSuccess }` reads better than two lines from a barrel).

The rule of thumb: **try the barrel first; if the name isn't there, use
the file path**. The barrel is what you'll usually want; file paths
expose everything else without bloating it.

**Import-shape rule** follows the entry type:

```js
// Barrel — named imports
import { syntaxSugar, transformComponentStyles } from 'svultra';
import { Button, Card, Icon, Link }              from 'svultra/kit/components';
import { ripple, accordion }                     from 'svultra/kit/actions';
import { smiley, spinner, sun, moon }            from 'svultra/kit/assets/icons';
import { Router, navigate, currentPath }         from 'svultra/kit/router';

// Single component file — default import
import Layout    from 'svultra/kit/components/Layout.svelte';
import LoginForm from 'svultra/kit/components/LoginForm.svelte';
import Menu      from 'svultra/kit/components/layout/Menu.svelte';

// Component file that also exports named helpers — mixed
import Toaster, { toastSuccess, toastWarning } from 'svultra/kit/components/Toasts.svelte';

// Single-file utility module — named imports
import { configStore, personStore } from 'svultra/kit/stores';
import { apiRequest, cancelRequest } from 'svultra/kit/api';
import { snippetToHtml, dedent }    from 'svultra/snippet';

// Asset path — default import
import logo from 'svultra/kit/assets/logo.svg';
```

The rule, stated without referring to file extensions: when the import
path ends *at a namespace* (barrel), use named imports; when it ends *at
a specific item* (a component file or an asset file), use a default
import for the item, plus any named helpers the item ships alongside.

## License

ISC
