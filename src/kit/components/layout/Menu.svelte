<script>
  import { baseUrl, currentPath } from '#kit/router/Router.svelte';

  import LoginForm from '#kit/components/LoginForm.svelte';
  import ContactForm from '#kit/components/ContactForm.svelte';
  import UserMenu from './UserMenu.svelte';
  import ToggleDarkMode from '#kit/components/ToggleDarkMode.svelte';
  //import { configStore as config } from '#kit/stores.js';

  import { personStore as person /*, authLoading */ } from '#kit/stores.js';


  let { items, contrastMode, ...rest } = $props();

  function isActive(path) {
    //console.log('isActive()', path, window.location.pathname);
    return $currentPath === path ? 'active' : '';
  }

  //$inspect($contrastMode);

</script>

<style>
  ul.menu {
    a.active {
      text-decoration: none;
      font-weight: bold;
      /*transition: font-weight 0.3s ease-in-out;*/
    }

    a {
      position: relative;
      transition: none !important;
      text-decoration: none;
    }

    a:hover::before {
      transform: scaleX(1);
      /*text-decoration: none;*/
    }

    a::before {
      content: "";
      position: absolute;
      display: block;
      width: 100%;
      height: 2px;
      bottom: 0.5rem;
      left: 0;
      background-color: var(--pico-primary);
      transform: scaleX(0);
      transition: transform 0.3s ease;
    }

    ToggleDarkMode {
        transition: none;
    }

    &.contrast {
      a {
        color: var(--pico-contrast);
      }
      a:hover {
        color: var(--pico-contrast);
        text-decoration-color: var(--pico-contrast);
        text-decoration: none;
      }

      a::before {
        background-color: var(--pico-contrast);
      }

      ToggleDarkMode {
        transition: color, border-color 0.3s ease;
        color: var(--pico-contrast);
        border-color: var(--pico-contrast);
        --pico-primary-focus: var(--pico-primary);
      }

      UserMenu {
        transition: color, border-color 0.3s ease;
        --pico-color: var(--pico-contrast);
        --pico-border-color: var(--pico-contrast);
        /*--pico-primary-focus: var(--pico-secondary-focus);*/

        &::after {
          --pico-background-color: var(--pico-contrast);
        }
      }
    }
  }

</style>


<ul class="menu" class:contrast={contrastMode}>
  {#each items as { path, label }}
    <li><a href={`${baseUrl}${path}`} class={isActive(path)}>{label}</a></li>
  {/each}
  <li>
    <ContactForm let:onclick>
      <a href={"#"} class="" {onclick}>Contact</a>
    </ContactForm>
  </li>
  {#if $person}
    <li><UserMenu /></li>
  {:else}
    <li><LoginForm /></li>
  {/if}
  <li><ToggleDarkMode /></li>
</ul>
