<script context="module">
  import { tick, setContext, onDestroy } from 'svelte';
  import { writable, get } from 'svelte/store';
  import { SvelteSet } from 'svelte/reactivity';

  // Sets the page title and description. The title runs through
  // window.config.titleTemplate: `{title}` is the given title (falling back to
  // the prettified route slug when omitted — '/user-settings' -> 'User Settings',
  // '/' -> 'Home'), and `{slug}` is always the prettified slug. Each page calls
  // meta() itself; there is no automatic fallback.
  export function meta({ title, description } = {}) {
    const seg = getCurrentPath().replace(/\/+$/, '').split('/').pop();
    const slug = seg ? seg.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Home';
    const template = window.config?.titleTemplate ?? '{title}';
    document.title = template.replaceAll('{title}', title || slug).replaceAll('{slug}', slug);

    if (description) {
      let metaDescription = document.querySelector("meta[name='description']");
      if (!metaDescription) {
        metaDescription = document.createElement("meta");
        metaDescription.name = "description";
        document.head.appendChild(metaDescription);
      }
      metaDescription.content = description;
    }
  }

  export function getBaseUrl() {
    if ('baseUrl' in window.config) return window.config.baseUrl;
    return window.config.dev ? import.meta.env.BASE_URL.replace(/\/$/, '') : '';
  }

  export function preloaded(component) {
    return { default: component };
  }

  // Store to hold the current component
  export let currentComponent = writable();
  export let isLoading = writable(false);
  export let currentPath = writable();
  // The route serving currentPath, as resolveRoute returns it: the entry with path, matchedPath and variants
  export let currentRoute = writable();
  // The visitor's language, as the site passes it in its language prop
  export const currentLanguage = writable();
  // Internal copy of currentPath to make it easier to get it
  let _currentPath = $state();
  // Internal copy of currentLanguage, translatePath's default
  let _currentLanguage = $state();
  // The position of the visitor's language among the site's languages, worked out once per language change
  const _currentLanguageIndex = $derived(languages.indexOf(_currentLanguage));

  const pendingLoads = new SvelteSet();
  let pendingScroll = $state();

  // Register a load; the returned function removes that registration on completion or teardown.
  export function startLoad() {
    const finishLoad = () => pendingLoads.delete(finishLoad);
    pendingLoads.add(finishLoad);
    return finishLoad;
  }

  let componentElement;

  let initialized = $state(false);

  export const base = getBaseUrl();
  export const baseUrl = base;

  //Extract the current URL path from source. If no source was given, use the current URL path from window as a fallback.
  export function getCurrentPath(source) {
    let path = source ? new URL(source.destination.url).pathname : window.location.pathname;
    if (base && path.startsWith(base)) {
      path = path.slice(base.length);
    }
    //console.log('getCurrentPath()', path);
    return path === '' ? '/' : path;
  }

  function isSvelteComponent(value) {
    return typeof value === 'function';
  }

  // language: translates the path to that language if it isn't in that language yet
  export function navigate(path, language) {
    const base = getBaseUrl();
    //console.log('navigate()', path);
    // The path within the site, as routes are keyed; a link's href carries the base
    if (path.startsWith(base)) {
      path = path.slice(base.length);
    }
    if (language) {
      path = translatePath(path, language);
    }
    if (_currentPath !== path) {
      // TODO: beforeNavigate fires only for navigate(): back and forward never reach it
      const beforeNavigateEvent = new CustomEvent('beforeNavigate', {
        detail: { path: base + path, currentPath: _currentPath }
      });
      window.dispatchEvent(beforeNavigateEvent);

      window.history.pushState(history?.state, '', base + path);
      window.dispatchEvent(new Event('popstate'));
    }
  }

  // The path of the same page in that language, by default the visitor's; the path itself where the page is in that
  // language already or does not exist in it
  export function translatePath(path, language = _currentLanguage) {
    const route = resolveRoute(path, false);
    if (route.lang === language) {
      return path;
    }
    return variantPath(route, language) ?? path;
  }

  // translatePath with the base, for a link's href
  export function translateHref(path, language) {
    return base + translatePath(path, language);
  }

  // The text in the visitor's language, the texts in the order of the site's languages: translateText('Coaching',
  // 'Beratung'); a missing text falls back to the first
  export function translateText(...texts) {
    return texts[_currentLanguageIndex] ?? texts[0];
  }

  let routes = {};
  // Each page's path in every language it exists in, by the page's name; built once from routes
  let pages = {};
  // The site's languages, the main one first
  let languages = [];
  let _currentComponent = null;

  function pathsByName(routes) {
    const paths = {};
    for (const [path, route] of Object.entries(routes)) {
      // Only a named entry pairs with its translations. A bare import function is skipped by its type: its own name
      // property is the key it was written under, not a page name
      if (typeof route === 'function' || !route.name) {
        continue;
      }
      if (!paths[route.name]) {
        paths[route.name] = {};
      }
      paths[route.name][route.lang] = path;
    }
    return paths;
  }

  // The callbacks registered with onPageChange()
  const pageChangeCallbacks = new Set();

  // Runs fn right before the current page is replaced by another one: the old page is still there, the next
  // one not created yet. Called during a component's initialisation, like onDestroy, and removed with it
  export function onPageChange(fn) {
    pageChangeCallbacks.add(fn);
    onDestroy(() => pageChangeCallbacks.delete(fn));
  }

  function resolveRoute(path, includeVariants = true) {
    let route = routes[path];
    // The key in routes that serves the path: the path itself, a wildcard such as '/articles/*', or '*'
    let matchedPath = path;

    if (!route) {
      /* wildcard matches like '/guide/*' */
      let best = null;
      let bestLen = -1;

      for (const key in routes) {
        if (!key.endsWith('*') || key === '*') continue;
        const base = key.slice(0, -2); // drop '*'
        if (path === base || path.startsWith(base + '/')) {
          if (base.length > bestLen) {
            bestLen = base.length;
            best = routes[key];
            matchedPath = key;
          }
        }
      }

      if (best) {
        route = best;
      } else {
        route = routes['*'];
        matchedPath = '*';
      }
    }

    // A hand-written map may hold the import function directly; callers always get the generated entry's form
    if (typeof route === 'function') {
      route = { import: route };
    }

    const resolved = { ...route, path, matchedPath };

    if (includeVariants) {
      // One variant per site language, in the order of languages: the page's version in that language, or the page itself
      // where it does not exist in it
      resolved.variants = languages.map(lang => ({ lang, path: variantPath(resolved, lang) ?? path }));
    }

    return resolved;
  }

  // The URL of the resolved route's page in lang, undefined where the page does not exist in it.
  // A named entry is always in pages, which is built from the same routes
  function variantPath(route, lang) {
    if (route.name && pages[route.name][lang]) {
      return urlOf(pages[route.name][lang], route.path, route.matchedPath);
    }
  }

  // The URL of a route key for the current path. A wildcard key keeps the part of the path that the matched key's
  // star stands for: '/de/artikel/*' for '/articles/61' matched by '/articles/*' is '/de/artikel/61'.
  // The catch-all '*' has no URL of its own, so it keeps the path
  function urlOf(key, path, matchedPath) {
    if (key === '*') {
      return path;
    }
    if (key.endsWith('/*')) {
      return key.slice(0, -2) + path.slice(matchedPath.length - 2);
    }
    return key;
  }


  async function updateComponent(event) {
    // Leave non-interceptable navigation to the browser; initial loading has no event.
    if (event && !event.canIntercept) return;
    // Delay scrolling for both component replacements and URL changes within the same component.
    // Both branches leave readiness to the $effect below: after rendering and all registered
    // loads finish, it resolves pendingScroll so the browser can scroll.
    if (event) delayHistoryScroll(event);
    const path = getCurrentPath(event);
    //let component = routes[path] || routes['*'];
    const route = resolveRoute(path);
    let component = route.import;
    if (!isSvelteComponent(component)) {
      console.error('Not a Svelte component: ', component, path);
      component = resolveRoute('*').import;
    }
    if (component != _currentComponent) {
      //console.log('updateComponent()', path, component);
      // Need to set this before loading / running the component,
      // otherwise child layout changes might trigger re-loading the same component
      _currentComponent = component

      const finishLoad = startLoad();
      // Show the loading overlay
      //console.log('isLoading true');
      isLoading.set(true);
      // Load the new component
      try {
        currentPath.set(path);
        currentRoute.set(route);
        _currentPath = path;
        const loadedComponent = await component();
        //console.log('loadedComponent', loadedComponent, loadedComponent.default);

        // Simulate slow loading to test the loading screens and SPA behaviour under slow
        // page loads: `window.config.loadingDelay = 4000` in the console makes the Router
        // wait that many ms before swapping the page in (session-only; a reload clears it).
        const loadingDelay = window.config?.loadingDelay || 0;
        if (loadingDelay) await new Promise(resolve => setTimeout(resolve, loadingDelay));

        //const html = renderComponentToHTML(loadedComponent.default, { meta: meta });
        //console.log('HTML', html, loadedComponent, loadedComponent.default);

        for (const fn of pageChangeCallbacks) fn();
        // The page's language on <html>, set as the page is swapped in so they change together; a route without a
        // language, as a hand-written one, leaves the served one
        if (route.lang) {
          document.documentElement.lang = route.lang;
        }
        currentComponent.update(_ => {
          //_currentComponent = component
          // Switch to the new component
          return loadedComponent.default;
        });

        isLoading.set(false);
        //console.log('isLoading false');
        initialized = true;
      } catch (error) {
        //TODO: Better error handler, maybe show an error component?
        console.error('Error loading ', path, component);
        console.error(error);
        isLoading.set(false);
        // Reject this navigation without scrolling when its page import fails.
        if (pendingScroll && pendingScroll.event === event) {
          pendingScroll.reject(error);
          pendingScroll = undefined;
        }
        throw error;
      } finally {
        finishLoad();
      }
    } else {
      // Keep the pathname current when the same page (component) handles a different URL.
      // This update lets existing Loaders register new loads before the post-render $effect runs.
      currentPath.set(path);
      currentRoute.set(route);
      _currentPath = path;
    }
  }

  // Delay the browser's default scrolling until the post-render effect signals readiness.
  function delayHistoryScroll(event) {
    const { promise, resolve, reject } = Promise.withResolvers();
    // Stop and superseding navigations both abort the signal and reject this wait.
    event.signal.addEventListener('abort', () => reject(), { once: true });
    event.intercept({
      scroll: 'manual',
      handler: async () => {
        await promise;
        // Allow event.scroll() to use the browser's saved position after rendering,
        // then block early restoration on the next navigation.
        history.scrollRestoration = 'auto';
        event.scroll();
        history.scrollRestoration = 'manual';
      }
    });
    pendingScroll = { event, resolve, reject };
  }

  // Firefox 156.0.1 restores during traversal before the handler finishes, even with
  // intercept({ scroll: 'manual' }). Set the history policy before new entries inherit it.
  history.scrollRestoration = 'manual';
  navigation.addEventListener('navigate', updateComponent);
  if (import.meta.hot) {
    // Remove this module's navigation handler before hot replacement registers a new one.
    import.meta.hot.dispose(() => navigation.removeEventListener('navigate', updateComponent));
  }
