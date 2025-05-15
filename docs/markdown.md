# Markdown Preprocessor

## Overview

The Markdown preprocessor allows you to import markdown content directly into your Svelte components. This is useful for documentation, blog posts, or any text-heavy content that's easier to write and maintain in markdown format.

## How It Works

This preprocessor:

1. Detects imports of `.md` files in your components
2. Transforms the markdown content to HTML
3. Makes the rendered HTML available as a variable in your component

## Basic Example

```svelte
<script>
  import content from './about.md';
</script>

<div class="markdown-content">
  {content}
</div>
```

The `about.md` file:

```markdown
# About Us

We are a **fantastic** team of developers working on *amazing* projects.

## Our Mission

- Create great software
- Help others succeed
- Have fun along the way
```

Will be rendered as HTML in your Svelte component.

## Configuration

You can specify a base path for markdown files:

```javascript
markdownPreprocessor({
  path: './src/markdown'  // Base path for markdown files
})
```

This allows you to use relative paths in your imports:

```svelte
<script>
  // With path: './src/markdown'
  import about from './about.md';       // Looks for ./src/markdown/about.md
  import legal from '../legal/terms.md'; // Looks for ./src/legal/terms.md
</script>
```

## Usage in Config

```javascript
import { markdownPreprocessor } from 'svUltra';

export default {
  preprocess: [
    // other preprocessors...
    markdownPreprocessor({
      path: './src/markdown'  // Base path for markdown files
    }),
    // other preprocessors...
  ],
};
```

## Notes

- Imported markdown is processed at build time, not runtime
- You can apply CSS styling to the rendered HTML
- Integrates well with other preprocessors for consistent styling
- Helps maintain a clean separation between content and presentation