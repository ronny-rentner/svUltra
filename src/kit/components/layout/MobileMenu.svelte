<script>
    //import LoginForm from '#kit/components/LoginForm.svelte';
    import ContactForm from '#kit/components/ContactForm.svelte';
    //import UserMenu from './UserMenu.svelte';
    //import ToggleDarkMode from '#kit/components/ToggleDarkMode.svelte';

    import { fly, /*scale,*/ slide } from 'svelte/transition';
    import { quadOut } from 'svelte/easing';

    import { base, currentPath } from '#kit/router/Router.svelte';

    let { open = $bindable(), contrastMode = false, items } = $props()

    // Helper function to determine if a link is active
    function isActive(path) {
        //console.log('isActive()', path, window.location.pathname);
        return currentPath === path ? 'active' : '';
    }

    function close(event) {
      open = false;
    }

    function fadeScale (
      node, { delay = 0, duration = 200, easing = x => x, baseScale = 0 }
    ) {
      const o = +getComputedStyle(node).opacity;
      const m = getComputedStyle(node).transform.match(/scale\(([0-9.]+)\)/);
      const s = m ? m[1] : 1;
      const is = 1 - baseScale;

      return {
        delay,
        duration,
        css: t => {
          const eased = easing(t);
          return `transform: scaleX(${(eased * s * is) + baseScale})`;
        }
      };
    }
</script>

{#if open}
  <ul class="container-fluid" transition:slide>
    {#each items as { path, label }, i}
        <li in:fly|global={{ y: -15, delay: 50 * i }}>
          <a href={`${base}${path}`} class={isActive(path)} onclick={close}>{label}</a>
        </li>
    {/each}
    <li><hr /></li>
    <li><ContactForm let:onclick><a {onclick}>Contact</a></ContactForm></li>
    <li class="bar" in:fadeScale|global={{ delay: 200, duration: 400, easing: quadOut, opacity: 1 }}></li>
  </ul>
{/if}

<style>
  ul {
    text-align: center;
    font-size: 1.25em;
    font-family: Mulish, var(--pico-font-family-sans-serif);
    letter-spacing: 0.15em;
    padding: 0;
    margin: 0;
    /*color: #eef;*/
    /*flex-basis: 100%;*/
    position: absolute;
    top: 0;
    padding-top: 4.5rem;
    left: 0;
    right: 0;
    background: var(--pico-background-color);
    z-index: 10;
    list-style: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: var(--pico-box-shadow);
  }

  li {
    cursor: pointer;
    margin: 0;
    padding: 0.25rem 0;
    display: block;
    width: 100%;

    a {
      display: block;
      margin: 0 auto;
      padding-block: 0.5rem;
      text-decoration: none;

      &:hover, &:active {
        text-decoration: underline;
      }
    }

    &.bar {
      border-style: solid;
      border-color: var(--pico-primary-border);
      height: 0.1rem;
      width: 100%;
      padding: 0;
      margin-top: 0.75rem;
      /*position: relative;
      top: 1.5rem;*/
    }

    hr {
      margin: 0;
    }
  }
</style>
