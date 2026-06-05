<script>
  import Icon from '@iconify/svelte';
  import defaultIcon from '../icons/smiley.js';

  let {
    icon = defaultIcon,
    iconSize = '1.25rem',
    width,
    height,
    size,
    label,
    tooltip,
    placement,
    children,
    ...rest
  } = $props();

  if (children) {
    label = children;
  }

  // Icons are supposed to be square
  if (size) {
    iconSize = size;
  }
  if (!width) {
    width = iconSize;
  }
  if (!height) {
    height = iconSize;
  }
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
