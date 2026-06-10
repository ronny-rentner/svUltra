<script module>
  import './init.js';
</script>

<script>
  import { Router } from 'svultra/kit/router';
  import Layout from 'svultra/kit/components/Layout.svelte';

  const routes = {
    '/':        () => import('./pages/Home.svelte'),
    '/about':   () => import('./pages/About.svelte'),
    '/pricing': () => import('./pages/Pricing.svelte'),
    '*':        () => import('./pages/404.svelte'),
  };
</script>

<Router {routes} {Layout} />
