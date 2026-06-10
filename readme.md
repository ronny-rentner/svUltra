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

Simplifies Svelte template syntax with concise shorthand patterns:

```svelte
<!-- Simplified syntax -->
{if condition}
  <Component {$store}>Content</Component>
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
import { signOut }                  from 'svultra/kit/api';
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