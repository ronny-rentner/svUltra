# Research: asynchronous content loading and transitions in svUltra

**Status: in progress — consultation document, not an implementation plan or an approved API.**

**Snapshot: 23 September 2026.** The examples below distinguish inspected application code, previous drafts, documented framework features, and new alternatives. No Loader or Transition implementation is selected by this document.

## 1. The question for the reviewing LLM

How should a small Svelte support library load and replace asynchronous content inside an existing page, retaining the current view until its replacement is ready, with a simple authoring interface and without duplicating its router?

The immediate example is an article overview and individual articles. The broader goal is to let **svUltra and the Django/Svelte starter efficiently support directories of Markdown content**, using their existing Markdown preprocessor, Svelte compilation, lazy imports, and routing. Aylin's site is the working example, not the boundary of the feature.

The central design problem is ownership: **which component controls when the old overview or article is removed, and when the new body, headline, and date become visible together?** Knowing that an import is pending is insufficient if an outer conditional has already removed the old view.

**This is not a two-option comparison.** Stable versus experimental compilation is one compatibility distinction. Local state, writable stores, context, callback props, bindings, snippets, await blocks, loader functions, and component methods offer different choices that can also be combined. Sections 6.6–6.8 examine those details; section 7 compares wider architectural approaches.

Please evaluate the alternatives rather than assume that the most recent draft is the answer. In particular:

1. Start with the syntax that a page author would write in `Articles.svelte`.
2. Explain what actually preserves the old rendered view, including its metadata.
3. Compare the state, communication, loading, and rendering choices individually and in useful combinations; identify which require experimental compilation.
4. Identify the smallest implementation that fulfills the behavior, including direct links and rapid changes.
5. Challenge claims about automatic coordination with concrete Svelte semantics or a small reproducible example.
6. Respect the rejected designs listed below. If reconsidering one, identify the requirement or new evidence that justifies reconsideration.

### 1.1 The two documentation links supplied by the project owner

These are central to the consultation and should be read directly:

1. **Svelte `$effect`:** <https://svelte.dev/docs/svelte/$effect/llms.txt>
2. **Svelte await expressions:** <https://svelte.dev/docs/svelte/await-expressions/llms.txt>

The owner questioned whether `$effect()` is appropriate and whether the new async features could remove custom machinery. Enabling `compilerOptions.experimental.async` has **not** been approved.

## 2. Project context and existing building blocks

### 2.1 Architecture

1. Django serves the application shell and backend. The frontend is a Vite/Svelte SPA using svUltra, not a SvelteKit application.
2. svUltra provides a route generator, Router, Main, LoadingOverlay, Markdown preprocessing, and other reusable components and actions.
3. Page files live under `frontend/src/pages/`. The route generator emits a map of paths to lazy page imports.
4. Aylin has approximately 150–160 Markdown articles. The same `Articles.svelte` page handles both `/articles` and `/articles/<id>`.
5. A separate Markdown index plugin writes the overview metadata. Individual article bodies compile into Svelte components and are imported lazily.
6. A future page could keep a sidebar or article navigation visible while replacing only the article area. The loading UI must support that scope.

The installed Svelte version inspected during this investigation was **5.57.0**. Aylin's Svelte configuration currently has `compilerOptions: {}`. The stable and experimental examples discussed here must not be conflated merely because the installed compiler recognizes both.

### 2.2 Source map

Absolute paths identify the working checkouts. Line numbers are snapshot references, not permanent interfaces. Relevant excerpts follow so this document remains useful without filesystem access.

| Source | Responsibility and relevant location |
| --- | --- |
| `/home/ronny/Projects/sites/aylinschaer.de/frontend/src/pages/Articles.svelte` | Glob at line 6; URL-derived ID and entry at lines 11–13; import effect at line 25; overview/article conditional at line 72 |
| `/home/ronny/Projects/sites/aylinschaer.de/frontend/svelte.config.js` | `.svelte` and `.md` extensions; svUltra preprocessing; no experimental async flag |
| `/home/ronny/Projects/sites/aylinschaer.de/frontend/vite.config.js` | Markdown index plugin; `/articles` → `/articles/*` route rename |
| `/home/ronny/Projects/sites/aylinschaer.de/frontend/src/generatedRoutes.svelte.js` | Generated lazy page import map |
| `/home/ronny/Projects/js/svUltra/src/kit/router/Router.svelte` | `navigate(path)` at line 63; `resolveRoute(path)` at line 84; `updateComponent(event)` at line 107; `fadeTimeout()` at line 241 |
| `/home/ronny/Projects/js/svUltra/src/kit/components/Main.svelte` | Consumes the Router's loading context and applies the page opacity transition |
| `/home/ronny/Projects/js/svUltra/src/kit/components/LoadingOverlay.svelte` | Loading presentation, with viewport and `partial` modes |
| `/home/ronny/Projects/js/svUltra/src/preprocessors/markdown.js` | `renderMarkdown(markdownText, useAccordion = false)` at line 108; `renderMarkdownComponent(markdownText)` at line 121; `processMarkdownTags(...)` at line 176; preprocessor `markup({ content, filename })` at line 232 |
| `/home/ronny/Projects/js/svUltra/src/kit/markdown/generateIndex.js` | `generateMarkdownIndexPlugin(...)` at line 13; `generateMarkdownIndexEntries(directory, options)` at line 93 |
| `/home/ronny/Projects/js/svUltra/src/kit/router/generateRoutes.js` | `generateRoutesPlugin(userOptions = {})` at line 8; `generateRoutes(dir, options, commonDir, baseRoute = '')` at line 117 |

### 2.3 Markdown compilation already works

The configured extensions are:

```js
extensions: ['.svelte', '.md']
```

For a standalone Markdown file, the existing preprocessor takes this path:

```text
Vite loads a .md module
  → markdownPreprocessor().markup({ content, filename })
  → renderMarkdownComponent(content)
  → gray-matter removes frontmatter from the rendered body
  → renderMarkdown(body) uses the existing Marked renderer
  → Svelte compiles the returned markup
  → the module exports a Svelte component as default
```

The `.svelte` path still processes `<markdown>` tags through `processMarkdownTags(...)`, which also uses `renderMarkdown(...)`. There is no need to introduce a second Markdown parser or manually generate hundreds of `.svelte` files to solve the loading problem.

The project uses a syntax preprocessor: examples such as `{if ...}`, `{each ...}`, and `{render ...}` are deliberate shorthand. Standard Svelte forms such as `{#if ...}` are used in documentation examples below. These differences are not evidence that the existing pages are invalid.

Generated Svelte components remain relevant for Markdown extensions, including a potential image slider. The precise image handling is a separate unresolved task; a body module resolving does not prove its images have downloaded or decoded.

### 2.4 Metadata and content are separate

The index is an ordinary generated JavaScript module exporting records such as:

```js
export const entries = [
  { id: '1', title: 'A headline.', excerpt: 'An excerpt.', date: '2026-09-21' },
  { id: '2', title: 'Another headline.', excerpt: 'Another excerpt.' }
];
```

This is illustrative data, not copied article content. The index holds metadata, not imported body components or hundreds of full-size image previews. Frontmatter can override title and description independently. Dates reach the generated module through its existing serialization; changing date parsing is outside this investigation.

The article page independently imports its body:

```js
const articles = import.meta.glob('../markdown/articles/*.md');
const module = await articles['../markdown/articles/1.md']();
const Article = module.default;
```

Vite's glob produces loader functions by default; invoking one loads its module. The `eager` alternative imports the matches directly. This provides the available content and loading mechanism, not a policy for retaining the current UI. [Vite glob imports](https://vite.dev/guide/features#glob-import).

## 3. The current behavior and the actual defect

### 3.1 Normal route changes

The relevant Router flow is:

```text
An ordinary internal link is intercepted
  → navigate(path)
  → history.pushState(...)
  → dispatch the internal routechange event
  → updateComponent(event)
  → resolveRoute(path)
```

`resolveRoute(path)` returns a function from the generated route map. When it differs from `_currentComponent`, the Router:

