<script>
import Main from './Main.svelte';

let { showLogo = true, showMain = false, partial = false, text = "Loading", ...rest } = $props();
</script>

<style>
div {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
  font-size: 1.5rem;

  /*
  &:not(.showLogo) {
  background-color: rgba(255, 255, 255, 0.5);

  @dark & {
  background-color: rgba(0, 0, 0, 0.5);
  }
  }
   */

  &.partial {
    position: absolute;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
  }

  h3 {
    margin: 0;
  }

  svg {
    width: 3rem;
    height: 3rem;
    /* margin-left needs to be zero or the whole element is not fully centered */
    margin: 1rem 1rem 1rem 0;
  }

  span {
    animation: appear 1.5s infinite ease-in-out;

    /* Apply staggered delays to create a sequential appearance */
    &:nth-child(1) { animation-delay: 0.3s; }
    &:nth-child(2) { animation-delay: 0.6s; }
    &:nth-child(3) { animation-delay: 0.9s; }

    @keyframes appear {
      0%, 20% { opacity: 0; }   /* Start invisible */
      40%, 80% { opacity: 1; }  /* Appear in sequence */
      100% { opacity: 0; }      /* All disappear together */
    }
  }

}

</style>

{snippet overlay()}
  <div class:showLogo class:partial>
    {if showLogo}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 35 40">
        <path
          d="M0 .28v9.23a3.002 3.002 0 0 0 1.53 2.64l12.61 7.27a.289.289 0 0 1 0 .5L1.52 27.19A3.003 3.003 0 0 0 0 29.83v9.265a.261.261 0 0 0 .39.225L33.8 20.06a.451.451 0 0 0 0-.78L.42 0A.281.281 0 0 0 0 .28Z"
          fill="#006872"
          transform="translate(.003 .04)"
        />
        <path
          d="m20.72 39.07 12.94-7.46a.542.542 0 0 0 0-.94l-12.94-7.46a.553.553 0 0 0-.82.47V38.6a.553.553 0 0 0 .82.47Z"
          fill="#009298"
        />
      </svg>
    {/if}
    <h3>{text}<span>.</span><span>.</span><span>.</span></h3>
  </div>
{/snippet}

{if showMain}
  <Main style="height:100vh" >
    {render overlay()}
  </Main>
{else}
  {render overlay()}
{/if}
