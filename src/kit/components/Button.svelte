<script>
  import { ripple } from '../actions/ripple.js';
  import IconWithLabel from './IconWithLabel.svelte';

  let { icon, iconSize = '1.25rem', tooltip, placement, children, ...rest } = $props();
</script>

<style>
  button {
    position: relative;
    overflow: hidden;
    --pico-form-element-spacing-vertical: 0.35rem;

    IconWithLabel {
      gap: 0.5rem;
    }
  }
</style>

<button {tooltip} {placement} use:ripple {...rest}>
  {if icon}
    <IconWithLabel {icon} size={iconSize} {children} />
  {else}
    {if children}
      {render children()}
    {/if}
  {/if}
</button>
