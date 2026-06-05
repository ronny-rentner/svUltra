<script>
  import { fade } from 'svelte/transition';
  import Icon from './IconWithLabel.svelte';

  import icon from '../icons/spinner.js';

  let { loading = true, size = '1.25rem', ...rest } = $props();
</script>

<style>
  Icon {
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    animation: spin 1s linear infinite;
    margin-left: 0.5rem;
  }
</style>

{if loading}
  <span transition:fade>
    <Icon {icon} {size} {...rest} />
  </span>
{/if}
