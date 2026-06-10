# Syntax Sugar Preprocessor

Svelte templates accumulate small repetitions: a prop named on both sides of an `=`,
stores that bind to elements but not components, ceremony around every block.
The syntax sugar preprocessor allows to fold these into a compact, consistent shorthands
and compiles it straight back to standard Svelte — so you write less without giving anything up.

Sensible defaults are built in, and you can add your own shortcuts or replace
them entirely.

## Setup

Add it to your `svelte.config.js` as the **first** preprocessor in the chain:

```javascript
import { syntaxSugar } from 'svUltra';

export default {
  preprocess: [
    // Must run first: expands shorthands into valid Svelte before the
    // other preprocessors and the compiler parse the file.
    syntaxSugar(),        // built-in defaults, no config needed
    // ...other preprocessors
  ],
};
```

That's it — every shorthand in the next section now works.

## What you get out of the box

### Block syntax

Write control-flow blocks without the `#`, `:`, and `@` prefixes Svelte
requires:

```svelte
<!-- You write -->
{if user}
  <p>Hi {user.name}</p>
{elif guest}
  <p>Welcome</p>
{else}
  <p>Please log in</p>
{/if}

{each items as item}
  <li>{item}</li>
{/each}
```

```svelte
<!-- becomes -->
{#if user}
  <p>Hi {user.name}</p>
{:else if guest}
  <p>Welcome</p>
{:else}
  <p>Please log in</p>
{/if}

{#each items as item}
  <li>{item}</li>
{/each}
```

The closing tags (`{/if}`, `{/each}`, …) are already prefix-free in Svelte, so
they stay exactly as you write them.

### Multiple constants in one tag

Declare several `{@const}` values at once:

```svelte
{const x = 1, y = 2, z = 3}
```

```svelte
<!-- becomes -->
{@const x = 1} {@const y = 2} {@const z = 3}
```

### Store shorthand for components

Svelte lets you write `{prop}` as shorthand for `prop={prop}` on elements, but
the store form `{$store}` doesn't work on components. This preprocessor makes it
work, unifying how you treat elements and components:

```svelte
<UserCard {$user} />
```

```svelte
<!-- becomes -->
<UserCard user={$user} />
```

### `bind:` and `style:` shorthands

The same shorthand idea extended to directives:

```svelte
<Modal bind:{open} />
<Box style:{color} />
```

```svelte
<!-- becomes -->
<Modal bind:open={open} />
<Box style:color={color} />
```

### Svelte 4 slots and `let:` props

Svelte 5 replaces named slots and slot props with snippets. The preprocessor
accepts the Svelte 4 surface and compiles it to the snippet form, so the
terser slot markup keeps working:

```svelte
<Card>
  <h2 slot="header">Title</h2>
</Card>

<MediaQuery query="(max-width: 768px)" let:matches>
  {if matches}<MobileMenu />{/if}
</MediaQuery>
```

```svelte
<!-- becomes -->
<Card>
  {#snippet header()}<h2>Title</h2>{/snippet}
</Card>

<MediaQuery query="(max-width: 768px)">
  {#snippet children(matches)}
    {#if matches}<MobileMenu />{/if}
  {/snippet}
</MediaQuery>
```

- Works on any tag: components, plain elements, and `<svelte:fragment>`
  (the fragment exists only to carry `slot=`, so its wrapper tags are
  dropped).
- `slot=` and `let:` combine — `<div slot="item" let:thing>` becomes
  `{#snippet item(thing)}<div>…`.
- Multiple `let:` props become snippet parameters in order of appearance.
  That mapping is positional, unlike Svelte 4's named slot props, so the
  component must render its snippet with the parameters in that order.
- `let:name={alias}` passes the alias pattern through as the parameter.

Unlike the textual shorthands, this rewrite is AST-based: it runs after the
string replacements (which by then have produced valid Svelte) and edits the
parsed template, so nested same-name tags and `>` inside attribute
expressions are handled correctly.

### Default replacement reference

