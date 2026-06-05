<script>
  import Button from '@components/Button.svelte';
  import Card from '@components/Card.svelte';
  import IconWithLabel from '@components/IconWithLabel.svelte';
  import sparklesIcon from '@icons/ph/sparkle-duotone';
  import rocketIcon   from '@icons/ph/rocket-launch-duotone';
  import trashIcon    from '@icons/ph/trash-duotone';
  import checkIcon    from '@icons/ph/check-circle-duotone';

  let status = $state('idle');

  function publish() {
    status = 'pending';
    setTimeout(() => status = 'done', 1500);
  }
</script>

<style>
  Card {
    max-width: 30rem;

    IconWithLabel { color: var(--pico-primary); }

    footer {
      display: flex;
      gap: 0.5rem;

      Button:last-child {
        margin-left: auto;
        min-width: 9rem;
      }
    }
  }
</style>

<Card>
  {#snippet header()}
    <IconWithLabel icon={status === 'done' ? checkIcon : sparklesIcon}>Release 2.4</IconWithLabel>
  {/snippet}

  <p>
    {status === 'done' ? 'Live in production.' : 'All checks passed. Roll it out when you’re ready.'}
  </p>

  <footer>
    <Button class="secondary" icon={trashIcon} disabled={status !== 'idle'}>Discard</Button>
    <Button icon={rocketIcon} onclick={publish} disabled={status !== 'idle'}>
      {status === 'idle' ? 'Publish' : status === 'pending' ? 'Publishing…' : 'Published'}
    </Button>
  </footer>
</Card>
