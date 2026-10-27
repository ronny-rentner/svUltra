<script>
  import LoadingOverlay from './LoadingOverlay.svelte';
  import { startLoad } from '#kit/router';

  let { next, children, translucent = false, ...rest } = $props();
  let loaded = $state();
  let isLoading = $state(false);

  function updateView(view) {
    // Register synchronously so Router's post-render effect sees this load.
    const finishLoad = startLoad();
    // Keep the request's metadata with its import, even if next changes while awaiting it.
    let active = true;

    async function loadView() {
      isLoading = true;
      let result = view;

      // Omitting load supplies ready content; an explicitly undefined load must fail.
      if ('load' in view) {
        const module = await view.load();

        // Simulate slow loading using the same delay (milliseconds) as Router.
        const loadingDelay = window.config?.loadingDelay || 0;
        if (loadingDelay) await new Promise(resolve => setTimeout(resolve, loadingDelay));

        result = { ...view, loadedComponent: module.default };
      }


      if (active) {
        loaded = result;
        isLoading = false;
        // Run the optional completion callback only for the accepted view.
        view.onload?.();
      }
    }

    // Release the registration on success or failure; preserve any rejected load.
    loadView().finally(finishLoad);
    // A superseded request or an unmounted Loader must not publish a late result.
    return () => {
      active = false;
      finishLoad();
    };
  }

  $effect.pre(() => {
    return updateView(next);
  });

  function fadeTimeout() {
    // Skip the overlay on fast loads and allow the default content fade to finish.
    return new Promise(resolve => setTimeout(resolve, 400));
  }
</script>

<style>
  div {
    position: relative;
    min-height: inherit;
    /* Keep the overlay's z-index inside the Loader, below the page header. */
    isolation: isolate;

    > :global(:not(.overlay)) {
      transition: opacity 0.4s linear;
    }

    &.isLoading:not(.translucent) > :global(:not(.overlay)) {
      opacity: 0;
    }

  }
</style>

<div class:isLoading class:translucent inert={isLoading} {...rest}>
  {if loaded}
    {render children(loaded)}
    {if isLoading}
      {await fadeTimeout() then}
        <LoadingOverlay showLogo={false} {translucent} class="overlay" />
      {/await}
    {/if}
  {else}
    <LoadingOverlay showLogo={false} class="overlay" />
  {/if}
</div>
