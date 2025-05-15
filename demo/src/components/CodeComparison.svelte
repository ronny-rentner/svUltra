<script>
  // Capture the children to render them
  let { children, ...rest } = $props();
</script>

<div class="grid" {...rest}>
  {render children()}
</div>