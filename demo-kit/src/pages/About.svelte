<script>
  import { Main, Card, Button, Icon, Link, LoadingIndicator } from 'svultra/kit/components';
  import { toastSuccess, toastWarning } from 'svultra/kit/components/Toasts.svelte';
  import { smiley } from 'svultra/kit/assets/icons';

  let { meta, ...rest } = $props();
  meta({
    title: 'Components',
    description: 'A showcase of svUltra kit components.'
  });
</script>

<Main {...rest}>
  <h1>Components</h1>

  <Card>
    <h2 slot="header">Buttons</h2>
    <Button onclick={() => toastSuccess('Clicked')}>Default</Button>
    <Button class="secondary">Secondary</Button>
    <Button class="contrast" icon={smiley}>With icon</Button>
  </Card>

  <Card>
    <h2 slot="header">Icon and link</h2>
    <Icon icon={smiley}>Icon with label</Icon>
    <br />
    <Link href="/" icon={smiley}>Link with icon</Link>
  </Card>

  <Card>
    <h2 slot="header">Loading and toasts</h2>
    Loading <LoadingIndicator />
    <br />
    <Button onclick={() => toastSuccess('Saved')}>Success toast</Button>
    <Button class="secondary" onclick={() => toastWarning('Careful')}>Warning toast</Button>
  </Card>
</Main>
