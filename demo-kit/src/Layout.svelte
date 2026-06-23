<script>
  import ToggleDarkMode from 'svultra/kit/components/ToggleDarkMode.svelte';
  import Toaster from 'svultra/kit/components/Toasts.svelte';

  let { pageConfig, children } = $props();

  const nav = [
    { path: '/',      label: 'Home' },
    { path: '/about', label: 'Components' },
  ];
</script>

{#if pageConfig.showHeader}
<header class="container">
  <nav>
    <ul>
      <li><strong>svUltra kit</strong></li>
    </ul>
    <ul>
      {#each nav as item}
        <li><a href={item.path}>{item.label}</a></li>
      {/each}
      <li><ToggleDarkMode /></li>
    </ul>
  </nav>
</header>
{/if}

{@render children()}

<Toaster />

{#if pageConfig.showFooter}
<footer class="container">
  <small>Built with the svUltra kit.</small>
</footer>
{/if}