| You write        | Expands to        |
| ---------------- | ----------------- |
| `{if cond}`      | `{#if cond}`      |
| `{elif cond}`    | `{:else if cond}` |
| `{elseif cond}`  | `{:else if cond}` |
| `{else}`         | `{:else}`         |
| `{else if cond}` | `{:else if cond}` |
| `{each list}`    | `{#each list}`    |
| `{await p}`      | `{#await p}`      |
| `{then v}`       | `{:then v}`       |
| `{catch e}`      | `{:catch e}`      |
| `{try}`          | `{#try}`          |
| `{snippet foo}`  | `{#snippet foo}`  |
| `{render foo()}` | `{@render foo()}` |
| `{html str}`     | `{@html str}`     |
| `{const a, b}`   | `{@const a} {@const b}` |
| `<C {$store} />` | `<C store={$store} />`  |
| `<C bind:{v} />` | `<C bind:v={v} />`      |
| `<C style:{c} />`| `<C style:c={c} />`     |
| `<tag slot="x">…</tag>` | `{#snippet x()}<tag>…</tag>{/snippet}` |
| `<C let:a>…</C>` | `<C>{#snippet children(a)}…{/snippet}</C>` |

## Adding your own shortcuts

Pass an array of replacements to `syntaxSugar()`. They are appended **after**
the defaults, so the built-ins still apply. Each entry is a
`[search, replacement]` pair, where `search` is either a string (replaced
everywhere) or a `RegExp`, and `replacement` is a string or a function — the
same forms `String.prototype.replace` accepts.

A common use is project-specific CSS conventions such as media-query
breakpoints and theme selectors:

```javascript
const replacements = [
  // Media-query breakpoints
  ['@mobile',  '@media (max-width: 768px)'],
  ['@desktop', '@media (min-width: 769px)'],

  // Theme selectors
  ['@dark',  ':root[data-theme="dark"]'],
  ['@light', ':root[data-theme="light"]'],
];

syntaxSugar(replacements);   // defaults + your own
```

```svelte
<style>
  @mobile {
    nav { display: none; }
  }
  @dark button {
    background: #333;
  }
</style>
```

```css
/* becomes */
@media (max-width: 768px) {
  nav { display: none; }
}
:root[data-theme="dark"] button {
  background: #333;
}
```

Replacements run in order, so a later entry can build on an earlier one (for
example, expanding `{const}` first and then splitting comma-separated values).

### Replacing the defaults entirely

To run only your own list and skip the built-ins, set `useDefaults: false`:

```javascript
syntaxSugar(myReplacements, { useDefaults: false });
```

## Protecting code from transformation

The shorthands are plain text substitutions, so now and then you'll have a block
where the braces are meant to stay literal — a snippet of source you're showing
your users, or any markup the preprocessor should leave alone.

For that, wrap it in `<svultra:ignore>`. This tag is built in, and its contents
are preserved exactly as written:

```svelte
<svultra:ignore>
  {if user}Hi{/if}      <!-- left untouched, not expanded to {#if} -->
</svultra:ignore>
```

If you have your own component that renders code — say a `<Snippet>` that shows
example markup — register it through the `ignoreTags` option, a map of tag name
→ behavior:

```javascript
syntaxSugar(replacements, {
  ignoreTags: {
    // Escape braces/tags to entities so the contents render as literal text
    'Snippet':        { processTag: true,  escapeCurlyBraces: true },
    // Leave the whole tag and its contents completely untouched
    'svultra:ignore': { processTag: false, escapeCurlyBraces: true },
  },
});
```

- `escapeCurlyBraces: true` turns `{`, `}`, `<`, `>` inside the tag into HTML
  entities, so the contents are shown verbatim instead of being compiled.
- `processTag: false` preserves the entire tag and its contents unchanged —
  this is what makes `<svultra:ignore>` a "do not touch" marker.
- `processTag: true` keeps the tag in place but applies the escaping above to
  its contents.

Whatever you pass is merged on top of the built-in `svultra:ignore`. Tag names
may contain only letters, digits, and colons.

## Notes & gotchas

- **Put it first.** Later preprocessors expect valid Svelte, so `syntaxSugar`
  should lead the chain.
- **Order matters.** Replacements are applied sequentially; defaults run before
  the ones you add.
- **Files under `node_modules` are skipped**, so dependencies are never
  rewritten — except the installed `svultra` package itself, whose kit
  components are written in the sugar.
- The shorthand transforms are plain string/regex substitutions, not a full
  parser. Keep custom replacements specific to avoid matching unintended
  text. The slot/`let:` rewrite is the exception — it parses the template
  and edits the AST.
