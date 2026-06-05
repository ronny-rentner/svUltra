# Attribute Transformer Preprocessor

DOM attribute names like `data-tooltip`, `data-index`, and `aria-label` are
unfriendly to write — the prefixes are convention, not meaning, and the
hyphens block Svelte's `{shorthand}` form (`{data-tooltip}` isn't a legal
identifier). The attribute transformer preprocessor lets you write
`tooltip`, `index`, `ariaLabel` in source; it renames them at build time to
whatever the DOM expects, so Pico's tooltips, the dataset API, and CSS
attribute selectors keep working unchanged.

There are no built-in rules — every project chooses which names to rewrite.

## Setup

Add it to your `svelte.config.js`, with your project's `[from, to]` rename
rules:

```javascript
import { attributeTransformer } from 'svUltra';

export default {
  preprocess: [
    // ...other preprocessors
    attributeTransformer({
      attributes: [
        ['tooltip',   'data-tooltip'],
        ['placement', 'data-placement'],
        ['index',     'data-index'],
      ],
    }),
    // ...other preprocessors
  ],
};
```

That's it — every element using one of those names is rewritten before the
Svelte compiler sees it.

## What the rewrite does

Each rule is a `[from, to]` pair. The preprocessor walks every element in
your markup; for each attribute whose name matches `from`, it renames it to
`to`, leaving the value untouched:

```svelte
<!-- You write -->
<article tooltip="Autosaved 2 minutes ago" placement="right">
  <a {index} tooltip="Remove this item">✘</a>
</article>
```

```svelte
<!-- becomes -->
<article data-tooltip="Autosaved 2 minutes ago" data-placement="right">
  <a data-index={index} data-tooltip="Remove this item">✘</a>
</article>
```

Both attribute and Svelte-shorthand forms are rewritten:

```svelte
<a {index}>✘</a>         <!-- becomes <a data-index={index}>✘</a> -->
<a tooltip="…">✘</a>     <!-- becomes <a data-tooltip="…">✘</a>   -->
```

The rewrite applies to **HTML elements**. Component invocations
(uppercase tag names) pass the attribute through to the component as a
prop; the rewrite happens later, when the component forwards the value to
a real element:

```svelte
<!-- inside MyCard.svelte: forwards everything to the article -->
<article {...$$props}>…</article>

<!-- caller -->
<MyCard tooltip="…" />     <!-- arrives on article as data-tooltip -->
```

## Configuration

### `attributes`

Array of `[from, to]` pairs. Both arguments go through
`String.prototype.replace`, so `from` can be either a literal string or a
`RegExp`, and `to` can be a string with capture references or a function:

```javascript
attributeTransformer({
  attributes: [
    // literal renames
    ['tooltip',   'data-tooltip'],
    ['ariaLabel', 'aria-label'],

    // regex: shorthand for setting a boolean attribute to false
    //   <button !enabled>  →  <button enabled={false}>
    [/!(.*)/, '$1={false}'],
  ],
});
```

### `excludeTags`

Optional list of tag names to skip entirely:

```javascript
attributeTransformer({
  attributes: [/* … */],
  excludeTags: ['CodeExample', 'Snippet'],
});
```

Useful for components that display literal source code, where renaming
attributes inside their displayed content would silently corrupt the text.

## Notes & gotchas

- **Put it after `syntaxSugar`.** The syntax sugar preprocessor expects
  valid Svelte syntax; renaming attributes commutes cleanly when run
  afterwards.
- **No default rules.** Every project's rename set is project-specific —
  what you call `tooltip` someone else might call `tip`. Keep the list in
  `svelte.config.js`.
- **Element-only rewrite.** Component props named `tooltip` reach the
  component verbatim; the rewrite happens when the component forwards
  the prop to a real element.
- **Files under `node_modules` are skipped**, so dependencies are never
  rewritten.
