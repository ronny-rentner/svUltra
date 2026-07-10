# Attribute Transformer Preprocessor

DOM attribute names like `data-tooltip`, `data-index`, and `aria-label` are
unfriendly to write — the prefixes are convention, not meaning, and the
hyphens block Svelte's `{shorthand}` form (`{data-tooltip}` isn't a legal
identifier). The attribute transformer preprocessor lets you write
`tooltip`, `index`, `ariaLabel` in source; it renames them at build time to
whatever the DOM expects, so Pico's tooltips, the dataset API, and CSS
attribute selectors keep working unchanged.

Two rules are built in and on by default — `tooltip → data-tooltip` and
`placement → data-placement` — and you add your own. Pass `useDefaults: false`
to drop the built-ins and rewrite only your rules.

## Setup

Add it to your `svelte.config.js`, with your project's `[from, to]` rename
rules:

```javascript
import { attributeTransformer } from 'svultra';

export default {
  preprocess: [
    // ...other preprocessors
    attributeTransformer({
      attributes: [
        ['ariaLabel', 'aria-label'],
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
  <a data-index="{index}" data-tooltip="Remove this item">✘</a>
</article>
```

Both attribute and Svelte-shorthand forms are rewritten:

```svelte
<a {index}>✘</a>         <!-- becomes <a data-index="{index}">✘</a> -->
<a tooltip="…">✘</a>     <!-- becomes <a data-tooltip="…">✘</a>     -->
```

The rewritten value is always emitted in quotes, since static values can
contain spaces.

The rewrite applies to **HTML elements**. Component invocations
(uppercase tag names) pass the attribute through to the component as a
prop; the rewrite happens inside the component, where the prop is set on
a real element — as the kit's `Card` does:

```svelte
<!-- inside Card.svelte: sets the props on the article -->
<article {tooltip} {placement} {...rest}>…</article>

<!-- caller -->
<Card tooltip="Autosaved 2 minutes ago" />   <!-- the article gets data-tooltip -->
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

### `useDefaults`

Two rules are built in and applied before your own:

```javascript
['tooltip',   'data-tooltip'],
['placement', 'data-placement'],
```

Pass `useDefaults: false` to apply only your `attributes` list.

## Notes & gotchas

- **Put it after `syntaxSugar`.** The syntax sugar preprocessor expects
  valid Svelte syntax; renaming attributes commutes cleanly when run
  afterwards.
- **Element-only rewrite.** Component props named `tooltip` reach the
  component verbatim; the rewrite happens when the component forwards
  the prop to a real element.
- **Files under `node_modules` are skipped**, except svUltra's own kit
  files, which are written with these shorthands.
