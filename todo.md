# svUltra TODO

- The kit hardcodes the site's nav bar height: `HeroBanner.svelte` uses `calc(100vh - 6rem)`
  and `calc(30rem + 6rem)`. Only the layout or the page knows that height. To discuss.

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
