# Class Merge Preprocessor

## Overview

The Class Merge preprocessor combines multiple ways of specifying classes on Svelte components. It handles the static `class` attribute, `class:` directives, and spread attributes, merging them into a single `class` so they all take effect together.

## How It Works

This preprocessor:

1. Finds Svelte components (`<Component>`, not plain HTML elements) that carry a `class:` directive, or at least two of: a static `class`, a `class:` directive, a spread
2. Combines the static `class`, each spread's `.class`, and every `class:` directive into one string
3. Removes the original `class` attribute and `class:` directives — the spread is left in place
4. Appends the combined `class="…"` as the last attribute, so it wins over classes coming in through the spread

## Basic Example

```svelte
<!-- Before preprocessing -->
<Button class:primary={isPrimary} class="large" {...props} />
```

After preprocessing, this becomes:

```svelte
<!-- After preprocessing -->
<Button {...props} class="{{...props}?.class} large {isPrimary ? 'primary' : ''}" />
```

Note how:

- The spread stays where it was; only the `class` attribute and `class:` directive are removed, and the combined `class` is appended last
- All sources are combined into one `class`, in order: spread classes, then the static class, then each directive
- A spread's classes are pulled in as `{{...props}?.class}` — the whole spread expression followed by `?.class`
- A `class:` directive becomes `{condition ? 'name' : ''}`; a bare `class:name` with no value uses `true` as the condition

## Multiple Class Sources Example

When a component combines several `class:` directives, a static class, and a spread:

```svelte
<Card class:selected={isSelected} class:highlighted class="card-style" {...props} />
```

This becomes:

```svelte
<Card {...props} class="{{...props}?.class} card-style {isSelected ? 'selected' : ''} {true ? 'highlighted' : ''}" />
```

`class:highlighted` has no value, so its condition is `true`.

## Usage in Config

```javascript
import { classMergePreprocessor } from 'svultra';

export default {
  preprocess: [
    // other preprocessors...
    classMergePreprocessor(),
    // other preprocessors...
  ],
};
```

## Notes

- Works well with the `transformComponentStyles` preprocessor
- The combined `class` attribute is placed last, so it overrides any classes coming in through the spread
- Class order in the output is: spread classes, then the static `class`, then each `class:` directive
- Applies to Svelte components only. Plain HTML elements (`<div>`, `<span>`, …) are not handled — a static `class` plus `{...rest}` on an element still loses the class to the spread; kit components work around that with a `class:foo={1}` directive hack
- Files under `node_modules` are skipped (except svUltra's own)
