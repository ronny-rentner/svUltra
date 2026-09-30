# Markdown Preprocessor

## Overview

The Markdown preprocessor allows you to insert and render markdown content directly into your Svelte components. This is useful for documentation, blog posts, or any text-heavy content that's easier to write and maintain in markdown format.

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

## Configuration

In `svelte.config.js`:

```javascript
import { svultraPreprocess } from 'svultra';

export default {
  preprocess: svultraPreprocess({
    markdown: {
      path: './src/markdown',
      breaks: true, // Render single newlines as line breaks
    },
  }),
};
```

By default, Markdown files are loaded relative to the Svelte file. `path` specifies a different base directory.

Options inside `markdown`, other than `path`, are passed to the [Marked library](https://marked.js.org/using_advanced#options).

## Default file

`<markdown />` uses the Svelte component's filename with a `.md` extension:

```svelte
<!-- in Guide.svelte → loads Guide.md -->
<markdown />
```

## Markdown files as components

A `.md` file can also be the source of a whole Svelte component. The Markdown preprocessor generates its markup; Svelte compiles that markup into a component.

In `svelte.config.js`, this is enabled by `extensions: ['.svelte', '.md']`.

The resulting component can be imported and rendered like any other Svelte component:

```svelte
<script>
  import Article from '../markdown/articles/1.md';
</script>

<Article />
```

Frontmatter is stripped from `.md` component sources before compilation. Inclusions through `<markdown file="…">` render the complete file.

For overview lists, the [directory index generator](../readme.md#markdown-directory-indexes) provides `title`, `excerpt`, and optional `date` fields.

## Loading components on demand

[Vite's glob imports](https://vite.dev/guide/features.html#glob-import) let a page load individual Markdown components from a directory on demand:

```javascript
const articles = import.meta.glob('../markdown/articles/*.md');
```

`articles` maps filenames to import functions. Each function returns a promise for a module whose `default` export is the compiled Svelte component.

## FAQ mode

With `mode="faq"`, each `## Heading` and its following content become an `<Accordion>`:

```svelte
<markdown mode="faq" file="faq.md" />
```

An `Accordion` component must be available in the Svelte page. It receives the heading as its `header` snippet and the answer as `children`.

## Find and replace

For file inclusions, `pattern` and `replacement` apply a regex replacement to the rendered HTML. The pattern uses `/regex/flags` syntax.

## Custom link renderer

HTTP(S) URLs and protocol-relative URLs (`//example.com`) receive `target="_blank"`.
