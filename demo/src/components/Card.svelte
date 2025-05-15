<script>
  let { 
    title, 
    footer, 
    loading = false,
    tooltip,
    placement,
    children,
    ...rest 
  } = $props();
  
  import LoadingIndicator from '@components/LoadingIndicator.svelte';
</script>

<style>
  /* Style the article to get PicoCSS card styling */
  article {
    margin-bottom: 1rem;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    
    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    
    /* Style the LoadingIndicator when inside a card */
    LoadingIndicator {
      padding: 0.5rem;
    }
  }
  
  /* Styling for card parts */
  .card-header {
    padding-bottom: 0.5rem;
    margin-bottom: 0.5rem;
    border-bottom: 1px solid var(--card-border-color, #eee);
  }
  
  .card-content {
    padding: 0.5rem 0;
  }
  
  .card-footer {
    padding-top: 0.5rem;
    margin-top: 0.5rem;
    border-top: 1px solid var(--card-border-color, #eee);
    text-align: right;
  }
</style>

<article {tooltip} {placement} {...rest}>
  {if title}
    <header class="card-header">
      <h3>{title}</h3>
    </header>
  {/if}
  
  <div class="card-content">
    {if loading}
      <LoadingIndicator {loading} />
    {elif children}
      {render children()}
    {else}
      <p>No content provided</p>
    {/if}
  </div>
  
  {if footer}
    <footer class="card-footer">
      {footer}
    </footer>
  {/if}
</article>
