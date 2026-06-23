<script>
  // Minimal default layout: renders the routed page plus the toast host, and
  // nothing else. It's the near-empty fallback used by Router when no Layout
  // is passed. Real sites provide their own Layout (header, nav, footer, …)
  // and hand it to <Router {routes} {Layout} />.
  import Toaster from './Toasts.svelte';

  let { children } = $props();
</script>

{@render children()}

<Toaster />
