<script>
  import LoadingIndicator from './LoadingIndicator.svelte';

  let { header, title, loading = false, tooltip, placement, children, ...rest } = $props();
</script>

<style>
  header {
    border-bottom-color: var(--pico-primary);
    font-weight: bold;
  }
</style>

<article {tooltip} {placement} {...rest}>
  {if header}
    <header>{render header()}</header>
  {elif title}
    <header>{title}</header>
  {/if}

  {if loading}
    <LoadingIndicator {loading} />
  {elif children}
    {render children()}
  {/if}
</article>
