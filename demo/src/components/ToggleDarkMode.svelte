<script>
  import Button from '@components/Button.svelte';
  import Icon from '@components/Icon.svelte';
  
  // Import sun/moon icons for theme toggle
  import sunIcon from '@icons/ph/sun-duotone';
  import moonIcon from '@icons/ph/moon-duotone';
  
  let { tooltip = "Toggle dark mode", placement = "bottom" } = $props();
  
  // Track the dark mode state
  let darkMode = $state(false);
  let rotate = $state(false);
  
  // Initialize from system preference or localStorage
  $effect(() => {
    const storedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    darkMode = storedTheme === 'dark' || 
               (!storedTheme && prefersDark);
    
    updateTheme();
  });
  
  function onclick() {
    darkMode = !darkMode;
    rotate = true;
    updateTheme();
    
    setTimeout(() => {
      rotate = false;
    }, 500);
  }
  
  function updateTheme() {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }
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
  
  Button {
    width: 2.5rem;
    padding: 0.4rem;
  }
  
  Icon {
    margin: 0;
    
    &.rotate {
      animation: rotate-fade-animation 0.5s ease-in-out;
    }
  }
</style>

<Button 
  class="outline" 
  {tooltip} 
  {placement} 
  {onclick}
>
  {if darkMode}
    <Icon icon={sunIcon} class:rotate size="1.25rem" />
  {else}
    <Icon icon={moonIcon} class:rotate size="1.25rem" />
  {/if}
</Button>