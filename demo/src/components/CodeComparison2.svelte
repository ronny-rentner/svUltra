<script>
  import { writable } from 'svelte/store';

  import { Button, CodeSource, IconWithLabel } from '@components';
  import oneIcon from '@icons/ph/number-circle-one-fill';
  import twoIcon from '@icons/ph/number-circle-two-fill';

  let {
    source,
    preprocessed,
    sourceTitle = 'You write',
    preprocessedTitle = 'Converted',
    label = '↑ Preprocess ↑',
    highlight,
  } = $props();

  let converted = $state('');
  let expanded = $state(false);

  function onclick() {
    converted = preprocessed;
  }
</script>

<style>
  .grid {
    grid-template-columns: minmax(0, 1fr) min-content minmax(0, 1fr);

    Button {
      writing-mode: vertical-rl;
      align-self: center;
      line-height: 1;
    }
  }
</style>

<div class="grid">
  <CodeSource bind:expanded {highlight}>
    <IconWithLabel slot="header" icon={oneIcon}>{sourceTitle}</IconWithLabel>
    {source}
  </CodeSource>
  <Button {onclick}>{label}</Button>
  <CodeSource bind:expanded {highlight}>
    <IconWithLabel slot="header" icon={twoIcon}>{preprocessedTitle}</IconWithLabel>
    {converted}
  </CodeSource>
</div>
