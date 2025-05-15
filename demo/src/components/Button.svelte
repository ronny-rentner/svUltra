<script>
  import { ripple } from '@lib/ripple.js';
  import Icon from '@components/IconWithLabel.svelte';

  let { icon, iconSize = '1.25rem', children, ...rest } = $props();

  let buttonElement = $state();

</script>

<style>
  button {
    position: relative;
    overflow: hidden;
    --pico-form-element-spacing-vertical: 0.35rem;

    Icon.children {
      /* Add right margin for the Icon if there's also a label (`children` prop) */
      /*margin-right: calc(var(--pico-form-element-spacing-horizontal) * 0.25);*/
    }
  }

</style>

<button use:ripple {...rest} >
  {if icon}
    <Icon {icon} size={iconSize} class:children {children} />
  {else}
    {@render children?.()}
  {/if}
</button>
