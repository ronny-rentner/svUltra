# Attribute Transformer Preprocessor

## Overview

The Attribute Transformer preprocessor solves a key limitation in Svelte's attribute handling: it allows you to use simple attribute names that get transformed into complex or hyphenated attributes that would normally be incompatible with JavaScript's variable naming rules.

For example, you can use `tooltip="Help text"` instead of `data-tooltip="Help text"`, which is particularly valuable because you can't use the shorthand syntax `{data-tooltip}` in Svelte (since hyphens aren't allowed in JavaScript variable names).

## How It Works

This preprocessor:

1. Scans your markup for attributes matching patterns you define
2. Transforms these attributes according to your rules
3. Supports both exact string matches and regex-based transformations

## Basic Example: Simplifying Data Attributes

```svelte
<script>
  // This is a valid JavaScript variable name
  let tooltip = "Help text";
  // But this wouldn't be: let data-tooltip = "Help text"; // Invalid!
</script>

<!-- Before preprocessing -->
<div {tooltip} placement="top">Hover me</div>

<!-- After preprocessing -->
<div data-tooltip="Help text" data-placement="top">Hover me</div>
```

The preprocessing step bridges the gap between JavaScript naming limitations and HTML attribute conventions, allowing you to use the convenient shorthand syntax.

## Regex Transformation Example

You can use regex patterns for more complex transformations:

```svelte
<!-- Before preprocessing -->
<button !enabled>Disabled Button</button>

<!-- After preprocessing (with regex rule [/!(.*)/, '$1={false}']) -->
<button enabled={false}>Disabled Button</button>
```

This allows for a convenient shorthand to set boolean attributes to false.

## Configuration

The preprocessor accepts an options object with:

- `attributes`: Array of `[pattern, replacement]` pairs
- `excludeTags`: Optional array of tags to exclude from transformation

```javascript
attributeTransformer({
  attributes: [
    // Exact string matches
    ['tooltip', 'data-tooltip'],
    ['placement', 'data-placement'],
    
    // Regex transformations
    [/!(.*)/, '$1={false}'],
  ],
  excludeTags: ['svg', 'math'],  // Optional: tags to exclude 
})
```

## Advanced Example: Component Library Integration

This preprocessor is particularly useful when working with component libraries or frameworks that use data attributes:

```svelte
<script>
  // Valid JavaScript variables
  let tooltip = "Click me";
  let placement = "top";
</script>

<!-- Before preprocessing - using convenient shorthand syntax -->
<Button {tooltip} {placement} ariaLabel="Action Button">
  Action Button
</Button>

<!-- After preprocessing - transformed to proper data attributes -->
<Button data-tooltip="Click me" data-placement="top" aria-label="Action Button">
  Action Button
</Button>
```

## Usage in Config

```javascript
import { attributeTransformer } from 'svUltra';

export default {
  preprocess: [
    // other preprocessors...
    attributeTransformer({
      attributes: [
        ['tooltip', 'data-tooltip'],
        ['placement', 'data-placement'],
        ['ariaLabel', 'aria-label'],   // Another common use for hyphenated attributes
        [/!(.*)/, '$1={false}'],
      ]
    }),
    // other preprocessors...
  ],
};
```

## Notes

- Enables the use of simple attributes that map to complex or hyphenated attributes
- Allows you to use Svelte's shorthand syntax (`{tooltip}`) for attributes that would normally require hyphenated names
- Works seamlessly with both HTML elements and Svelte components
- Particularly useful for integrating with UI libraries that rely on data-* attributes or ARIA attributes