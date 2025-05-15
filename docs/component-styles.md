# Component Styles Preprocessor

## Overview

The Component Styles preprocessor allows you to style components directly in your CSS, just as you would style HTML elements. This works for both your own components and third-party components, enabling a more consistent approach to styling.

## How It Works

When you use a component selector in your CSS, the preprocessor:

1. Transforms the component selector to a class-based selector (e.g., `.ThirdPartyButton-a1b2c3`) with a hash based on the CSS content
2. Automatically adds those classes to the component instances in your markup
3. Preserves the original styling intent while maintaining proper component encapsulation

## Complete Example with Custom Component

First, create a component that passes down attributes:

```svelte
<!-- MyButton.svelte -->
<script>
  // Capture specific props and all remaining props
  let { primary = false, children, ...rest } = $props();
</script>

<style>
  button {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    border: 1px solid #ccc;
  }
  
  .primary {
    background-color: blue;
    color: white;
  }
</style>

<!-- Pass remaining attributes (including class) to the button element -->
<button class:primary {...rest}>
  {#if children}
    {render children()}
  {:else}
    Button
  {/if}
</button>
```

Then use and style it in a parent component:

```svelte
<!-- Parent.svelte -->
<script>
  import MyButton from './MyButton.svelte';
</script>

<style>
  /* Style the custom component directly */
  MyButton {
    margin-bottom: 1rem;
    font-weight: bold;
  }
  
  /* Apply different styles to different instances */
  .actions MyButton {
    margin-right: 0.5rem;
  }
</style>

<h1>My App</h1>

<MyButton>Default Button</MyButton>
<MyButton primary>Primary Button</MyButton>

<div class="actions">
  <MyButton>Save</MyButton>
  <MyButton>Cancel</MyButton>
</div>
```

The component styles preprocessor makes this possible by converting component selectors to class selectors and then applying those classes to the component instances.

## Basic Example

```svelte
<script>
  import Button from 'some-ui-library';
</script>

<style>
  Button {
    margin-bottom: 1rem;
    color: var(--primary);
  }
</style>

<Button>Click me</Button>
```

After preprocessing, it becomes something like:

```svelte
<script>
  import Button from 'some-ui-library';
</script>

<style>
  .Button-a1b2c3 {
    margin-bottom: 1rem;
    color: var(--primary);
  }
</style>

<Button class="Button-a1b2c3">Click me</Button>
```

## Advanced Example with Combined Classes

You can combine component styling with regular classes for more flexibility:

```svelte
<script>
  import Button from 'some-ui-library';
</script>

<style>
  div {
    padding: 1rem;
    
    Button {
      margin-top: 0.5rem;
      
      .special {
        color: #ff3e00;
        font-weight: bold;
      }
    }
  }
</style>

<div>
  <Button>Regular button</Button>
  <Button class="special">Special button</Button>
</div>
```

This transforms to:

```svelte
<script>
  import Button from 'some-ui-library';
</script>

<style>
  div {
    padding: 1rem;
    
    .Button-a1b2c3 {
      margin-top: 0.5rem;
      
      .special {
        color: #ff3e00;
        font-weight: bold;
      }
    }
  }
</style>

<div>
  <Button class="Button-a1b2c3">Regular button</Button>
  <Button class="Button-a1b2c3 special">Special button</Button>
</div>
```

The preprocessor preserves the CSS nesting structure while replacing the component selector with the appropriate class selector.

## Usage in Config

```javascript
import { transformComponentStyles } from 'svUltra';

export default {
  preprocess: [
    // other preprocessors...
    transformComponentStyles(),
    // other preprocessors...
  ],
};
```

## Notes

- This preprocessor helps unify how you work with HTML elements and components in your CSS
- It only works if the component accepts a `class` prop
- For best results, use with the `classMergePreprocessor` to handle cases where components already have class attributes
- The hash in the generated class name ensures uniqueness while being deterministic based on the CSS content
- Modern CSS nesting is preserved in the transformed output