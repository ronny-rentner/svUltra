<script>
  import { getContext } from 'svelte';
  let { meta, children, ...rest } = $props();

  const isLoading = getContext('isLoading');

  //$effect(() => {
  //  console.log('isLoading in Main', $isLoading);
  //});
</script>

<style>
  main {
    /* Reserve the header (~4.5rem) plus the footer's 8rem top margin = 12.5rem, so
       the footer sits just below the fold; override via --page-full-height-offset. */
    min-height: calc(100vh - var(--page-full-height-offset, 12.5rem));
  }
  main.isLoading {
    opacity: 0 !important;
    transition: opacity 0.4s linear;
  }
</style>

<main class:container={1} class:isLoading={$isLoading} {...rest}>
  {render children?.(meta)}
</main>
