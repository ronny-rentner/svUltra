<script>
  import Icon from '@components/Icon.svelte';
  import { fade } from 'svelte/transition';
  
  // Import default spinner icon
  import spinnerIcon from '@icons/spinner-gap-duotone';
  
  let { 
    loading = true, 
    size = "1.25rem", 
    icon = spinnerIcon,
    inline = false,
    tooltip = "Loading...",
    placement = "top",
    ...rest 
  } = $props();
</script>

<style>
  /* Animation for the loading spinner */
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  /* Style the Icon component directly */
  Icon {
    animation: spin 1s linear infinite;
  }
  
  /* Different styles for inline vs block */
  .inline {
    display: inline-block;
    margin-left: 0.5rem;
  }
  
  .block {
    display: flex;
    justify-content: center;
    padding: 1rem;
  }
</style>

{if loading}
  <div 
    transition:fade 
    class={inline ? "inline" : "block"} 
    {...rest}
  >
    <Icon {icon} {size} {tooltip} {placement} />
  </div>
{/if}