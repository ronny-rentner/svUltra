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

## License

ISC