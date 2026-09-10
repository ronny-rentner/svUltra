<script>
  import { extract } from '../utils.js';

  // A full-viewport picture with the page's headline on top. `headline` and `subheadline`
  // are snippets, `children` holds the buttons. `scrollTo` is the id of the section below
  // the hero, shown as a scroll hint.
  let { image, scrollTo, headline, subheadline, children, ...rest } = $props();

  // Attributes reach the text block; `section:`-prefixed ones reach the section.
  rest = { ...rest };
  const sectionRest = extract(rest, 'section:');
</script>

<style>
  /* Out of the flow: reserves no height, so the page has to keep its own content clear. */
  section {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    min-height: 30rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--pico-contrast);
    background-size: cover; /* Ensures the image covers the entire section */
    background-position: top;
    background-repeat: no-repeat;

    @dark &::before {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
    }

    hgroup {
      /* Positioned to paint above the ::before layer */
      position: relative;
      z-index: 1;

      animation: flyIn 0.5s ease-out forwards;
      opacity: 0; /* Start invisible */
      transform: translateY(1.875rem); /* Start below final position */

      @mobile {
        padding-inline: 1rem;
        align-self: flex-end;
        margin-bottom: 15vh;
      }

      h1 {
        font-size: 250%;
        text-align: left;
        position: relative;
        display: inline-block;
        max-width: 36rem;
      }

      p {
        font-size: 120%;
        line-height: 125%;
        text-align: left;
        margin-block: 0.75rem;
        max-width: 36rem;
      }

      /* The buttons */
      div {
        margin-top: 1.5rem;
        opacity: 0; /* Start with the element hidden */
        animation: fadeIn 1s forwards;

        [role="button"] {
          margin-right: 1rem;
        }
      }
    }

    /* The scroll hint */
    a {
      padding-top: 3.75rem;

      span {
        position: absolute;
        display: block;
        bottom: 3%;
        left: 50%;
        right: 50%;
        width: 1.75rem;
        height: 3.5rem;
        margin-left: -0.875rem;
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
  }

  @keyframes flyIn {
    from {
      opacity: 0;
      transform: translateY(1.875rem); /* Start position */
    }
    to {
      opacity: 1;
      transform: translateY(0); /* End position */
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
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

<section style='background-image: url({image});' {...sectionRest}>
  <hgroup class:container={1} {...rest}>
    <h1>{render headline()}</h1>
    {if subheadline}
      <p>{render subheadline()}</p>
    {/if}
    {if children}
      <div>{render children()}</div>
    {/if}
  </hgroup>
  {if scrollTo}
    <a href={scrollTo}><span></span></a>
  {/if}
</section>
