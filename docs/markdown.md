# Markdown Preprocessor

## Overview

The Markdown preprocessor allows you to import markdown content directly into your Svelte components. This is useful for documentation, blog posts, or any text-heavy content that's easier to write and maintain in markdown format.

## How It Works

This preprocessor:

1. Detects `<markdown>` tags in your components
2. Transforms their content — written inline, or read from a `.md` file — to HTML
3. Replaces the tag with the rendered HTML

## Basic Example

Write markdown inline between `<markdown>` tags:

```svelte
<markdown>
  # About Us

  We are a **fantastic** team.
</markdown>
```

Or load it from a file:

```svelte
<markdown file="about.md" />
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

## Default file

A self-closing tag with no `file` and no body loads a `.md` file named after the component:

```svelte
<!-- in Guide.svelte → loads Guide.md -->
<markdown />
```

## FAQ mode

With `mode="faq"`, each `## Heading` in the markdown becomes an `<Accordion>` — the heading is the summary, the content below it the panel:

```svelte
<markdown mode="faq" file="faq.md" />
```

Requires an `Accordion` component in scope.

## Find and replace

For file content, `pattern` and `replacement` run a regex replace over the rendered HTML. The pattern is written `/regex/flags`:

```svelte
<markdown file="terms.md" pattern="/2024/g" replacement="2026" />
```

## Configuration

You can specify a base path for markdown files:

```javascript
markdownPreprocessor({
  path: './src/markdown'  // Base path for markdown files
})
```

Paths in the `file` attribute then resolve against that base:

```svelte
<markdown file="about.md" />          <!-- ./src/markdown/about.md -->
<markdown file="../legal/terms.md" /> <!-- ./src/legal/terms.md -->
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

- Markdown is rendered at build time, not runtime
- Braces (`{` `}`) inside code spans and blocks are escaped, so Svelte doesn't read them as expressions
- External links get `target="_blank"`; root-relative links (`/…`) stay internal
- You can apply CSS styling to the rendered HTML
- Integrates well with other preprocessors for consistent styling
- Helps maintain a clean separation between content and presentation