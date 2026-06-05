<script>
  import { Button } from 'svultra/kit/components';

  const shared = { class: 'outline', type: 'button' };
  let busy = $state(false);
</script>

<style>
  Button {
    text-transform: uppercase;
    &.cta  { font-weight: bold; padding-inline: 2rem; }
    &.busy { opacity: 0.6; cursor: progress; }
  }
</style>

<Button {...shared} class="cta" class:busy onclick={() => busy = !busy}>
  {busy ? 'Saving…' : 'Save'}
</Button>
