# svUltra TODO

- Structural pseudo-classes in a scoped style count elements a child component renders.
  Verified in carbon.berlin's `Home.svelte`: `section:nth-of-type(2)` styled the page's first
  own section, because `HeroBanner`'s `<section>` counts as the first, and
  `section:first-of-type` matched nothing at all. Svelte emits the pseudo-class unchanged next
  to the scope class and warns about neither, so a page has to know which elements the
  components it uses render. Not reported upstream as far as a search shows; `:nth-child(An+B
  of S)` would let Svelte express the correct scoping. A preprocessor could work around it:
  stamp a per-file marker class on the page's own elements, as component-styles already does
  for component tags, and rewrite `section:first-of-type` to
  `section:nth-child(1 of section.svu-<hash>)`.

- Two kit components read a CSS custom property they never set, leaving it to the parent:
  `Dialog.svelte:132` `max-width: var(--max-width, unset)` and `Main.svelte:14`
  `min-height: calc(100vh - var(--page-full-height-offset, 12.5rem))`. The strict CSS rule in
  `AGENTS.md` forbids that shape. Research and clean up.

- `Main.svelte` has no full-width mode. `class:container={1}` is the class-merge hack to keep
  the class past the spread, not a switch: a page cannot turn the container off, and
  `container={0}` lands as a plain attribute. Give it a real prop, `container = true`, so a
  landing page can span the viewport; until then a page undoes `max-width` and `padding` by
  hand (aylinschaer.de's `Landing.svelte`).

- Hot-reload preprocessor implementation changes. Changing preprocessor code must update
  rendered output even when the Markdown and Svelte input files have not changed.
  Use the existing persistent `environment.runner.import(url)` and HMR invalidation.
  Ensure svUltra's preprocessor sources are handled by the runner rather than externalized
  to native Node imports. Supply stable async hooks through Svelte's public preprocessor
  interface; each invocation obtains the current implementation from the runner and calls
  it. Svelte can retain those hooks without retaining an obsolete implementation.
  Track which files each preprocessor processes and reads, including `<markdown file="…">`
  inputs, and which components consume them. When implementation code or its dependencies
  change, invalidate the affected runner modules and all files processed or read by that
  preprocessor, then recompile their consuming components. Complete runner invalidation
  before reprocessing consumers. Accept HMR updates at the integration entry so unrelated
  modules remain cached. Use public Vite and Svelte APIs; do not patch
  `@sveltejs/vite-plugin-svelte`, use temporary environments, clear the entire runner cache,
  or restart the dev server. Keep the existing build preprocessing path.
  Verify with a directly imported `.md` file and a component using `<markdown file="…">`:
  change only the Markdown preprocessor's line-break handling and confirm both rendered
  outputs update without touching their inputs or restarting, while unrelated modules
  retain their state.
  References: [Vite environments](https://vite.dev/guide/api-environment-frameworks),
  [Vite HMR](https://vite.dev/guide/api-hmr),
  [Svelte preprocessors](https://svelte.dev/docs/svelte/svelte-compiler#preprocess).