1. Assigns `_currentComponent` before publishing the new path.
2. Sets `isLoading` to true.
3. Publishes `currentPath` and updates its internal pathname.
4. Awaits the page import, leaving the current page mounted.
5. Optionally waits for `window.config.loadingDelay`, a debugging setting.
6. Inside `currentComponent.update(...)`, scrolls to the top for normal navigation, excluding `PopStateEvent` traversal.
7. Returns the module's default export from that callback, publishing the replacement component. This does not await its rendered DOM.
8. Clears `isLoading` and marks initialization complete.

The assignment order is intentional. Earlier proposals moved assignments or added parallel route state without respecting it; those changes were rejected. This document is not permission to refactor that sequence.

### 3.2 Same-page article navigation

The wildcard route maps `/articles`, `/articles/1`, and `/articles/2` to the **same import function** for `Articles.svelte`.

`updateComponent(event)` still runs. The function identity comparison selects its `else` branch:

```js
} else {
  // Keep the pathname current when the same page (component) handles a different URL.
  currentPath.set(path);
  _currentPath = path;
}
```

Thus the Router publishes the correct URL. It does not start its page-loading transition, replace the page component, or await the Markdown import that the page subsequently initiates.

The wildcard route itself is working. The problem is the independent async work inside its persistent page.

### 3.3 Current Articles.svelte loading code

The following is the actual relevant script, with imports and unrelated styling omitted:

```js
const articles = import.meta.glob('../markdown/articles/*.md');
const routePath = '/articles';

let { meta, ...rest } = $props();
// The Router publishes the next path before unmounting this page.
let id = $derived($currentPath.startsWith(`${routePath}/`) ? $currentPath.split('/').pop() : '');
let entry = $derived(entries.find(entry => entry.id === id));
let loadMarkdownContent = $derived(articles[`../markdown/articles/${id}.md`]);
let Content = $state();

$effect(() => {
  if (!loadMarkdownContent) {
    return;
  }
  loadMarkdownContent().then(module => {
    Content = module.default;
    window.scrollTo(0, 0);
  });
});

meta({
  title: 'Article overview',
  description: 'Article overview'
});
```

The relevant markup is:

```svelte
<Main {...rest}>
  {if id}
    {if Content}
      <div>
        <p><strong><a href={routePath} {onclick}>← Article overview</a></strong></p>
        {if entry.date}<time>{entry.date?.substring(0, 10)}</time>{/if}
        <h1>{entry.title}</h1>
        <Content />
      </div>
    {/if}
  {else}
    <h1>Articles</h1>
    <ul>
      {each entries as entry}
        <li>
          <hgroup>
            {if entry.date}<time>{entry.date?.substring(0, 10)}</time>{/if}
            <h4><a href="{routePath}/{entry.id}">{entry.title}</a></h4>
            <p>{entry.excerpt}</p>
          </hgroup>
        </li>
      {/each}
    </ul>
  {/if}
</Main>
```

### 3.4 What fails

| Situation | What the current code does | Required distinction |
| --- | --- | --- |
| First overview → article | `id` changes immediately; overview disappears; `Content` is unset until import resolution | Preserve the overview while preparing the article |
| Direct link to an article | Article page mounts before its Markdown body is ready | Show an initial loading state; never substitute the overview |
| Article A → article B | `entry` switches immediately while `Content` can still be A | Replace body and metadata coherently |
| Overview → article after another article loaded | The old `Content` is still stored | Do not present that old body under the new headline |
| Two imports resolve out of order | Each callback assigns `Content` without checking whether it is still wanted | Earlier work must not overwrite the newer selection |
| Leaving Articles while its import is pending | Its callback can still run, including the scroll side effect | Removed or superseded work must not alter the new page |

The owner observed the first failure: the overview disappears, the footer becomes visible because the page contracts, and the article then pushes it down again. This is not just a missing spinner.

The actual page also imports `isLoading` but does not use it, and still sets static overview metadata through `meta()`. A complete design must explain where per-article metadata belongs; the present code is not evidence that this is solved.

### 3.5 Scroll and browser history constraints

The site now scrolls the document rather than `#app`. The Router distinguishes its internal `routechange` event from native `popstate`, preserving the event-based design and avoiding its top reset on browser traversal.

The article overview link has an intentional policy: use browser back only when the immediately previous history entry is the overview; otherwise use the normal link. Its handler is named `onclick`:

```js
function onclick(event) {
  // Use browser back only when the previous entry is the article overview.
  const previous = navigation.entries()[navigation.currentEntry.index - 1];
  if (!previous || new URL(previous.url).pathname !== routePath) return;
  event.preventDefault();
  event.stopPropagation();
  navigation.back();
}
```

Earlier discussion considered smooth scrolling to an article but found the visual sequence confusing: a clicked headline disappears, the page scrolls, and the headline returns from elsewhere. Current article code uses `window.scrollTo(0, 0)` on import completion.

Another reported issue concerned back/forward revisits not preserving a newly adjusted scroll position. No browser bug was established. Further history interception changes were explicitly deferred. The loading solution should preserve this distinction between new navigation and traversal rather than silently redesign it.

## 4. What the existing transition system actually guarantees

### 4.1 Main and the 400 ms delay

`Main.svelte` reads the Router's `isLoading` store through context. Its relevant CSS is:

```css
main {
  min-height: calc(100vh - var(--page-full-height-offset, 12.5rem));
}
main.isLoading {
  opacity: 0 !important;
  /* Match Router.svelte's fadeTimeout() (400 ms): the old content fades out
     before the loading overlay appears if loading is still in progress. */
  transition: opacity 0.4s linear;
}
```

The Router's `fadeTimeout()` contains the corresponding explanation:

```js
async function fadeTimeout() {
  //Only after 400 ms we do show the LoadingOverlay when navigating between pages.
  //The hope is that it never actually takes so long to load the new page.
  //In those 400 ms we fade out the old page.
  //Keep this delay aligned with Main.svelte's 0.4s opacity transition.
  return new Promise(resolve => setTimeout(resolve, 400));
}
```

This relationship must survive any reuse. The owner explicitly requested preserving the original explanation and attaching new clarification to it, not replacing it.

### 4.2 Limits of the current system

1. **400 ms is the overlay threshold, not a mandatory minimum load duration.** A ready page replaces the old component immediately.
2. The Router renders one current page. Its implementation does not establish a deliberate two-page crossfade with overlapping old and new Main elements.
3. Main's transition declaration is on the loading class. A symmetrical fade-in is not established simply by assuming the class removal reverses the fade-out.
4. Main's viewport-related minimum height does not retain the height of a long overview.
5. The Router waits for the page module, not arbitrary imports or effects started by the mounted page.
6. Setting the global `isLoading` store changes appearance; it does not stop `Articles.svelte` from changing its `{if id}` branch.

These are code observations. The owner's desired fade-over experience is a design goal, not proof that the present Router already implements every part of it.

### 4.3 LoadingOverlay is reusable presentation

`LoadingOverlay.svelte` already accepts:

```js
let { showLogo = true, showMain = false, partial = false, text = "Loading", ...rest } = $props();
```

Its default root is fixed with `inset: 0`. The `partial` class switches to absolute positioning with `inset: 0` and a translucent background. A positioned enclosing element can therefore bound it to a content region.

It does not initiate imports, preserve old content, delay itself, or define when an update is complete. Its absolute positioning also supplies no intrinsic height. The initial empty region and a very tall retained overview need deliberate treatment; centering a spinner over an entire tall region could put it outside the visible area.

The declared `...rest` is not currently forwarded to the overlay root. A proposal relying on passing root styles or attributes must account for that actual implementation. This observation is not a request to change the component now.

### 4.4 Initial Router loading is separate

Before `initialized` becomes true, Router renders LoadingOverlay directly, outside its normal Layout/page branch. Main is optional and the first page has not necessarily mounted. This explains why Router needs loading presentation independent of Main's opacity class.

The initial article body is a second loading step after `Articles.svelte` mounts. Finishing Router's page import therefore does not finish that article load. Reusing the initial Router overlay requires an explicit coordination decision, not assuming that it already observes the nested import.

## 5. Requirements, preferences, and the discussion so far

### 5.1 Behavior to achieve

