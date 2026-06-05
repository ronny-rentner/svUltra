<svelte:options preserveWhitespace />

<script>
  import { Button, Card } from 'svultra/kit/components';
  import CodeComparison2 from '@components/CodeComparison2.svelte';
  import CodeExample from '@components/CodeExample.svelte';
  import CodeSource from '@components/CodeExample.svelte';
  import ReleasePanel from '@components/ReleasePanel.svelte';
  import ToggleDarkMode from '@components/ToggleDarkMode.svelte';

  import rocketIcon from '@icons/ph/rocket-launch-duotone';

  // ?raw is what the developer wrote; ?preprocessed runs svelte.config.js's
  // preprocess chain at build time so each section can show what the compiler sees.
  import SyntaxSugarDemo                  from './examples/SyntaxSugarDemo.svelte';
  import syntaxSugarSource                from './examples/SyntaxSugarDemo.svelte?raw';
  import syntaxSugarPreprocessed          from './examples/SyntaxSugarDemo.svelte?preprocessed';
  import attributeTransformerSource       from '../../src/kit/components/Button.svelte?raw';
  import attributeTransformerPreprocessed from '../../src/kit/components/Button.svelte?preprocessed';
  import componentStylesSource            from '@components/ReleasePanel.svelte?raw';
  import componentStylesPlain             from '@components/ReleasePanelPlain.svelte?raw';
  import cardSource                       from '../../src/kit/components/Card.svelte?raw';
  import iconWithLabelSource              from '../../src/kit/components/IconWithLabel.svelte?raw';
  import buttonSource                     from '../../src/kit/components/Button.svelte?raw';
  import ClassMergeDemo                   from './examples/ClassMergeDemo.svelte';
  import classMergeSource                 from './examples/ClassMergeDemo.svelte?raw';
  import classMergePreprocessed           from './examples/ClassMergeDemo.svelte?preprocessed';
  import MarkdownDemo                     from './examples/MarkdownDemo.svelte';
  import markdownSource                   from './examples/MarkdownDemo.svelte?raw';
  import markdownPreprocessed             from './examples/MarkdownDemo.svelte?preprocessed';

  //<svultra:ignore>
  const highlightRules = [
    /\{[#:@]?(?:if|elif|elseif|else if|else|each|await|then|catch|snippet|render|html|try|const|key)\b/g,
    /(?:\w+=)?\{\$\w+\}/g,
    /(?:bind|style):(?:\{\w+\}|\w+=\{[^}]+\})/g,
    /@(?:mobile|desktop|dark|light)\b/g,
    /@media \([^)]+\)/g,
    /:root\[data-theme="[^"]+"\]/g,
  ];

  const attributeHighlightRules = [
    ['tooltip',   'data-tooltip'],
    ['placement', 'data-placement'],
    ['ariaLabel', 'aria-label'],
    ['index',     'data-index'],
  ].flatMap(([from, to]) => [
    new RegExp(`(?:${from}|${to})=(?:"[^"]*"|\\{[^}]+\\})`, 'g'),
    new RegExp(`\\{(?:${from}|${to})\\}`, 'g'),
  ]);
  //</svultra:ignore>
</script>

<style>
  /* Layout: sticky nav + readable rhythm for a long single page */
  main > header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--pico-background-color);
    border-bottom: 1px solid var(--pico-muted-border-color);
    margin-bottom: 1rem;
  }

  main > footer {
    margin-top: 3rem;
    padding: 2rem 0;
    border-top: 1px solid var(--pico-muted-border-color);
    color: var(--pico-muted-color);
  }
</style>

