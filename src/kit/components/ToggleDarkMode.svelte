<script>
  import Button from './Button.svelte';
  import Icon from './IconWithLabel.svelte';

  import sunIcon  from '#kit/assets/icons/sun.js';
  import moonIcon from '#kit/assets/icons/moon.js';

  import { configStore as config } from '#kit/stores.js';

  let { mobile, ...rest } = $props();

  let rotate = $state(false);

  const size = mobile ? "1.25rem" : "1rem";

  function onclick(event) {
    rotate = true;
    setTimeout(() => rotate = false, 500);
    config.update({darkMode: !!! $config?.darkMode });
    console.log('Toggle dark mode: ', $config.darkMode);
  }

  $effect(() => {
    document.documentElement.setAttribute('data-theme', $config.darkMode ? 'dark' : 'light');
  });
</script>

<style>
  @keyframes rotate-fade-animation {
    0% {
      transform: rotate(0deg);
      opacity: 0;
    }
    100% {
      transform: rotate(360deg);
      opacity: 1;
    }
  }

  Button.mobile {
    width: 3rem;
  }

  Button {
    width: 2.25rem;
  }

  Icon {
    margin: 0;
    vertical-align: -.15rem;
    width: 1rem;
    height: 1rem;
    overflow: hidden;

    &.rotate {
      animation: rotate-fade-animation 0.5s ease-in-out;
    }

    &.mobile {
      vertical-align: -.25rem;
      width: 1.25rem;
      height: 1.25rem;
    }
  }
</style>

<Button class="primary outline special" class:mobile {...rest} {onclick}>
  {#if $config.darkMode}
    <Icon icon={sunIcon} class:rotate class:mobile {size} />
  {:else}
    <Icon icon={moonIcon} class:rotate class:mobile {size} />
  {/if}
</Button>

{#if 0}<p/>{/if}
