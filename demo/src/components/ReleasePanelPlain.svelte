<script>
  import { Button, Card, IconWithLabel } from 'svultra/kit/components';
  import sparklesIcon from '@icons/ph/sparkle-duotone';
  import rocketIcon from '@icons/ph/rocket-launch-duotone';
  import trashIcon from '@icons/ph/trash-duotone';
</script>

<style>
  /* Can't select <Card> by name, so a class on the consumer side. */
  .release-panel { max-width: 30rem; }

  /* Can't reach IconWithLabel via scoped CSS, so :global() to pierce its scope. */
  .release-panel :global(.release-header) { color: var(--pico-primary); }

  .release-panel footer { display: flex; gap: 0.5rem; }

  /* Same for Button — needs its own class + :global() to land. */
  .release-panel footer :global(.publish) {
    margin-left: auto;
    min-width: 9rem;
  }
</style>

<Card class="release-panel">
  {#snippet header()}
    <IconWithLabel class="release-header" icon={sparklesIcon}>Release 2.4</IconWithLabel>
  {/snippet}

  <p>All checks passed. Roll it out when you’re ready.</p>

  <footer>
    <Button class="secondary" icon={trashIcon}>Discard</Button>
    <Button class="publish" icon={rocketIcon}>Publish</Button>
  </footer>
</Card>