1. Retain the currently displayed overview or article until replacement content is ready.
2. Handle an initial direct link independently: there is no old content to retain.
3. Replace the visible article body, headline, and date together; define when `meta()` updates.
4. Avoid the temporary empty layout and footer flash. Do not confuse this with eliminating the legitimate height difference between a long overview and a short article.
5. Allow a local content region to load while a sidebar or navigation remains visible.
6. Reuse LoadingOverlay where it fits, with a delayed indicator for subsequent slow loads.
7. Handle rapid changes and leaving the page without stale results or stale scrolling.
8. Keep the normal routing and history behavior intelligible.
9. Give site authors a short, readable API rather than repeating this machinery on every page.

### 5.2 Explicit implementation constraints

1. No broad Router refactor. Any necessary Router change needs an explanation of why a sensible smaller alternative is insufficient.
2. Do not add a parallel pathname mechanism beside `currentPath`. Earlier `currentRoutePath`/`currentRouteSuffix` state was removed for that reason.
3. A component called Loader should perform the loading. Pass it the import function, not a promise already started by the page.
4. The desired invocation is directly based on the existing glob:

   ```svelte
   <Loader load={articles[`../markdown/articles/${id}.md`]} />
   ```

5. Inside Loader, prefer `await load()`. Do not add a `request` alias or conditional undefined fallback without a demonstrated need.
6. An undefined loader is invalid input, not a signal to silently display the overview. An intentional overview branch and invalid article navigation are different cases.
7. The owner explicitly rejected adding `try/catch` to the Loader draft. Error behavior remains a design question, not permission to swallow a failed import.
8. Use `isLoading` for loading state and `LoadedComponent` for the resolved component in new drafts.
9. Do not enable experimental compiler options without discussing their implications and receiving approval.
10. No manual duplicate compilation pipeline, browser-side Svelte compiler, or mass generation of source-page files is needed for the current imports.
11. Favor existing Svelte facilities and a small amount of necessary state over extra wrappers, protocols, and speculative configurability.

### 5.3 Earlier proposals and why the discussion moved on

| Proposal | Assessment or response |
| --- | --- |
| `{if id && Content}` with overview as the other branch | Rejected: a direct article link would temporarily show the overview |
| Copy Router-style loading logic into Articles | Rejected as the reusable solution: duplicates coordination and adds too much page code |
| Let Articles set global `isLoading` | Useful experiment, but appearance alone cannot preserve content and the scope is too broad for a future sidebar |
| Have Router wait for a page-ready signal | Owner disliked making routing depend on pages remembering to signal completion |
| Have the page ask Router to perform an import/transition | Considered feasible in principle; no acceptable small design established |
| Treat every article suffix as a full page navigation | Considered; forcing remounts does not by itself make Router await the nested import |
| Make every Markdown body a routed page with a shell | Considered; shell ownership, `meta()`, and avoiding duplicated structure remain the questions |
| `<Loader promise={...}>` | Rejected: page starts the load and Loader only observes it |
| `$derived(loadArticle(id))` as a promise passed down | Rejected for the same authoring concern |
| `{snippet children(article)}` as the page-facing API | Explicitly disliked; do not present the same interface under a new name as if accepted |
| Extract the full view into separate components | Discussed as an alternative to snippets; not selected |
| New experimental async compilation | Researched, not approved |
| `<Transition>` around normal markup, with a Loader at the body position | Latest authoring sketch; how it preserves the whole view remains unproven |

### 5.4 The stable Loader draft and its precise limitation

A draft kept the previously imported component while starting the next import. Its core was:

```svelte
<script>
  let { load, ...rest } = $props();
  let LoadedComponent = $state();
  let isLoading = $state(true);

  $effect(() => {
    let active = true;

    async function loadContent() {
      isLoading = true;
      const module = await load();

      // A superseded effect run must not replace the current selection.
      if (active) {
        LoadedComponent = module.default;
        isLoading = false;
      }
    }

    loadContent();
    return () => { active = false; };
  });
</script>
```

The fuller draft rendered the retained component in a positioned region, faded it using a loading class, showed `LoadingOverlay partial showLogo={false}` after 400 ms on subsequent loads, and showed an initial placeholder when no component existed. It also proposed `aria-busy` and `inert` during loading; these were draft interaction choices, not settled policy.

The draft was checked through the project's preprocessor and Svelte compiler in memory. That established syntactic compatibility, not correct runtime transitions.

Important limitations:

1. The `active` variable belongs to one effect run. Cleanup invalidates that run when a new load is selected or the component is removed; it does not cancel the import.
2. A completion in an already unmounted Loader does not mount its content into another Loader. The relevant visible race is chiefly multiple requests within the same surviving instance; stale side effects also matter.
3. If this Loader lives inside the page's current `{if id}`, the overview is still removed before Loader can preserve anything.
4. If headline and date remain outside Loader and follow the new URL immediately, retaining only the body still produces mixed content.
5. With no error handling, import rejection is not a solved terminal loading state. Do not describe this as a complete production design.

### 5.5 The latest ideal authoring sketch

The owner asked to design the page syntax first, temporarily setting implementation details aside. This was the resulting sketch, **not working code or an existing API**:

```svelte
<Main {...rest}>
  <Transition>
    {if id}
      <p><a href={routePath} {onclick}>← Article overview</a></p>
      {if entry.date}<time>{entry.date.substring(0, 10)}</time>{/if}
      <h1>{entry.title}</h1>
      <Loader load={articles[`../markdown/articles/${id}.md`]} />
    {else}
      <h1>Articles</h1>
      <ul>
        {each entries as entry}
          <li>
            <a href="{routePath}/{entry.id}">{entry.title}</a>
            <p>{entry.excerpt}</p>
          </li>
        {/each}
      </ul>
    {/if}
  </Transition>
</Main>
```

Intended division: Loader imports and renders the body; Transition preserves and transitions the whole chosen region. A sidebar can sit outside Transition.

The subsequent suggestion was for Loader to report pending/completed work through Svelte context. **That explains communication, but not deferred rendering.** A context value can carry state or a controller; it is not an alternative to state and does not automatically freeze a parent's conditionals or their live dependencies.

A valid implementation must explain how the new Loader is discovered and started without prematurely losing the old branch. Retaining a reference to a snippet also does not automatically snapshot the values it reads. This unresolved point prompted the request for external consultation.

## 6. Research established from primary documentation

### 6.1 Stable effects

`$effect` supports side effects such as requests, but the docs discourage using effects to maintain values that can simply be derived. Its synchronous reads determine dependencies; cleanup runs before reruns and on removal. An async inner function permits a synchronous cleanup return. Effects run after DOM updates, so an effect cannot be assumed to preserve a branch already removed by its parent's render. [Owner-supplied `$effect` documentation](https://svelte.dev/docs/svelte/$effect/llms.txt).

For this problem, the import is async work; its resolved component is not an ordinary synchronous `$derived`. Whether an effect is the clearest stable implementation is still a design choice. Avoid an argument that all effects are wrong or that an effect provides rendering suspension.

### 6.2 Stable await blocks

