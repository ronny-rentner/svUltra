<script>
  //import { fade } from 'svelte/transition';

  import logo     from '#kit/assets/logo.svg';
  import logoDark from '#kit/assets/logo-dark.svg';

  import MediaQuery from './MediaQuery.svelte';
  import MobileMenuButton from './layout/MobileMenuButton.svelte';
  import MobileMenu from './layout/MobileMenu.svelte';
  import Menu from './layout/Menu.svelte';

  //import ToggleDarkMode from './ToggleDarkMode.svelte';

  //import AccountLayout from './layout/Account.svelte';

  import Footer from './layout/Footer.svelte';

  //import { personStore as person, authLoading } from '#kit/stores.js';
  import { onMount, setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import { configStore as config } from '#kit/stores.js';

  import Toaster /*, { toastSuccess, toastWarning }*/ from './Toasts.svelte';

  //import { renderSnippetToHTML } from '../snippet.svelte.js';

  let { layoutConfig, children } = $props();

  let mobileMenuOpen = $state(false);

  let header;

  setContext('layoutConfig', layoutConfig);
  let contrastMode = $derived(layoutConfig['contrast']);

  //$effect(() => {
  //  console.log('contrastMode effect: ', contrastMode);
  //});
  $effect(() => {
    console.log('layoutConfig: ', { ... layoutConfig });
    layoutConfig;
  });


  // List of navigation items
  const items = [
    { path: '/',        label: 'Home' },
    { path: '/about',   label: 'About' },
    { path: '/pricing', label: 'Pricing' },
  ];

  //let useAccountLayout = $state();

  /*
  // Update the currentPath store when the URL changes
  function updateChildLayout(event) {
    const path = event ? event?.detail?.path : window.location.pathname;
    //TODO: Strange behaviour when browsing away from Signin with duplicate rendering
    useAccountLayout = path.startsWith('/account');
    //console.log('Update child layout', event, useAccountLayout);
  }
  updateChildLayout();

  // Listen for popstate and pushstate events
  onMount(() => {

    window.addEventListener('beforeNavigate', updateChildLayout);
    //window.addEventListener('popstate', updateChildLayout);
    //window.addEventListener('pushstate', updateChildLayout);

    return () => {
      window.removeEventListener('beforeNavigate', updateChildLayout);
      //window.removeEventListener('popstate', updateChildLayout);
      //window.removeEventListener('pushstate', updateChildLayout);
    };
  });
   */

</script>

<style>
  header {
    animation: fadeIn 0.5s ease-in forwards;
    position: relative;
    z-index: 100;
  }

  .logo {
    margin-top: 0;
    height: 2.5rem;
    will-change: filter;
    transition: filter 300ms;
    z-index: 20;
    position: relative;

    /*
    &:hover {
      filter: drop-shadow(0 0 1em #009298);
    }
     */
  }

  nav {
    flex-wrap: wrap;
    user-select: none;

    & > ul:first-child {
      flex-grow: 1;
    }

  }



</style>

<MediaQuery query="(max-width: 768px)" let:matches>
  {#if matches}
    <MobileMenu bind:open={mobileMenuOpen} {items} {contrastMode} />
  {/if}
<header class="container" bind:this={header}>
  <nav class:contrast={contrastMode}>
    <ul>
      <li>
        {#if $config.darkMode}
          <img src={logoDark} alt="Logo" class="logo" />
        {:else}
          <img src={logo} alt="Logo" class="logo" />
        {/if}
      </li>
    </ul>
    {#if matches}
      <MobileMenuButton bind:open={mobileMenuOpen} {contrastMode} />
    {:else}
      <Menu {items} {contrastMode} />
    {/if}
  </nav>
</header>
</MediaQuery>

{@render children()}

<Toaster />

<Footer />