<main class="container" id="top">
  <header>
    <nav>
      <ul>
        <li><strong><a href="#top">svUltra</a></strong></li>
      </ul>

      <ul>
        <li><a href="#component-styles">Component Styles</a></li>
        <li><a href="#class-merge">Class Merge</a></li>
        <li><a href="#syntax-sugar">Syntax Sugar</a></li>
        <li><a href="#attribute-transformer">Attribute Transformer</a></li>
        <li><a href="#markdown">Markdown</a></li>
        <li><ToggleDarkMode /></li>
      </ul>
    </nav>
  </header>

  <section>
    <h1>Build Svelte apps with less ceremony.</h1>
    <p>
      svUltra is a set of Svelte 5 preprocessors. Style component trees directly, reduce template noise, and keep
      long-form content in markdown — without changing how your components run. Each section below shows a feature with
      its rendered result next to the source.
    </p>
  </section>

  <!-- ============================ Component Styles ============================ -->
  <section id="component-styles">
    <h2>Component Styles</h2>
    <markdown>
      **What it is.** Style component trees the way you style HTML. Each component file owns its children's styling;
      the whole tree composes without classes leaking up or down. A `Button { ... }` rule in your style block targets
      every `<Button>` instance in the same template — no class on the child, no `:global()` escape. With class-less
      frameworks like PicoCSS, the whole tree stays class-free.

      **How it works.** The preprocessor finds a `Button { ... }` selector, rewrites it to a unique hashed class, and
      applies that class to every Button instance in the same template. The class is repeated once
      (`.Button-XYZ.Button-XYZ`) so consumer rules outrank the component's own internal scoped rules. Hashes are
      stable per-file at build time; nothing extra ships at runtime. Scoping is preserved — the rule only matches
      Button instances in *this* file, not in other components.
    </markdown>

    <h3>Example</h3>
    <markdown>The same UI written with svUltra, then by hand in plain Svelte.</markdown>
    <CodeComparison2
      source={componentStylesSource}
      preprocessed={componentStylesPlain}
      sourceTitle="ReleasePanel.svelte (svUltra)"
      preprocessedTitle="ReleasePanelPlain.svelte (plain Svelte)"
      label="↑ Without svUltra ↑"
    />

    <h3>The cascade across files</h3>
    <markdown>
      Each child component owns its own slice of the cascade. `ReleasePanel` styles `Card { ... }` and reaches
      `footer Button:last-child`; `Card` styles its own `<header>`; `IconWithLabel` styles its inner `Icon`; `Button`
      styles its inner `<button>`. None of the rules collide — each one is scoped to its file.
    </markdown>
    <CodeSource title="Card.svelte">{cardSource}</CodeSource>
    <CodeSource title="IconWithLabel.svelte">{iconWithLabelSource}</CodeSource>
    <CodeSource title="Button.svelte">{buttonSource}</CodeSource>

    <h3>Demo</h3>
    <markdown>
      Same `<Button>` component, two scopes. Inside `ReleasePanel`, the cascade applies (primary-colored header,
      uppercase Discard, sized Publish). Outside, the bare `<Button>` is unstyled — proof that the rules don't leak.
    </markdown>
    <div class="grid">
      <ReleasePanel />
      <div>
        <p><small>Bare <code>&lt;Button&gt;</code>, outside any styled parent:</small></p>
        <Button icon={rocketIcon}>Publish</Button>
      </div>
    </div>
  </section>

  <!-- ============================ Class Merge ============================ -->
  <section id="class-merge">
    <h2>Class Merge</h2>
    <markdown>
      **What it is.** When the class on a component arrives from multiple sources at once — a spread prop bag, a
      static `class="..."` attribute, and a `class:foo` directive — the preprocessor merges them into one class list
      instead of letting the last one overwrite the others. Write each source where it's natural; don't concat by hand.

      **How it works.** The preprocessor finds every class source on each component invocation and rewrites them into a
      single class attribute that combines all values at runtime. Conditional `class:` directives stay reactive — they're
      folded into the merge.
    </markdown>

    <h3>Example</h3>
    <CodeComparison2
      source={classMergeSource}
      preprocessed={classMergePreprocessed}
      sourceTitle="ClassMergeDemo.svelte (source)"
      preprocessedTitle="ClassMergeDemo.svelte (preprocessed)"
    />

    <h3>Demo</h3>
    <ClassMergeDemo />
  </section>

  <!-- ============================ Syntax Sugar ============================ -->
  <section id="syntax-sugar">
    <h2>Syntax Sugar</h2>
    <markdown>
      **What it is.** The preprocessor folds common Svelte template patterns into shorter shorthands. Block syntax
      without the `#`/`:`/`@` prefixes (`{if cond}` instead of `{#if cond}`), the `{prop}` shorthand for `bind:` and
      `style:` directives, the `{$store}` form on components. Everything compiles back to standard Svelte; nothing
      changes at runtime.

      **How it works.** A list of `[search, replace]` rules runs over your Svelte source before the Svelte compiler
      sees it. Sensible defaults handle the common patterns; you can add your own rules or replace the defaults entirely.

      Custom rules in [svelte.config.js](https://github.com/ronny-rentner/svUltra/blob/main/demo/svelte.config.js#L15-L19).
      Full reference of the default rules in [docs/syntax-sugar.md](https://github.com/ronny-rentner/svUltra/blob/main/docs/syntax-sugar.md#default-replacement-reference).
    </markdown>

    <h3>Example</h3>
    <CodeComparison2
      source={syntaxSugarSource}
      preprocessed={syntaxSugarPreprocessed}
      highlight={highlightRules}
      sourceTitle="Write it beautifully"
      preprocessedTitle="Get plain Svelte"
    />

    <h3>Demo</h3>
    <SyntaxSugarDemo />

  </section>

  <!-- ============================ Attribute Transformer ============================ -->
  <section id="attribute-transformer">
    <h2>Attribute Transformer</h2>
    <markdown>
      **What it is.** The transformer allows you to use consistent and natural attribute/prop names like `tooltip` and `placement`
      instead of handling `data-tooltip` and `data-placement` yourself. No mapping to maintain, no escape around the hyphen which
      otherwise can't be a JS identifier and so blocks both prop destructuring and Svelte's `{shorthand}`. The preprocessor handles
      the attributes at build time, so the runtime DOM still carries the required real attribute names.

      **How it works.** The transformer only works on HTML element tags, so a component receiving a `tooltip` prop just passes it down to
      an HTML element with the `{tooltip}` shorthand. The preprocessor then rewrites the attribute to `data-tooltip={tooltip}` which
      is native Svelte syntax.

      Custom attribute transformations can be configured as in
      [svelte.config.js](https://github.com/ronny-rentner/svUltra/blob/main/demo/svelte.config.js#L39-L46).
      For a full reference of pre-defined default transformations check
      [docs/attribute-transformer.md](https://github.com/ronny-rentner/svUltra/blob/main/docs/attribute-transformer.md).
    </markdown>

    <h3>Example</h3>
    <markdown>This example shows a simple Button component enableing a `tooltip` and `placement` prop.</markdown>
    <CodeComparison2
      source={attributeTransformerSource}
      preprocessed={attributeTransformerPreprocessed}
      highlight={attributeHighlightRules}
      sourceTitle="Button.svelte (source)"
      preprocessedTitle="Button.svelte (preprocessed)"
    />

    <h3>Demo</h3>
    <markdown>When using a Button you can then naturally write `tooltip`.</markdown>

    <CodeExample title="Using Button">
      <Button tooltip="Show every item">All</Button>
      <Button tooltip="Items still in progress" placement="bottom">Active</Button>
      <Button tooltip="Items already completed">Done</Button>
    </CodeExample>

    <Button tooltip="Show every item">All</Button>
    <Button tooltip="Items still in progress" placement="bottom">Active</Button>
    <Button tooltip="Items already completed">Done</Button>
  </section>

  <!-- ============================ Markdown ============================ -->
  <section id="markdown">
    <h2>Markdown</h2>
    <markdown>
      **What it is.** Lets you write markdown inline in your Svelte components or load it from a separate `.md` file.
      The component stays focused on layout; the prose lives in a format anyone can edit. The `.md` file is a build
      dependency, so saving it triggers a rebuild.

      **How it works.** The preprocessor scans your Svelte source for the `markdown` tag. With a `file` attribute, it
      reads the named markdown file at build time. With body content between the tags, it renders the inline markdown.
      Both modes replace the tag with the rendered HTML before the Svelte compiler runs.
    </markdown>

    <h3>Example</h3>
    <CodeComparison2
      source={markdownSource}
      preprocessed={markdownPreprocessed}
      sourceTitle="MarkdownDemo.svelte (source)"
      preprocessedTitle="MarkdownDemo.svelte (preprocessed)"
    />

    <h3>Demo</h3>
    <article>
      <MarkdownDemo />
    </article>
  </section>

  <footer>
    <p>
      svUltra — Svelte 5 preprocessors for component styling, class merging, attribute transforms, syntax sugar, and
      markdown. Every example on this page is compiled through them.
    </p>
  </footer>
</main>
