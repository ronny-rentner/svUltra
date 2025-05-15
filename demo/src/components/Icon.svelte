<script>
  // Wrapper component for Iconify icons with improved attribute handling
  import IconifyIcon from '@iconify/svelte';
  
  // Import some default icons for common cases
  import defaultIcon from '@icons/ph/circle-duotone';
  
  let { 
    icon = defaultIcon, 
    size = "1.25rem", 
    width, 
    height, 
    tooltip, 
    placement, 
    ...rest 
  } = $props();

  // Icons are supposed to be square by default
  if (!width) width = size;
  if (!height) height = size;
</script>

<style>
  /* Basic styling for our icon component */
  :global(.iconify) {
    display: inline-block;
    vertical-align: middle;
    flex-shrink: 0; /* Prevents shrinking in flex containers */
  }
</style>

<IconifyIcon 
  {icon} 
  {width} 
  {height} 
  {tooltip}
  {placement}
  {...rest}
/>