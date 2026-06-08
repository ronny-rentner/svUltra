<script>
  import Button from '#kit/components/Button.svelte';

  import LoginForm from '#kit/components/LoginForm.svelte';
  import loginIcon from '@iconify-icons/ph/sign-in-duotone';

  import ToggleDarkMode from '#kit/components/ToggleDarkMode.svelte';
  //import ContactForm from '#kit/components/ContactForm.svelte';
  import UserMenu from './UserMenu.svelte';

  import { personStore as person /*, authLoading */ } from '#kit/stores.js';

  let { open = $bindable(), contrastMode = false, children, ...props } = $props();

  //const defaultStyle = "hamburger--emphatic";
  //const defaultStyle = "hamburger--elastic";
  const defaultStyle = "hamburger--spin";

  function onclick(event) {
    open = !open;
  }

</script>

<style>
  .hamburger,
  .hamburger:focus {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    transition-property: opacity, filter;
    transition-duration: 0.15s;
    transition-timing-function: linear;
    background-color: transparent;
    border: 0;
    margin: 0;
    box-shadow: none;
    overflow: visible;
    z-index: 20;
    margin-right: calc(var(--pico-nav-element-spacing-horizontal) * -1);

    @mobile {
      padding: 0 0.5rem;
    }
  }

  .hamburger {
    &.open .hamburger-inner,
    &.open .hamburger-inner::before,
    &.open .hamburger-inner::after {
      background-color: var(--pico-background-color);
    }

    .hamburger-box {
      width: 2rem;
      height: 2rem;
      display: inline-block;
      position: relative;
    }

    .hamburger-inner {
      display: block;
      top: 50%;
      margin-top: -2px;
    }

    .hamburger-inner,
    .hamburger-inner::before,
    .hamburger-inner::after {
      width: 2rem;
      height: 4px;
      background-color: var(--pico-background-color);
      border-radius: 4px;
      position: absolute;
      transition-property: transform;
      transition-duration: 0.15s;
      transition-timing-function: ease;
    }

    .hamburger-inner::before,
    .hamburger-inner::after {
      content: "";
      display: block;
    }

    .hamburger-inner::before {
      top: -10px;
    }

    .hamburger-inner::after {
      bottom: -10px;
    }

    &.hamburger--spin {
      .hamburger-inner {
        transition-duration: 0.22s;
        transition-timing-function: cubic-bezier(0.55, 0.055, 0.675, 0.19);
      }

      .hamburger-inner::before {
        transition: top 0.1s 0.25s ease-in, opacity 0.1s ease-in;
      }

      .hamburger-inner::after {
        transition: bottom 0.1s 0.25s ease-in,
          transform 0.22s cubic-bezier(0.55, 0.055, 0.675, 0.19);
      }

      &.open {
        .hamburger-inner {
          transform: rotate(225deg);
          transition-delay: 0.12s;
          transition-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
        }

        .hamburger-inner::before {
          top: 0;
          opacity: 0;
          transition: top 0.1s ease-out, opacity 0.1s 0.12s ease-out;
        }

        .hamburger-inner::after {
          bottom: 0;
          transform: rotate(-90deg);
          transition: bottom 0.1s ease-out,
            transform 0.22s 0.12s cubic-bezier(0.215, 0.61, 0.355, 1);
        }
      }
    }
  }

  Button, ToggleDarkMode, UserMenu {
    border: 0;

    &.contrastMode {
      --pico-color: var(--pico-contrast) !important;
      transition: color, background-color 0.4s ease;
    }

    @mobile {
      padding: 0 0.5rem;
    }
  }

  /* Hamburger menu button high contrast mode */
  button span.contrastMode {
    transition: color, background-color 0.4s ease;
    --pico-background-color: var(--pico-contrast);
  }
</style>

<ToggleDarkMode class:contrastMode mobile />

{#if $person}
  <UserMenu class:contrastMode mobile></UserMenu>
{:else}
  <LoginForm let:onclick>
    <Button {onclick} icon={loginIcon} iconSize="2rem" class="outline" class:contrastMode />
  </LoginForm>
{/if}

<button class="hamburger {defaultStyle}" class:open type="button" {onclick}>
  <span class="hamburger-box" class:contrastMode>
    <span class="hamburger-inner"></span>
  </span>
</button>
