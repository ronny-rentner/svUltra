<script>
  import { MediaQuery } from 'svelte/reactivity';

  let { query, children } = $props();

  const mq = $derived(new MediaQuery(query));
</script>

{@render children(mq.current)}
