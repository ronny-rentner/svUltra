<script context="module">
  import { tick, setContext } from 'svelte';
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
  // Internal copy of currentPath to make it easier to get it
  let _currentPath = $state();

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

  export function navigate(path) {
    const base = getBaseUrl();
    //console.log('navigate()', path);
    if (!path.startsWith(base)) {
      // Construct full URL if we got only the URL path.
      path = base + path;
    }
    if (_currentPath !== path.slice(base.length)) {
      const beforeNavigateEvent = new CustomEvent('beforeNavigate', {
        detail: { path, currentPath: _currentPath }
      });
      window.dispatchEvent(beforeNavigateEvent);

      window.history.pushState(history?.state, '', path);
      window.dispatchEvent(new Event('popstate'));
    }
  }

  let routes = {};
  let _currentComponent = null;

  function resolveRoute(path) {
    if (routes[path]) return routes[path];

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
        }
      }
    }

    return best || routes['*'];

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
    let component = resolveRoute(path);
    if (!isSvelteComponent(component)) {
      console.error('Not a Svelte component: ', component, path);
      component = routes['*'];
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
      _currentPath = path;
    }
  }

  // Delay the browser's default scrolling until the post-render effect signals readiness.
  function delayHistoryScroll(event) {
    const { promise, resolve, reject } = Promise.withResolvers();
    // Stop and superseding navigations both abort the signal and reject this wait.
    event.signal.addEventListener('abort', () => reject(), { once: true });
    event.intercept({
      // Default after-transition scrolling runs when the readiness promise resolves.
      handler: () => promise
    });
    pendingScroll = { event, resolve, reject };
  }

  navigation.addEventListener('navigate', updateComponent);
  if (import.meta.hot) {
    // Remove this module's navigation handler before hot replacement registers a new one.
    import.meta.hot.dispose(() => navigation.removeEventListener('navigate', updateComponent));
  }
</script>

<script>
  import { onMount, onDestroy } from 'svelte';

  import LoadingOverlay from '#kit/components/LoadingOverlay.svelte';
  import DefaultLayout from '#kit/components/Layout.svelte';

  const { routes: _routes , Layout = DefaultLayout } = $props();
  // `routes` is the static, build-generated route table; bridging it once into
  // the module-level resolver is by design (see module scope) and it never changes.
  // svelte-ignore state_referenced_locally
  routes = _routes;

  // pageConfig is the current page's display config: pages getContext('pageConfig')
  // and set their own preferences on it (e.g. contrast), and the Layout reads it
  // to render accordingly. The Router owns it because it owns the current page; it
  // is never reassigned, so every consumer shares the same reactive proxy.
  let pageConfig = $state({ showHeader: true, showFooter: true, contrast: false });

  setContext('pageConfig', pageConfig);
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

{if initialized}
  <Layout {pageConfig}>
  {if $isLoading}
    {await fadeTimeout() then}
      <LoadingOverlay showLogo={false} />
    {/await}
  {/if}

  {if $isLoading && ! $currentComponent}
    <main class="container" style="height:100vh"></main>
  {else if $currentComponent}
    {@const Component=$currentComponent}
    <Component {meta} />
  {else}
    <main class="container"><h1>Error: Component is not defined or failed to load.</h1></main>
  {/if}
  </Layout>
{else}
  <LoadingOverlay />
{/if}
