<script>
  import LoadingOverlay from './LoadingOverlay.svelte';
  import { startLoad } from '#kit/router';

  let { next, children, ...rest } = $props();
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
        result = { ...view, loadedComponent: module.default };
      }

      // Simulate slow loading using the same delay (milliseconds) as Router.
      const loadingDelay = window.config?.loadingDelay || 0;
      if (loadingDelay) await new Promise(resolve => setTimeout(resolve, loadingDelay));

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
    // Match the 0.4s opacity transition: keep the old view's height while it fades out.
    return new Promise(resolve => setTimeout(resolve, 400));
  }
</script>

<style>
  div {
    position: relative;
    min-height: inherit;
    /* Keep the overlay's z-index inside the Loader, below the page header. */
    isolation: isolate;

    > div {
      transition: opacity 0.4s linear;

      &.isLoading {
        opacity: 0;
      }
    }
  }

  LoadingOverlay.initial {
    /* With no previous content, the overlay itself must give the region a height. */
    position: relative;
    min-height: inherit;
  }
</style>

<div {...rest}>
  {if loaded}
    <!-- Retain layout during loading without leaving invisible controls interactive. -->
    <div class:isLoading inert={isLoading}>
      {render children(loaded)}
    </div>
    {if isLoading}
      {await fadeTimeout() then}
        <LoadingOverlay partial showLogo={false} />
      {/await}
    {/if}
  {else}
    <LoadingOverlay partial showLogo={false} class="initial" />
  {/if}
</div>
