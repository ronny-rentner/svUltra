<script>
  import { getContext } from 'svelte';
  let { meta, children, ...rest } = $props();

  const isLoading = getContext('isLoading');

  //$effect(() => {
  //  console.log('isLoading in Main', $isLoading);
  //});
</script>

<style>
  main.isLoading {
    opacity: 0 !important;
    transition: opacity 0.4s linear;
  }
</style>

<main class:container={1} class:isLoading={$isLoading} {...rest}>
  {render children?.(meta)}
</main>