Svelte's existing `{#await}` block supports promise branches and dynamic imports without the new async compiler flag. It can render a module's default component when ready. A pending branch is not, by itself, a policy to retain the previous fulfilled UI. [Svelte await blocks](https://svelte.dev/docs/svelte/await/llms.txt).

A proposal using this facility must show how the entire overview/article replacement is coordinated. Hiding a promise inside a library is different from requiring the page author to construct one, which was rejected.

### 6.3 Experimental await expressions

New await locations in script, derived expressions, and markup require `experimental.async`. The docs describe synchronized dependent updates, initial pending presentation, later pending counts, and `settled()` for async completion. They also warn that experimental behavior can change outside major releases and that block-effect ordering relative to `$effect.pre` changes. The Router already uses `$effect.pre`. [Owner-supplied await-expression documentation](https://svelte.dev/docs/svelte/await-expressions/llms.txt).

This is a concrete candidate for reducing manual coordination. It is not proof that the exact Transition/Loader sketch atomically retains every sibling and ancestor. That placement must be demonstrated. The docs' stated future removal of the flag in Svelte 6 is not a reason to treat it as already stable.

### 6.4 Boundaries

`<svelte:boundary>` is not synonymous with an experimental Loader. Boundary error handling and the async pending facilities have different roles. Its `pending` snippet handles initial async rendering; later async activity can be observed with `$effect.pending()`. Error boundaries do not catch every arbitrary asynchronous callback or event-handler failure. They also provide neither overlay geometry nor an animation by themselves. [Svelte boundaries](https://svelte.dev/docs/svelte/svelte-boundary/llms.txt).

A small native-async draft compiled in memory with the experimental flag:

```svelte
<script>
  let { load } = $props();
</script>

<svelte:boundary>
  {@const LoadedComponent = (await load()).default}
  <LoadedComponent />
  {#snippet pending()}<p>Loading…</p>{/snippet}
</svelte:boundary>
```

This was a compilation experiment, not an integrated runtime test. A boundary created inside an already-switched article branch does not demonstrate retention of the preceding overview.

### 6.5 Context, snippets, keys, and transitions

1. **Context** exposes ancestor-owned values to descendants and can carry reactive state. It does not define when a parent commits a DOM change. [Context documentation](https://svelte.dev/docs/svelte/context/llms.txt).
2. **Snippets** are renderable markup values and can reference surrounding variables. Retaining a snippet is therefore not equivalent to retaining an immutable article selection. [Snippet documentation](https://svelte.dev/docs/svelte/snippet/llms.txt).
3. **Key blocks** recreate their contents when the key changes. Remounting is not waiting for nested work to finish. [Key-block documentation](https://svelte.dev/docs/svelte/key/llms.txt).
4. **Transitions** can keep outgoing block DOM until its outro completes. An outro's lifetime is not inherently the lifetime of an arbitrary import. [Transition documentation](https://svelte.dev/docs/svelte/transition/llms.txt).

These are useful ingredients. None should be presented as a complete coordination solution without showing where the requested and displayed selections are kept consistent.

### 6.6 Independent choices within a concrete solution

| Design question | Alternatives to compare |
| --- | --- |
| Where is the retained result owned? | Articles, Loader, Transition, a per-region helper/store, Router |
| How is it represented reactively? | Component `$state`, a `.svelte.js` state object, a writable/readable/derived store, framework-managed await state |
| How do components communicate? | Ordinary props, callback functions, bindings, context carrying state/functions/stores, explicit component methods, events |
| What starts the work? | An effect responding to `load`, an await block, an explicit loader function call, navigation handling, native async expressions |
| Who writes the markup? | Loader renders a component; the page supplies a snippet; the parent renders an exposed result; a boundary coordinates ordinary child markup |
| What can change while waiting? | Requested URL only; loading feedback; persistent navigation; or, incorrectly, metadata belonging to the next article |
| When is the new view committed? | Explicit resolved-result assignment; promise branch change; a parent callback; browser/framework-coordinated completion |

For example, **context plus a writable store plus an effect plus ordinary component rendering** is one possible combination. **Local `$state` plus callback props plus an await block** is another. Naming context does not settle the state representation; choosing snippets does not settle who starts imports.

The following sketches are API studies, not complete code. Names such as `displayedArticle`, `onloaded`, and `createArticleLoader` are illustrative, not proposed additions already accepted by the owner. Each study identifies its missing retention contract rather than hiding it behind short markup.

### 6.7 Detailed state, communication, and loading options

#### 6.7.1 Local `$state` with ordinary props

**Shape:** one owner holds `LoadedComponent`, `isLoading`, and the metadata corresponding to the displayed component. It passes presentation inputs downward:

```svelte
<Transition {isLoading}>
  <!-- This value describes the displayed body, not the newest requested ID. -->
  <h1>{displayedArticle.title}</h1>
  <LoadedComponent />
</Transition>
```

1. **Loading and commit:** the owner starts the import and replaces the displayed result only when ready. The outer overview/article conditional must also use the displayed selection, not immediately switch on requested `id`.
2. **Benefit:** explicit data flow and no store/context setup. All fields have one component lifetime.
3. **Cost:** if Articles owns everything, its script grows; if Loader owns everything, the markup needs a component or snippet contract. Passing loading status alone does not transfer ownership of the retained view.
4. **Evidence:** current page uses local state; the Loader draft explores moving it. `$state` is reactive storage, not automatic async sequencing. [Svelte state](https://svelte.dev/docs/svelte/$state/llms.txt).

#### 6.7.2 A reusable `.svelte.js` state object or factory

**Shape:** a helper owns the state and load operation. A proposed factory signature could be `createArticleLoader()` returning state and a `load(importFunction)` operation. This is a stateful helper, not a function that merely renames `import()`.

1. **Loading and commit:** the helper retains its last result, invokes the import, and publishes the completed selection. The page still needs to connect requested changes and render the completed result.
2. **Benefit:** separates reusable behavior from page HTML without requiring a store subscription API.
3. **Cost:** a factory/helper can add ceremony for one caller; a module singleton would couple unrelated regions. Initial selection, cleanup, and metadata delivery must have an explicit caller contract.
4. **Important detail:** passing a primitive's current value into a function is not passing a live variable. Getter functions or a reactive object can preserve access to changing state. This must be designed rather than patched with a second set of synchronization effects. [State across functions and modules](https://svelte.dev/docs/svelte/$state/llms.txt).
5. **Status:** not implemented; compare its entire page usage against one Loader component before introducing it.

#### 6.7.3 A per-region writable store passed as a prop

**Shape:** a region creates a store and passes the same object to loading and presentation components. The proposed wiring, not a complete usage example, is:

```svelte
<Loader {load} state={articleState} />
<Transition state={articleState}>
  <!-- The view would read the retained result from this store. -->
</Transition>
```

1. **Loading and commit:** one designated writer publishes the completed body and matching metadata. The store can retain the previous value throughout a new request.
2. **Benefit:** explicit sharing between siblings; familiar to the existing Router; plain JavaScript helpers can participate.
3. **Cost:** the two components now share a contract. A store containing only `isLoading` is insufficient. Several writable fields also permit several writers unless responsibility is kept clear.
4. **Detail:** creating a fresh store per region is a different design from importing a global writable. Neither choice follows automatically from using `writable()`.
5. **Research:** Svelte stores provide `set`/`update` and component subscriptions. They do not add latest-request handling or a view-retention policy. [Svelte stores](https://svelte.dev/docs/svelte/stores/llms.txt).

#### 6.7.4 An asynchronous derived or readable store

**Shape:** a store subscribes to a requested selection, starts its load, and publishes the next resolved view. Consumers observe its result rather than receiving callbacks.

1. **Loading and commit:** Svelte's `derived` store callback can publish asynchronously through `set` and return cleanup for reruns/unsubscription. This is distinct from `$derived(await ...)`, which belongs to experimental async compilation. [Derived stores](https://svelte.dev/docs/svelte/stores/llms.txt).
2. **Benefit:** selection-to-result behavior can be packaged in a familiar reactive interface and retain its last emitted result.
3. **Cost:** converting the page's already-derived ID/import function into another input store adds plumbing. Deriving directly from global `currentPath` would couple a generic loader to URL parsing. A stale import still needs invalidation; cleanup is not cancellation of dynamic import.
4. **Status:** documented primitive, no project prototype. The question is whether this removes more work than it introduces compared with a component effect.

#### 6.7.5 A shared module-level writable or reactive object

**Shape:** both Loader and Transition import one shared state object or store. The existing Router's exported `isLoading` is the concrete nearby example.

1. **Loading and commit:** designated functions update shared loading state and, if designed, its displayed result.
2. **Benefit:** very short component call sites; no explicit prop chain.
3. **Cost:** two local loaders are coupled by default. One completion can clear another load's indication, and one result slot cannot represent two independent regions. Making a registry to compensate adds another mechanism.
4. **Scope detail:** normal module state in one page is not automatically shared with another browser tab. Its immediate problem here is multiple consumers within the same running app, not cross-tab interference.
5. **Status:** the Router uses global state for global navigation. Whether a new local feature should share it is an ownership decision, not a reason to replace the existing Router store.

#### 6.7.6 Context containing state, a store, or functions

**Shape:** Transition provides a per-region value; descendants retrieve it. The value could be a writable store, a reactive object, or explicit start/commit functions. Context is the access path, not a competing state primitive.

1. **Loading and commit:** Loader calls into the nearest provider or updates its defined store. The provider decides which resolved selection is displayed.
2. **Benefit:** no prop threading through unrelated wrappers; the component tree can define which loading region receives notifications.
3. **Cost:** implicit coupling and lifecycle rules. Two descendants sharing one region need a policy if both load; a bare true/false notification does not settle that policy. Do not add a general request registry until the actual composition needs it.
4. **Retention issue:** context can report a load after a branch has changed, but cannot reverse that removal. The provider still needs a way to retain the old selection and start the new import. The ideal markup in section 5.5 does not demonstrate this mechanism.
5. **Status:** documentation reviewed; context is already used by Router/Main. No arbitrary-child retention implementation has been proven. [Svelte context](https://svelte.dev/docs/svelte/context/llms.txt).

#### 6.7.7 Callback functions passed down as props

**Shape:** a child performs the load and reports completion to its parent. An illustrative interface is:

```svelte
<Loader {load} onloading={startLoading} onloaded={showArticle} />
```

1. **Loading and commit:** `showArticle` receives the resolved result with the metadata belonging to that request; the parent updates its retained view. Reading the latest `entry` inside an old request's completion would pair the wrong data.
2. **Benefit:** explicit flow, easy to follow at the call site, no global state or hidden provider.
3. **Cost:** page handlers can recreate the boilerplate being removed. If the child renders its own body while the parent owns the heading, the sequence still needs agreement. The child must also exist before the parent switches away from the old branch, or a separate load function must initiate the work.
4. **Status:** callback props are a supported way to communicate changes; the API and payload here are a proposal only. [Svelte props and ownership](https://svelte.dev/docs/svelte/$props/llms.txt).

#### 6.7.8 Bindable component props

**Shape:** a Loader exposes its result/loading state with bindings:

```svelte
<Loader {load} bind:isLoading bind:displayedArticle />
```

1. **Loading and commit:** Loader changes a bindable result after the import; the parent renders from that retained value. `displayedArticle` would need to include the body component and its metadata, not just a new ID.
2. **Benefit:** short visible wiring without separate notification handlers.
3. **Cost:** bindings allow changes in both directions, so the intended writer must remain clear. Binding only `isLoading` leaves retention unsolved; binding several loosely related fields can obscure which values belong together.
4. **Research:** Svelte requires props intended for this to be declared with `$bindable`; this is not the same as mutating an ordinary incoming prop. [Svelte bindable props](https://svelte.dev/docs/svelte/$bindable/llms.txt).
5. **Status:** not prototyped. A sketch must still show how synchronous overview content participates and where the persistent Loader sits.

#### 6.7.9 Snippet rendering with resolved inputs

**Shape:** Loader owns loading and gives a page-authored snippet the view that is actually ready:

```svelte
<Loader {load}>
  {#snippet children(displayedArticle)}
    <h1>{displayedArticle.title}</h1>
    <displayedArticle.Component />
  {/snippet}
</Loader>
```

1. **Loading and commit:** Loader retains the previous argument until it can pass a new coherent result.
2. **Benefit:** the page's HTML stays in the page; body and metadata can share one resolved input.
3. **Cost:** the proposed parameterized-children syntax was explicitly rejected as unpleasant. It also fails if the snippet instead reads the newest outer `entry` or if the overview is an outer conditional that already switched.
4. **Alternative detail:** named snippets for overview/article could alter the API, but that is not automatically a different acceptable design. Show the actual page syntax and acknowledge the earlier rejection before asking for reconsideration.
5. **Status:** snippet semantics documented; no accepted rendering API. [Svelte snippets](https://svelte.dev/docs/svelte/snippet/llms.txt).

#### 6.7.10 `{#await}` inside Loader or in the page

**Shape:** these placements have materially different consequences:

```svelte
<!-- Public page syntax: Loader initiates the call internally. -->
<Loader {load} />
```

```svelte
<!-- Possible Loader internals: this only shows the resolved branch. -->
{#await load() then module}
  <module.default />
{/await}
```

1. **Loading and commit:** an await block controls promise-based rendering. It still needs a deliberate policy for the old full view during the next pending branch.
2. **Benefit:** can hide promise handling inside Loader without introducing a page-level `promise` variable.
3. **Cost:** a page-level await block puts coordination back into every page. An internal body-only block cannot retain an outside overview. Introducing a second retained component beside the block must earn its complexity.
4. **Status:** dynamic-import rendering is documented. The examples above are mechanism illustrations, not complete retention solutions. [Svelte await blocks](https://svelte.dev/docs/svelte/await/llms.txt).

#### 6.7.11 A loader function instead of, or inside, a Loader component

There are three distinct proposals to compare:

1. **Pure async function returning a result:** the caller awaits it and owns displayed state. Small function, but the page still needs coordination; passing its already-started promise to Loader repeats the rejected API.
2. **Stateful function/helper:** owns the retained result and pending work, exposes state through a store or `.svelte.js` object. This is options 6.7.2–6.7.4 with a function-oriented interface.
3. **Internal function in Loader:** receives the existing import function through `load`, invokes `await load()`, and updates local state. The page only supplies the source; the implementation can choose an effect or explicit operation internally.

**Benefit:** ordinary functions can separate the load operation from the presentation without pretending that every function needs a component wrapper.

**Cost:** a pass-through wrapper around a single `load()` call removes no complexity. A stateful helper still needs scope, lifetime, and rendering connections; giving it a function name does not eliminate those decisions.

**Status:** the existing glob supplies the actual import functions, and the draft in section 5.4 uses an internal async function. Other forms remain design alternatives, not existing APIs.

#### 6.7.12 Component methods and event-based notification

Two further ways to connect loading and presentation are worth distinguishing:

1. **Component method:** obtain a Loader reference with `bind:this`, then call an exported method such as `loader.load(importFunction)`. This makes the operation explicit but requires a mounted component and a caller that covers initial links, reactive changes, and traversal. It is more imperative than supplying `load` as a prop. [Svelte component bindings](https://svelte.dev/docs/svelte/bind/llms.txt).
2. **Events:** a loading component could notify an ancestor through DOM events. That would provide notification, not automatic old-view retention. Event names, bubbling, payloads, and scope introduce a protocol; compare it with direct callback props before adding one. This is a new option, not an existing Loader event system.

The Router's intentional `routechange` event does not imply that local Loader communication must also use events, nor justify removing that Router event if callbacks are chosen locally.

### 6.8 Concrete combinations to compare

Every row below needs the same behavior proof. A short public call site is not evidence that the hidden implementation is small.

| Combination | Work and state ownership | How the new result reaches markup | Main unresolved detail |
| --- | --- | --- | --- |
| Local `$state` + component prop + effect | Loader invokes `load()` and retains its result | Loader renders the completed view component | Include overview and metadata without unnecessary extraction |
| Per-region writable + explicit props + internal load function | One helper/Loader writes a store shared with Transition | Page or renderer reads the retained store value | Avoid multiple writers and redundant input stores |
| Context + local state/store + Loader | Transition provides regional state/functions; Loader performs import | Provider commits a complete displayed selection | Starting new child work without removing the old branch |
| Callback props + parent `$state` | Loader loads; parent commits the returned view | Parent renders its retained selection | Handler ceremony, exact payload, child lifetime |
| Bindings + internal effect/await | Loader publishes a bindable resolved result | Parent uses that result for body and metadata | Overview contract and clear write ownership |
| Resolved-input snippet + local state | Loader owns import and retained snippet arguments | Page-authored markup renders those arguments | Explicitly rejected syntax requires reconsideration |
| Async derived store + component/snippet renderer | Store subscribes to requested selection and emits completed views | Renderer observes the last completed value | Source adaptation and stale completion cleanup |
| Internal `{#await}` + retained view + Transition | Loader hides promise handling; retention owner remains explicit | Component/snippet renderer consumes committed result | Whether await reduces code once retention is included |
| Native async expressions + boundary + local indicator | Compiler coordinates dependent async rendering | Ordinary markup within the demonstrated boundary scope | Experimental opt-in and proof for the outer conditional |

For each shortlisted combination, request the same concrete sequence:

```text
URL/selection changes
  → identify the new import function and its matching metadata
  → start loading without losing the currently displayed view
  → show regional loading feedback if the wait continues
  → accept only the still-requested completion
  → replace the view and matching metadata
  → apply the appropriate scroll/focus behavior
```

This sequence is a comparison tool, not a demand to create one function or state variable per arrow. The implementation should remove unnecessary steps and variables while preserving the behavior.

## 7. Catalogue of approaches

The alternatives below include previously discussed designs, new combinations, and broader fallbacks. Inclusion does not reverse a rejection. Some options solve coordination; others only complement it. The research status is stated for each.

### 7.1 Approach 1 — Keep explicit loading and displayed state in Articles

**Mechanism:** retain a displayed overview/article selection while the URL identifies the requested selection. Load the requested body and update displayed body and metadata together.

**Pros:** direct control; stable Svelte; a small experiment can establish the correct visual sequence without changing Router.

**Cons:** repeats load ordering, loading feedback, and race handling in every page. The owner already rejected a large page-local duplication of Router logic. It also needs a clear distinction between necessary retained view state and a redundant second URL store.

**Research/status:** the current page and failed drafts show exactly where the branch changes too early. Useful as a minimal behavioral reference, not an accepted framework design.

### 7.2 Approach 2 — A stable Loader owns the complete replaceable component

**Mechanism:** Loader receives a module import function and retains its resolved component until the next one is ready. The replaceable component includes the headline, date, and body. The overview is another explicitly selected view, not an undefined loader fallback.

**Pros:** preserves direct `load={...}` usage; Loader really loads; keeps state local; can reuse the bounded overlay.

**Cons:** the current `.md` component contains only the body. Additional composition is necessary to include metadata and overview. Extracting several components only to satisfy Loader could create more ceremony than it removes. Updating props on a retained component too early would reintroduce mixed content.

**Research/status:** the body-only core was compiler-checked. Complete view ownership and a pleasant overview API are not designed or validated.

### 7.3 Approach 3 — Loader owns readiness and renders a supplied snippet

**Mechanism:** a render snippet receives the resolved content and its matching metadata; the page retains its visible markup structure.

**Pros:** no separate file is required for every visual composition. Loader can defer invoking the next view until its inputs are ready.

**Cons:** the owner explicitly disliked the proposed `children(article)` interface. A snippet that still reads live `id` or `entry` externally can update independently, so passing only a body component is insufficient.

**Research/status:** supported rendering mechanism; the specific public API is rejected. Included for comparison, not a renamed recommendation.

### 7.4 Approach 4 — Reusable loading state, separate presentation

**Mechanism:** a local helper/controller owns imports and the retained result; a component or normal markup consumes `LoadedComponent` and `isLoading`. Props, bindings, or context connect them.

**Pros:** keeps HTML at the page; state logic can be reused; presentation is independently scoped.

**Cons:** more page plumbing and a split responsibility. A helper plus wrapper can be more complex than one component. Context changes how state is reached, not the need to control when the displayed selection changes.

**Research/status:** a family of distinct alternatives, not implemented. Sections 6.7–6.8 compare their state ownership, public wiring, and combinations individually; they should not be collapsed into one generic “state approach.”

### 7.5 Approach 5 — Stable await block as the implementation primitive

**Mechanism:** Loader calls the supplied function and uses `{#await}` internally. Add only the retention mechanism required for previous content and matching metadata.

**Pros:** uses Svelte's existing async rendering construct; avoids exposing promise construction to the page author; no compiler opt-in.

**Cons:** ordinary pending/fulfilled branching is not the desired retention behavior. If manual retained state is still needed, compare the full result against the simpler effect-based implementation rather than counting only the await line.

**Research/status:** official docs show import rendering; no working whole-overview retention example has been established here. A stable await block alone is incomplete.

### 7.6 Approach 6 — Reuse Router's global isLoading store

**Mechanism:** Articles sets the existing store while loading its Markdown body and keeps old content itself.

**Pros:** immediate reuse of Main's fade and Router's delayed overlay; little new presentation code.

**Cons:** it fades the whole Main and uses page-level loading presentation. It cannot satisfy independent sidebar/content loading on its own. It also creates competing writers if a page import and article import overlap; retained view state is still needed elsewhere.

**Research/status:** global store and presentation inspected. The earlier idea was incomplete because setting a boolean does not delay the `{if id}` replacement. Not sufficient as the generic solution.

### 7.7 Approach 7 — Let the page delegate the import to Router

**Mechanism:** Articles supplies its selected loader and asks Router to run the loading/transition operation. This was the owner's intended meaning of involving Router, rather than merely moving Markdown into a page shell.

**Pros:** potentially one established loading sequence and no copy of it in Articles.

**Cons:** Router currently replaces the whole page component. It has no demonstrated API for replacing an arbitrary child region or committing its metadata. Adding callbacks, targets, or controllers can become the refactor the owner rejected.

**Research/status:** Router call chain inspected; no small satisfactory patch found. Any proposal must state its exact API and changed functions before claiming this is easy.

### 7.8 Approach 8 — Treat suffix changes as full navigation or force remounting

**Mechanism:** make path changes, rather than page-loader identity alone, trigger Router loading; optionally key the page by path.

**Pros:** can reuse whole-page navigation presentation and initialization semantics.

**Cons:** the Article page module becoming ready still says nothing about its subsequent Markdown import. A keyed remount alone repeats the empty initial article state. It also discards page-local sidebar or navigation state and requires reconsidering current scroll behavior.

**Research/status:** previously discussed; not selected. It only becomes a complete solution when combined with moving the actual article load into the navigation operation.

### 7.9 Approach 9 — Give every Markdown article a real routed page shell

**Mechanism:** route imports resolve to a complete article page, including its body and metadata. An existing preprocessor or a Vite module could compose a shared shell; the overview remains a separate route.

**Pros:** the normal Router can wait for the module that actually represents the page. A shell can call `meta()` using article metadata.

**Cons:** current route discovery covers `.svelte` pages, while `.md` bodies are loaded by Articles. The route map, metadata delivery, and shell composition need changes. Persistent article navigation becomes a layout concern. Hand-generating many page files or rebuilding a parallel compiler pipeline was explicitly rejected.

**Research/status:** Markdown preprocessing and Router are inspected; shell composition is unimplemented. Virtual modules are a possible variant, not evidence that new generation infrastructure is necessary. Compare this option against the already-working wildcard approach before changing architecture.

### 7.10 Approach 10 — A reusable local sub-router

**Mechanism:** a component selects and imports the view for a small region, preserving that region's previous content. It can accept an import function without taking over URL management.

**Pros:** supports overview/article replacement and future sidebars; can package the coordination once in svUltra.

**Cons:** adding route parsing, its own history state, or another route table would duplicate work already done by Router and the page. Without those features this is essentially the smart Loader being sought, and still needs a good complete-view API.

**Research/status:** this direction led to the Loader discussion. The existing Router uses module-level stores and global navigation listeners, so simply nesting another instance is not a demonstrated independent sub-router solution.

### 7.11 Approach 11 — Declarative Transition parent and Loader child, connected by context

**Mechanism:** use the ideal markup from section 5.5. Descendant Loader reports pending work to the nearest Transition.

**Pros:** the page reads naturally; body loading is placed where the body appears; the author explicitly chooses the transition region without a render callback.

**Cons:** notification is the easy part. By the time the new child runs, the parent conditional can already have replaced the overview. A stable implementation would need an explicit way to stage new content, retain old inputs, or delay committing the outer selection. Two rendered copies can introduce duplicated effects, IDs, and interaction concerns.

**Research/status:** only a syntax sketch and context suggestion. No mechanism preserving arbitrary children was demonstrated. The key consultation question is whether this API can be implemented cleanly with public stable APIs, or requires native async coordination or a changed contract.

### 7.12 Approach 12 — Native experimental async rendering and boundaries

**Mechanism:** use Svelte's async compilation for the load and place the async boundary around the actual replacement region. Keep a direct import-function prop if a library component improves the page syntax.

**Pros:** potentially delegates the difficult update coordination to Svelte rather than writing a miniature rendering system.

**Cons:** opt-in and ongoing compatibility costs are real for shared library consumers. The existing effect ordering and preprocessor pipeline require validation. Body-level success alone does not settle the outer overview branch or its metadata.

**Research/status:** primary docs read and a small body-loader syntax check completed. No runtime proof for the full page. This is a candidate for an isolated experiment, not authorization to switch compiler options. See sections 1.1 and 6.3–6.4.

### 7.13 Approach 13 — Svelte transitions or CSS transitions around retained views

**Mechanism:** once a replacement is ready, use a keyed block and enter/leave transitions, or a small CSS opacity change, for the visible swap.

**Pros:** separates presentation from import completion and can produce the desired fade without inventing animation machinery.

**Cons:** does not decide when content is ready. Two in-flow views during overlap can increase height; taking one out of flow introduces geometry decisions. A fixed-duration outro cannot cover every load duration.

**Research/status:** transition/key docs read; current Main CSS inspected. Useful as a presentation choice paired with a real loading solution, not a complete replacement for one.

### 7.14 Approach 14 — Browser View Transitions

**Mechanism:** load the next view while retaining the current one, then coordinate the DOM replacement with `document.startViewTransition()`. The browser captures the old view and starts the visual transition after the update callback completes. [MDN: startViewTransition](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition).

**Pros:** offers browser-managed visual snapshots around the actual update instead of manually overlapping live views.

**Cons:** an import owner and coherent metadata commit are still required. The document-scoped API needs careful treatment for an independently loading region; browser support and actual local scoping must be checked for the intended targets. Waiting inside its callback is not automatically a good long-load UX.

**Research/status:** API documentation inspected; no project experiment. A complementary animation approach, not a ready Loader implementation.

### 7.15 Approach 15 — Eager imports, preloading, or cached components

**Mechanism:** import all articles eagerly, preload likely destinations on intent, or retain previously resolved components for revisits.

**Pros:** can reduce or remove a particular wait and improve repeated navigation.

**Cons:** eager loading shifts the corpus cost to earlier loading. Preloading cannot guarantee every direct link or fast click is ready. Caching modules is different from retaining mounted DOM and its state. None of these alone defines a correct slow-load transition.

**Research/status:** Vite's lazy/eager modes are documented; no bundle-size measurement or preload experiment has been performed for this decision. Treat these as optimizations after correctness, unless deliberately choosing a different loading model.

### 7.16 Approach 16 — Prepare the article before committing navigation

**Mechanism:** a navigation operation resolves the desired body first, then commits the URL and displayed article together.

**Pros:** keeps the old overview visible without trying to freeze arbitrary children after the URL has already changed.

**Cons:** implementing only an article-link click handler misses browser traversal, deep links, and other ways of selecting a route. Delaying the URL has UX consequences. A second click interceptor can duplicate Router responsibilities.

**Research/status:** conceptual alternative; not implemented. It requires one clear navigation owner and still needs an initial loading state. It is not solved by adding `await` to one link handler.

### 7.17 Approach 17 — Navigation API interception for rendering completion

**Mechanism:** an intercepted navigation returns a promise covering the required load and render. The browser can defer traversal scroll restoration until that promise resolves; focus and scroll behavior are configurable. [MDN: NavigateEvent.intercept](https://developer.mozilla.org/en-US/docs/Web/API/NavigateEvent/intercept).

**Pros:** offers explicit coordination with browser navigation completion and addresses the earlier history-timing discussion.

**Cons:** the promise must actually include article readiness, not just the Articles page import. This changes navigation integration and does not create a local loading component by itself. It cannot intercept the project's synthetic event as if that were a native Navigation API event.

**Research/status:** docs inspected; earlier broader history changes deferred. No browser bug or need for this architectural change has been established.

### 7.18 Approach 18 — Reserve geometry with a placeholder or measured height

**Mechanism:** hold the old region's height, provide a skeleton, or reserve a minimum height while the body loads.

**Pros:** directly addresses the footer flash and can be paired with existing loading presentation.

**Cons:** hides a layout symptom without retaining the previous content. Hardcoded heights fail to describe arbitrary article lengths. Measuring adds lifecycle work and still does not fix headline/body mismatch or stale results.

**Research/status:** Main already demonstrates the limit of a general minimum height. No measurement-based implementation tested. This is a possible geometry aid, not a complete answer to the requested behavior.

### 7.19 Approach 19 — Adopt an existing async-view library or routing framework

**Mechanism:** use a maintained abstraction that already coordinates loading and retained views, or migrate routing to a framework with that responsibility.

**Pros:** could avoid maintaining a bespoke coordinator if its actual public API fits.

**Cons:** dependency/API cost, migration scope, and integration with Django, existing routes, preprocessors, and Main. A broad migration conflicts with the current no-refactor constraint.

**Research/status:** no third-party candidate has been audited for this problem. Do not invent guarantees or name a package as a recommendation without checking it. SvelteKit's existence alone is not an argument to replace the current architecture.

### 7.20 Approach 20 — Change the product interaction or document model

**Mechanism:** keep the overview permanently present and open an article inline, in a side panel, or in a modal; alternatively use ordinary full-document article navigation.

**Pros:** changes which content is replaced and can eliminate this particular overview-to-body swap.

**Cons:** changes navigation, layout, or the SPA model rather than solving the reusable loading requirement. A runtime Markdown-to-HTML renderer would also sacrifice the existing compiled-component pipeline unless more machinery were added.

**Research/status:** outside the agreed product scope. Included to make the design space explicit, not as permission to change the UX or restart the earlier Markdown compiler discussion.

## 8. Comparison at a glance

“Needs design” means the proposal has no demonstrated complete implementation here. “Complement” means another option must supply load ownership and coherent replacement.

| Approach | Keeps current Router architecture? | Complete retained region | Main tradeoff/status |
| --- | --- | --- | --- |
| 1. Page-local state | Yes | Can own it explicitly | Duplication rejected as the reusable endpoint |
| 2. Component-owning Loader | Yes | If the whole view is its component | Requires overview/metadata composition |
| 3. Snippet-rendering Loader | Yes | If all displayed inputs are controlled | Proposed syntax rejected |
| 4. Loading helper + presentation | Yes | Needs explicit displayed inputs | More page plumbing |
| 5. Stable await block | Yes | Needs extra retention policy | Primitive, not sufficient alone |
| 6. Global isLoading | Yes, but adds a writer | No | Wrong scope for independent content |
| 7. Delegate to Router | Requires API changes | Needs design | Reuse versus refactor cost |
| 8. Full suffix navigation/key | Requires behavior changes | No, not by itself | Remount does not await nested body |
| 9. Routed Markdown shells | Route/preprocessor changes | At whole-page level | Changes selected architecture |
| 10. Local sub-router | Yes if it avoids URL ownership | Needs design | Can reduce to the desired Loader |
| 11. Transition + context | Yes | Unproven | Communication is not deferred rendering |
| 12. Native async boundary | Potentially | Exact placement needs proof | Experimental opt-in |
| 13. Svelte/CSS transitions | Yes | Complement | Animation after readiness |
| 14. View Transitions | Potentially | Complement | Snapshot animation and scope |
| 15. Eager/preload/cache | Yes | No guarantee | Latency versus loading cost |
| 16. Prepare before navigation | Requires integration | Can delay the selection | Must cover every navigation origin |
| 17. Navigation interception | Requires integration | Only with a complete load promise | Browser lifecycle, not local UI ownership |
| 18. Placeholder/height | Yes | No | Geometry only |
| 19. External library/framework | Depends; migration can be broad | Candidate-dependent | No candidate audited |
| 20. Different UX/document model | Changes product behavior | Avoids this particular swap | Outside current scope |

These options are not twenty mutually exclusive packages. A concrete design could combine a stateful Loader with the existing partial overlay and a Svelte fade, or use native async coordination with the same overlay. Compare complete combinations, including their page-facing syntax.

## 9. Questions that must not be hidden inside an implementation

### 9.1 What exactly becomes ready?

1. The JavaScript module has resolved.
2. Its Svelte component has been selected and rendered.
3. The DOM update has completed.
4. Images, fonts, and any asynchronous descendants have finished their own work.

These are different milestones. The current Router uses the page-module milestone. A proposed Loader should state its contract and not promise to detect every descendant request automatically. An `await tick()` is not proof that unrelated network activity finished.

### 9.2 What is retained?

There are at least three useful scopes:

1. Only the Markdown body.
2. Article body plus its headline, date, and controls.
3. The whole overview-or-article view.

The observed first-navigation bug requires the third scope somewhere. A future persistent sidebar can remain outside it. Retaining a body alone is still useful, but does not satisfy the current problem.

### 9.3 Where should necessary state live?

The URL is the requested location. The old visible article can intentionally remain on screen until its replacement is ready. Representing that retained result is not automatically redundant state; inventing another independently maintained pathname is.

The reviewer should explain the smallest representation needed, its owner, and its lifetime. A pair of booleans, a context registry, and a global controller are not justified merely because each is possible.

### 9.4 How does the overview participate?

The overview is already available from the index. It must have an explicit representation in a generic replacement API. Do not overload `load = undefined` to mean overview, missing article, initial state, and load failure at once.

Does the API force an unnecessary promise-producing function for synchronous content? Does it require a separate overview component? Can it keep normal page markup without exposing an awkward callback? This is the main authoring tradeoff still unresolved.

### 9.5 How does presentation relate to completion?

1. A fast import should not acquire an artificial 400 ms wait merely to finish an animation.
2. A slow import needs visible progress after the intended fade interval.
3. The region must not collapse while waiting.
4. Swapping between different final heights needs a deliberate scroll/visual sequence.
5. A bounded overlay must remain useful when the retained content is much taller than the viewport.

Opacity, retained DOM, final height changes, and browser scroll restoration are separate concerns. A design should explain their order rather than adding a delay and hoping it covers all four.

### 9.6 Failure, rapid navigation, and interaction

The owner rejected additional `try/catch`, speculative guards, and silently accepting invalid loaders. The review should identify what failure propagation the chosen mechanism already supplies and what remains a separate decision.

For rapid A → B → C navigation, explain why B cannot commit after C. For an unmounted view, explain which side effects cease. If faded content becomes inert, consider the persistent navigation and the current focused element; this was only a draft choice.

## 10. Suggested focused experiments after a design is chosen

These are proposed checks, not work already performed. Do not implement every alternative before discussing the API.

### 10.1 First proof: retention and metadata

1. Use a long overview and two tiny article components, with controllable import completion times.
2. Select one article and hold its load pending.
3. Verify that the overview remains the displayed view, with no short empty phase.
4. Resolve the import and verify that title, date, and body change together.
5. Repeat A → B while B remains pending.

This proves more than a body-only Loader compiling successfully.

### 10.2 Direct links, navigation, and failure cases

| Case | Evidence required |
| --- | --- |
| Direct `/articles/1` | Initial loading state, no overview flash |
| Slow overview → article | Old overview retained; bounded indicator after the selected delay |
| Cached/fast import | No unnecessary minimum wait or visible spinner flash |
| A slow, B fast, then A completes | B remains selected and displayed |
| Leave Articles during import | No later scroll or visible update from the abandoned selection |
| Browser back to overview | Overview restoration is not overwritten by article top-scrolling |
| Forward/revisit | No mixed metadata/body or repeated empty layout |
| Independent sidebar | Sidebar remains visible and usable according to the chosen interaction policy |
| Invalid loader/import rejection | Fails visibly through the chosen mechanism; no silent overview fallback |
| Very tall retained view | Loading indication is visible where the user is looking |

### 10.3 Additional checks only for experimental async

Validate the exact parent conditional, metadata expressions, and boundary placement together. Check Router's `$effect.pre` ordering, the svUltra preprocessor chain, and the distinction between initial pending and later updates. A compiler success is necessary but not sufficient.

### 10.4 Current evidence limits

1. The real overview-to-article footer flash was reported while using the running dev server.
2. Relevant application and library sources were inspected.
3. The effect-based Loader draft and small native-async example received in-memory compilation checks earlier in the discussion.
4. No complete generic Loader/Transition integration has passed the behavioral cases above.
5. No new build, deployment, compiler-option change, or browser automation is part of creating this document.

## 11. Requested response from the consulted LLM

Please structure the answer in this order:

1. **Correct the model:** identify any false claim about Svelte, the Router, async imports, or retained rendering in this brief.
2. **Show the best page syntax first:** give a short `Articles.svelte` example covering overview, direct article, and switching articles. Include where title/date and `meta()` belong.
3. **Explain ownership:** who invokes the import, retains the old view, and commits the new view? How is Transition connected to loading if they are separate?
4. **Compare concrete alternatives in detail:** shortlist several combinations from sections 6.7–6.8, show their page syntax, and compare ownership, data flow, retained markup, lifecycle, and code cost. Include native async as another candidate; do not reduce the answer to two choices labelled stable and experimental.
5. **Address the latest sketch directly:** can `<Transition>` preserve an outer `{if id}` branch when a newly created descendant Loader begins work, without experimental features or a custom renderer? Show the mechanism or explain the specific limitation.
6. **Show a small implementation core:** only after explaining the API. Avoid adding caches, registries, error policies, or props that the example does not need.
7. **List exact integration changes:** file/function and reason; no unsolicited Router rewrite.
8. **State what needs a runtime experiment:** distinguish documentation guarantees, code deductions, and hypotheses.

The requested outcome is an informed next step, not a large framework implementation. A different elegant approach is welcome if it respects the current working pipeline and explains its costs.

## 12. Sources and historical material

### 12.1 Primary documentation consulted

1. [Svelte `$effect` — owner-supplied link](https://svelte.dev/docs/svelte/$effect/llms.txt).
2. [Svelte await expressions — owner-supplied link](https://svelte.dev/docs/svelte/await-expressions/llms.txt).
3. [Svelte boundaries](https://svelte.dev/docs/svelte/svelte-boundary/llms.txt).
4. [Svelte stable await blocks](https://svelte.dev/docs/svelte/await/llms.txt).
5. [Svelte context](https://svelte.dev/docs/svelte/context/llms.txt).
6. [Svelte snippets](https://svelte.dev/docs/svelte/snippet/llms.txt).
7. [Svelte transitions](https://svelte.dev/docs/svelte/transition/llms.txt).
8. [Svelte key blocks](https://svelte.dev/docs/svelte/key/llms.txt).
9. [Vite glob imports](https://vite.dev/guide/features#glob-import).
10. [MDN: Document.startViewTransition](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition).
11. [MDN: NavigateEvent.intercept](https://developer.mozilla.org/en-US/docs/Web/API/NavigateEvent/intercept).
12. [Svelte stores, including writable and asynchronous derived stores](https://svelte.dev/docs/svelte/stores/llms.txt).
13. [Svelte state, including passing it into functions and across modules](https://svelte.dev/docs/svelte/$state/llms.txt).
14. [Svelte props and callback-based communication](https://svelte.dev/docs/svelte/$props/llms.txt).
15. [Svelte bindable props](https://svelte.dev/docs/svelte/$bindable/llms.txt).
16. [Svelte bindings and component methods](https://svelte.dev/docs/svelte/bind/llms.txt).

### 12.2 Earlier Markdown exploration

Before reaching the current implementation, discussion covered runtime Markdown rendering, mdsvex, generated page files, directory-based catalogs, route generator reuse, and page shells. The selected implementation now uses the existing Marked preprocessor, standalone `.md` compilation, a separate index plugin, and one wildcard Articles page.

The older [markdown-content-plan.md](markdown-content-plan.md) records an earlier stage. It contains proposals such as singular `/article` routing, different catalog integration, and Router changes that do not describe the current implementation or subsequent decisions. Use the inspected code and the snapshot in this document for this consultation; do not revive old proposals as accepted requirements.

### 12.3 Scope boundaries

Article layout, image URLs, slider syntax, and polishing editorial content remain separate topics. They should not be pulled into a loading abstraction merely to make it appear complete. The site's Home content remains the decisive description of Aylin's work; the article corpus complements it. This research changes neither that purpose nor the article content.
