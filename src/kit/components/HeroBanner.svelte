<script>
  import { getContext, onDestroy } from 'svelte';

  // A full-viewport picture with the page's headline on top. `headline` and `subheadline`
  // are snippets, `children` holds the buttons. `scrollTo` is the id of the section below
  // the hero, shown as a scroll hint.
  let { image, scrollTo, contrast = true, headline, subheadline, children, ...rest } = $props();

  // The nav sits on the picture, so it takes the contrast styling while the hero is shown
  const pageConfig = getContext('pageConfig');
  if (contrast) {
    pageConfig.contrast = true;
    onDestroy(() => { pageConfig.contrast = false; });
  }

  function onclick(event) {
    event.preventDefault()
    const app = document.getElementById('app');
    const scrollTo =  document.getElementById(event.currentTarget.hash.substr(1));
    if (scrollTo && app) {
      app.scrollTo({ top: scrollTo.offsetTop, behavior: 'smooth' });
    }
  }
</script>

<style>
  .image {
    position: absolute;
    z-index: -2;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    min-height: calc(30rem + 6rem); /* Need to add 6rem to account for the 6rem substracted in .hero below */
    background: var(--background-image);
    background-size: cover; /* Ensures the image covers the entire div */
    background-position: top;
    background-repeat: no-repeat;
  }

  .hero {
    position: relative;
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    height: calc(100vh - 6rem); /* Account for nav bar */
    min-height: 30rem;
    color: white;
    /*padding: 1% 0 0 4.5%;*/
  }

  .hero-content {
    position: absolute;
    z-index: 1;
      max-width: 36rem;
      left: 6vw;
      top: 5vh;
  }

  @mobile {
    .hero-content {
      max-width: unset;
      left: 0;
      top: 0;
    }
  }

  @large {
    .hero-content {
      max-width: 36rem;
    }
  }

  @dark div.image div {
    background: rgba(0, 0, 0, 0.5);
    width: 100%;
    height: 100%;
  }


  h1 {
    font-size: 250%;
    text-align: left;
    position: relative;
    display: inline-block;
  }

  p {
    font-size: 120%;
    line-height: 125%;
    text-align: left;
    margin-block: 0.75rem;
    max-width: 100%;
  }

  .buttons {
    margin-top: 1.5rem;
    [role="button"] {
      margin-right: 1rem;
    }
  }


  .fly-in {
    animation: flyIn 0.5s ease-out forwards;
    opacity: 0; /* Start invisible */
    transform: translateY(30px); /* Start below final position */
  }

  @keyframes flyIn {
    from {
      opacity: 0;
      transform: translateY(30px); /* Start position */
    }
    to {
      opacity: 1;
      transform: translateY(0); /* End position */
    }
  }

  .fade-in {
    opacity: 0; /* Start with the element hidden */
    animation: fadeIn 1s forwards; /* 2s duration, 1s delay */
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  a#scroll {
    padding-top: 60px;
    span {
      position: absolute;
      display: block;
      bottom: 6%;
      left: 50%;
      right: 50%;
      width: 1.75rem;
      height: 3.5rem;
      margin-left: -1rem;
      border: 0.15rem solid var(--pico-contrast);
      border-radius: 5rem;
      @light & {
        border-width: 0.2rem;
      }
    }
    span::before {
      position: absolute;
      top: 0.5rem;
      left: 50%;
      content: '';
      width: 0.5rem;
      height: 0.5rem;
      margin-left: -0.25rem;
      background-color: var(--pico-contrast);
      border-radius: 100%;
      animation: sdb10 2s infinite;
    }
  }



  @keyframes sdb10 {
    0% {
      transform: translate(0, 0);
      opacity: 0;
    }
    40% {
      opacity: 1;
    }
    80% {
      transform: translate(0, 1.75rem);
      opacity: 0;
    }
    100% {
      opacity: 0;
    }
  }
</style>

<div class="image" style='--background-image:url({image});'>
  <div></div>
</div>
<section class="hero fly-in" {...rest}>
  <hgroup class="hero-content">
    <h1>{render headline()}</h1>
    {if subheadline}
      <p>{render subheadline()}</p>
    {/if}
    {if children}
      <div class="buttons fade-in">{render children()}</div>
    {/if}
  </hgroup>
  {if scrollTo}
    <a id="scroll" {onclick} href={scrollTo}><span></span></a>
  {/if}
</section>
