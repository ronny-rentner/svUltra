# Syntax Sugar Preprocessor

## Overview

The Syntax Sugar preprocessor simplifies Svelte syntax for more concise templates. It lets you write Svelte code with less boilerplate, automatically converting your simplified syntax to standard Svelte syntax during preprocessing.

## Common Replacements

```javascript
const replacements = [
  // Multi-constant declaration
  [/\{const\s+([^}]+)\s*}/g, (match, content) => 
     content.trim().split(/,\s*/).map(_ => `\{@const ${_}\}`).join(' ')],
  
  // Store value shorthand for components
  [/<([A-Za-z0-9]+)([^>]*?)\s\{\$([A-Za-z0-9_]+)\}([^>]*?)\/?>/g, '<$1$2 $3={$$$3}$4/>'],
  
  // Boolean attribute improvements
  [/ disabled=\{([^}|]*?)\}/g, ' disabled={$1 || undefined}'],
  ['{disabled}', 'disabled={disabled || undefined}'],
  ['disabled=false', ''],
  
  // Block syntax
  ['{const ',   '{@const '],
  ['{snippet ', '{#snippet '],
  ['{if ',      '{#if '],
  ['{else}',    '{:else}'],
  ['{else ',    '{:else '],
  ['{elif ',    '{:else if '],
  ['{elseif ',  '{:else if '],
  ['{await ',   '{#await '],
  ['{then ',    '{:then '],
  ['{each ',    '{#each '],
  ['{render ',  '{@render '],
  ['{try}',     '{#try}'],
  ['{catch ',   '{:catch '],

  // Comment removal
  [/\/\*[\s\S]*?\*\//gm, ''],
  
  // Media queries
  ['@media mobile',  '@media (max-width: 768px)'],
  ['@mobile',        '@media (max-width: 768px)'],
  ['@media desktop', '@media (min-width: 769px)'],
  ['@desktop',       '@media (min-width: 769px)'],
  ['@media large',   '@media (min-width: 1536px)'],
  ['@large',         '@media (min-width: 1536px)'],
  
  // Theme selectors
  ['@dark',          ':root[data-theme="dark"]'],
  ['@light',         ':root[data-theme="light"]'],
];
```

## Event Handler Shorthand

By naming your handler function to match the event (like `onclick`), you can use Svelte's property shorthand for events on both HTML elements and components:

```svelte
<script>
  // Name the handler to match the event
  function onclick(event) {
    console.log('Button clicked!', event);
  }
</script>

<!-- With HTML elements -->
<button {onclick}>Click me</button>

<!-- With components (doesn't work in standard Svelte) -->
<CustomButton {onclick}>Click me</CustomButton>
```

This significantly reduces boilerplate for event handling and makes your components feel more like native HTML elements.

## Store Value Shorthand for Components

One key feature of svUltra is extending Svelte's HTML element shorthand syntax to work with components. This is a way to unify the treatment of HTML elements and Svelte components.

In standard Svelte, you can use the `{prop}` shorthand with HTML elements, but the shorthand for store values (`{$store}`) doesn't work for components. With this preprocessor, it does:

```svelte
<!-- This syntax doesn't work in standard Svelte for components: -->
<CustomComponent {$myStore} />

<!-- But with svUltra, it transforms into: -->
<CustomComponent myStore={$myStore} />
```

This makes templates more concise and consistent between HTML elements and components.

## Block Syntax Simplification

Removes the `#` and `:` prefixes required in standard Svelte:

```svelte
<!-- Simplified syntax -->
{if condition}
  <p>Content</p>
{else}
  <p>Alternative</p>
{/if}

<!-- Standard Svelte -->
{#if condition}
  <p>Content</p>
{:else}
  <p>Alternative</p>
{/if}
```

## Multiple Constants Declaration

Allows declaring multiple constants in a single line:

```svelte
<!-- Simplified syntax -->
{const x = 1, y = 2, z = 3}

<!-- Becomes -->
{@const x = 1} {@const y = 2} {@const z = 3}
```

## Boolean Attribute Handling

Improves the handling of boolean attributes:

```svelte
<!-- Simplified -->
<button {disabled}>Click me</button>

<!-- Becomes -->
<button disabled={disabled || undefined}>Click me</button>
```

This ensures that when `disabled` is false, the attribute is completely removed rather than showing as `disabled="false"`.

## Media Query and Theme Shortcuts

Simplified media query and theme syntax:

```svelte
<style>
  /* Simplified */
  @mobile {
    div { font-size: 14px; }
  }
  
  @dark {
    button { background: #333; }
  }
  
  /* Becomes */
  @media (max-width: 768px) {
    div { font-size: 14px; }
  }
  
  :root[data-theme="dark"] {
    button { background: #333; }
  }
</style>
```

## Usage in Config

```javascript
import { syntaxSugar } from 'svUltra';

// Define your replacements
const replacements = [
  ['{if ', '{#if '],
  ['{else}', '{:else}'],
  // ... add more replacements as needed
];

export default {
  preprocess: [
    // Should be the first preprocessor
    syntaxSugar(replacements),
    // other preprocessors...
  ],
};
```

## Notes

- The syntax sugar preprocessor should typically be the first in your preprocessing chain
- You can customize the replacements to match your preferences
- Replacements are applied sequentially, so order matters
- Both string replacements and regex replacements with callbacks are supported