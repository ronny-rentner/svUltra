<script>
  import Icon from '@components/Icon.svelte';
  
  let { 
    icon, 
    iconSize = '1.25rem', 
    label, 
    tooltip, 
    placement, 
    children, 
    ...rest 
  } = $props();

  // If children are provided, use them as the label
  if (children) {
    label = children;
  }
</script>

<style>
  /* Using component styles to style the Icon component directly */
  Icon {
    margin-right: 0.25rem;
  }

  span.wrapper {
    display: inline-flex;
    align-items: center;
    
    /* Nesting styles for better organization */
    > span {
      align-self: baseline;
    }
  }
</style>

{if label}
  {if icon}
    <span class="wrapper" {...rest}>
      <Icon {icon} size={iconSize} />
      <span {tooltip} {placement}>{render label()}</span>
    </span>
  {else}
    {render label()}
  {/if}
{else}
  <Icon {icon} size={iconSize} {tooltip} {placement} {...rest} />
{/if}