</script>

<script>
  import { onMount } from 'svelte';

  import LoadingOverlay from '#kit/components/LoadingOverlay.svelte';
  import DefaultLayout from '#kit/components/Layout.svelte';

  const { routes: _routes, languages: _languages = [], language, Layout = DefaultLayout } = $props();
  // `routes` is the static, build-generated route table; bridging it once into
  // the module-level resolver is by design (see module scope) and it never changes.
  routes = _routes;
  pages = pathsByName(routes);
  // The site's languages are static too and bridged the same way
  languages = _languages;
  // The visitor's language is not static: the site's value changes with their choice, and both copies follow it
  $effect.pre(() => {
    currentLanguage.set(language);
    _currentLanguage = language;
  });

  setContext('isLoading', isLoading);

  function handleLinkClick(event) {
    let target = event.target;

    // Traverse up the DOM to find the closest anchor tag
    while (target && target.tagName !== 'A') {
      target = target.parentElement;
    }

    // If an anchor tag was found and it meets the criteria
    if (target &&
        target.origin === window.location.origin &&
        !target.hasAttribute('download') &&
        target.getAttribute('target', '') !== '_blank') {

      // A link to a fragment of the page we are on stays with the browser: it scrolls to
      // the element and updates the hash without a reload. The resolved properties are
      // used, so `#id` and `/current-path#id` are both recognised.
      if (target.hash &&
          target.pathname === window.location.pathname &&
          target.search === window.location.search) {
        return;
      }

      // Get the full href and remove the origin part
      const href = target.getAttribute('href');
      const path = href.replace(window.location.origin, '');
      event.preventDefault();
      //console.log('intercept', target, path);
      navigate(path);
    }
  }

  $effect.pre(() => {
    updateComponent();
  });

  $effect(() => {
    // Check after rendering, when new or updated Loaders have registered through their pre-effects.
    // Resolve pendingScroll for either branch of updateComponent(), allowing the browser to scroll.
    if (pendingScroll && pendingLoads.size === 0) {
      pendingScroll.resolve();
      pendingScroll = undefined;
    }
  });

  onMount(() => {
    document.body.addEventListener('click', handleLinkClick);
  });

  onDestroy(() => {
    document.body.removeEventListener('click', handleLinkClick);
  });
  /*
  $effect(() => {
    setTimeout(() => {
      window.addEventListener('popstate', updateComponent);
    }, 0);
  });
   */

  async function fadeTimeout() {
    //Only after 400 ms we do show the LoadingOverlay when navigating between pages.
    //The hope is that it never actually takes so long to load the new page.
    //In those 400 ms we fade out the old page.
    //Keep this delay aligned with Main.svelte's 0.4s opacity transition.
    return new Promise(resolve => setTimeout(resolve, 400));
  }

</script>

<!-- TODO: fix Svelte, it rejects svelte:head inside a block, so the if that wraps the page is repeated inside it -->
<svelte:head>
  {if initialized}
    {each $currentRoute.variants as { lang, path }}
      {if path !== $currentRoute.path}<link rel="alternate" hreflang={lang} href={location.origin + base + path} />{/if}
    {/each}
  {/if}
</svelte:head>

{if initialized}
  <Layout let:layoutConfig>
  {if $isLoading}
    {await fadeTimeout() then}
      <LoadingOverlay showLogo={false} />
    {/await}
  {/if}

  {if $isLoading && ! $currentComponent}
    <main class="container" style="height:100vh"></main>
  {else if $currentComponent}
    {@const Component=$currentComponent}
    <Component {meta} {layoutConfig} />
  {else}
    <main class="container"><h1>Error: Component is not defined or failed to load.</h1></main>
  {/if}
  </Layout>
{else}
  <LoadingOverlay />
{/if}
