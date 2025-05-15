<script>
  let { 
    title = 'Code Example', 
    children,
    ...rest 
  } = $props();
</script>

<style>
  code {
    white-space: pre;
    display: block;
  }
</style>

<article {...rest}>
  <p><strong>{title}</strong></p>
  <code>{render children()}</code>
</article>