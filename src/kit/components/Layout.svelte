<script>
  // Minimal default layout, real sites should provide their own.
  import Toaster from './Toasts.svelte';
  import { onPageChange } from '#kit/router/index.js';

  let { children } = $props();

  // The flags this layout reads and their defaults
  const defaults = { showHeader: true, showFooter: true, contrast: false };

  //Layout configuration can be overridden by individual pages; each page starts from the defaults
  const layoutConfig = $state({ ...defaults });
  onPageChange(() => Object.assign(layoutConfig, defaults));

</script>

{@render children(layoutConfig)}

<Toaster />
