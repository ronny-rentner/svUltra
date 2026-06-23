<script>
  import Icon from '@iconify/svelte';
  import defaultIcon from '#kit/assets/icons/smiley.js';

  let {
    icon = defaultIcon,
    size = '1.25rem',
    width = size,
    height = size,
    tooltip,
    placement,
    children,
    label = children,
    ...rest
  } = $props();
</script>

<style>
  Icon {
    flex-shrink: 0;
  }

  span.wrapper {
    display: inline-flex;
    align-items: center;

    Icon {
      margin-right: 0.25rem;
    }

    > span {
      align-self: baseline;
    }
  }
</style>

{if label}
  {if icon}
    <span {...rest} class="wrapper {rest?.class}" {tooltip} {placement}>
      <Icon {icon} {width} {height} />
      <span>{render label()}</span>
    </span>
  {else}
    {render label()}
  {/if}
{else}
  <Icon {icon} {width} {height} {tooltip} {placement} {...rest} />
{/if}
