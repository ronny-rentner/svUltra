<script context="module">
  import { tick, setContext } from 'svelte';
  import { writable, get } from 'svelte/store';

  export function meta({ title, description }) {
    console.log('meta() called', title, description);
    if (title) {
      document.title = title;
    }

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

  let componentElement;

  let initialized = $state(false);

  export const base = getBaseUrl();
  export const baseUrl = base;

  export function getCurrentPath() {
    let path = window.location.pathname;
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
    console.log('navigate()', path);
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
      //updateComponent();
      //TODO: Explain why we are using an event instead of calling directly
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


  async function updateComponent() {
    const path = getCurrentPath();
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

      // Show the loading overlay
      //console.log('isLoading true');
      isLoading.set(true);
      // Load the new component
      try {
        currentPath.set(path);
        _currentPath = path;
        const loadedComponent = await component();
        //console.log('loadedComponent', loadedComponent, loadedComponent.default);

        //Artificial delay for testing the loading message overlay
        //await new Promise(resolve => setTimeout(resolve, 4000));

        //const html = renderComponentToHTML(loadedComponent.default, { meta: meta });
        //console.log('HTML', html, loadedComponent, loadedComponent.default);

        currentComponent.update(_ => {
          //_currentComponent = component
          document.getElementById('app').scrollTo(0, 0);
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
        throw error;
      }
    } else {
      //console.log('component did not change, leaving it alone');
    }
  }

  window.addEventListener('popstate', updateComponent);
</script>

<script>
  import { onMount, onDestroy } from 'svelte';

  import LoadingOverlay from '#kit/components/LoadingOverlay.svelte';

  const { routes: _routes , Layout } = $props();
  routes = _routes;

  let layoutConfig = $state({ showHeader: false, contrast: false });

  function updateLayout(args) {
    console.log('updateLayout()', args, layoutConfig);
    layoutConfig = { ...layoutConfig, ...args }

  }
  setContext('updateLayout', updateLayout);
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
    return new Promise(resolve => setTimeout(resolve, 400));
  }

</script>

{if initialized}
  <Layout {layoutConfig}>
  {if $isLoading}
    {await fadeTimeout() then}
      <LoadingOverlay showLogo={false} />
    {/await}
  {/if}

  {if $isLoading && ! $currentComponent}
    <main class="container" style="height:100vh"></main>
  {else if $currentComponent}
    {@const Component=$currentComponent}
    <Component {meta}  />
  {else}
    <main class="container"><h1>Error: Component is not defined or failed to load.</h1></main>
  {/if}
  </Layout>
{else}
  <LoadingOverlay />
{/if}
