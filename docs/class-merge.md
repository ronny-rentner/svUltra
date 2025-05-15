# Class Merge Preprocessor

## Overview

The Class Merge preprocessor combines multiple ways of specifying classes in Svelte components. It handles class attributes, class directives, and spread attributes, ensuring they all work together correctly.

## How It Works

This preprocessor:

1. Identifies components with multiple class-related attributes
2. Extracts and combines class values from various sources
3. Ensures spread attributes' classes are properly merged with explicit class values
4. Positions the resulting class attribute at the end to ensure it has priority

## Basic Example

```svelte
<!-- Before preprocessing -->
<Button class:primary={isPrimary} class="large" {...props} />
```

After preprocessing, this becomes:

```svelte
<!-- After preprocessing -->
<Button {...props} class="{isPrimary ? 'primary' : ''} large {props?.class ? props.class : ''}" />
```

Note how:
- The spread props are moved before the class attribute
- All class sources are combined into a single class attribute
- Class values are preserved with proper conditional logic

## Class Shorthand with Component Props

A powerful pattern is to name your component props to match class names, then use the convenient class shorthand:

```svelte
<script>
  // Component props
  let { selected = false, size = 'medium', ...rest } = $props();
</script>

<style>
  .card {
    border: 1px solid #eee;
    
    &.selected {
      border-color: blue;
    }
    
    &.large {
      padding: 2rem;
    }
  }
</style>

<!-- Using class:{propName} syntax -->
<div class="card" class:{selected} class:{large}={size === 'large'} {...rest}>
  Card Content
</div>
```

After preprocessing:

```svelte
<div 
  {...rest} 
  class="card {selected ? 'selected' : ''} {size === 'large' ? 'large' : ''} {rest?.class ? rest.class : ''}"
>
  Card Content
</div>
```

This makes it easy to have component props that both control component state and apply corresponding CSS classes.

## Multiple Class Sources Example

When using multiple class directives and a standard class attribute:

```svelte
<Card 
  class:selected={isSelected} 
  class:highlighted 
  class="card-style" 
  {...props} 
/>
```

This becomes:

```svelte
<Card 
  {...props} 
  class="{isSelected ? 'selected' : ''} {highlighted ? 'highlighted' : ''} card-style {props?.class ? props.class : ''}" 
/>
```

## Usage in Config

```javascript
import { classMergePreprocessor } from 'svUltra';

export default {
  preprocess: [
    // other preprocessors...
    classMergePreprocessor(),
    // other preprocessors...
  ],
};
```

## Notes

- This works well with the `transformComponentStyles` preprocessor
- The class attribute is strategically placed at the end of element attributes to ensure it overrides any classes that might be in the spread attributes
- The order of classes follows a priority system: class directives first, explicit class values next, and spread attribute classes last
- Works with both HTML elements and Svelte components