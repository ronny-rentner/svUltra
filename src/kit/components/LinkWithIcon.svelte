<script>
import Icon from './IconWithLabel.svelte';

let { icon, href, blank, target, children, ...rest } = $props();

if (!href) {
  // This is needed to make the link focussable and 'clickable' with keys
  href = "/"
}

if (blank) {
  target="_blank";
}

//console.log('Link', icon, href, blank, children)

</script>

<style>

a, a[role=button] {
  display: inline-flex;
  align-items: last baseline;
  vertical-align: top;

  Icon {
    margin-right: 0.1rem;
  }
}

a[role=button] {
  /* Aligned with RippleButton (Button) */
  --pico-form-element-spacing-vertical: 0.35rem;

  Icon {
    /* Aligned with RippleButton (Button) */
    margin-right: calc(var(--pico-form-element-spacing-horizontal) * 0.5);
  }
}

</style>

<a {href} {target} {...rest}>
  {if icon}
    <Icon {icon}>{render children?.()}</Icon>
  {else}
    {render children?.()}
  {/if}
</a>
