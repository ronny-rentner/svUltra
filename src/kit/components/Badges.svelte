<script module>
/*
  export { default as Badge } from '@components/Badge.svelte';
 */
</script>

<script>
  let { children, ...rest } = $props();
</script>

<style>
  div {
    display: flex;
    margin-bottom: calc(var(--pico-spacing) * 0.5);
    gap: calc(var(--pico-spacing) * 0.5);
  }
</style>

<div {...rest}>{@render children()}</div>
