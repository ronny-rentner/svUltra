<script>
import { onMount, onDestroy } from 'svelte';
import Button from './Button.svelte';

/* TODO: merge focus functions */
import { trapFocus } from 'trap-focus-svelte';
import autoFocus from '#kit/actions/autofocus.js';

let {
  showCloseButton = false,
  novalidate = true,
  //Setting noclose prevents the dialog from being closable
  noclose = false,
  noform = false,
  open = $bindable(),
  onsubmit,
  onclose,
  dialog = $bindable(),
  header,
  trigger,
  children,
  ...rest
} = $props();

// Config
const isOpenClass = "modal-is-open";
const openingClass = "modal-is-opening";
const closingClass = "modal-is-closing";
const animationDuration = 300; // ms
const html = document.documentElement;

let timeout = null;

export function show(event) {
  //console.log('show()', event, dialog);
  event?.preventDefault();
  clearTimeout(timeout);
  html.classList.remove(closingClass);
  dialog.showModal();

  //We're intentionally not setting this PicoCSS class on the dialogs as removing
  //it when closing via ESC key is flaky
  //html.classList.add(isOpenClass, openingClass);
  html.classList.add(openingClass);
  timeout = setTimeout(() => {
    html.classList.remove(openingClass);
  }, animationDuration);
  updateWidth();
}

export function updateWidth() {
  const article = dialog.firstElementChild;
  //console.log('Dialog article width: ', dialog, article, article.offsetWidth);
  article.style.width = `${article.offsetWidth}px`;
  //article.style.maxWidth = "none";
  //console.log('Dialog article result: ', article.style.width, article.style.maxWidth);
}

// Hide/cose the dialog when possible
export function hide(event) {
  //console.log('hide()', event, dialog);
  //clicked inside, so ignore
  if (noclose || (event.target != dialog)) {
    return;
  }
  event?.preventDefault();
  close(event);
}

// Actually close the dialog
export function close(event) {
  //console.log('close', event);
  event?.preventDefault();
  clearTimeout(timeout);
  if (!dialog.open) {
    //console.log('Dialog is not open, nothing to close.');
    return;
  }
  //console.log('Dialog is open, closing soon after animation.');
  html.classList.remove(openingClass);
  html.classList.add(closingClass);
  timeout = setTimeout(() => {
    html.classList.remove(closingClass, isOpenClass);
    //console.log('Dialog being closed now.');
    //This will trigger another run of the close function
    dialog.close();
  }, animationDuration);

  if (onclose) {
    onclose(event);
  }
}

/*
function keypress(event) {
  //console.log('keypress', event);
  if (event.key === 'Escape') {
    event?.preventDefault();

    if (noclose) {
      return;
    }

    close(event);
  }
  event.stopPropagation()
}
*/

function onclick(event) {
  if (event.target == dialog) {
    //We have to use hide() and not close() so the `noclose` property will be respected
    hide(event)
  }
}

onMount(() => {
  document.body.appendChild(dialog);
});

onDestroy(() => {
  clearTimeout(timeout);
  html.classList.remove(openingClass, closingClass, isOpenClass);
  dialog?.remove();
});

</script>

<style>
dialog {
  overflow: auto;
  scrollbar-gutter: stable;
}

dialog article {
  max-width: var(--max-width, unset);
  min-width: var(--min-width, unset);
  max-height: var(--max-height, unset);
  min-height: var(--min-height, unset);
  width: fit-content;
  border-radius: calc(var(--pico-border-radius) * 3);
  --pico-block-spacing-horizontal: calc(var(--pico-spacing) * 1.25);
  --pico-block-spacing-vertical: calc(var(--pico-spacing) * 1);
  overflow: hidden;

  position: relative;

  display: flex;
  flex-direction: column;

  margin: auto 0;

  :global(input:not([type="checkbox"], [type="radio"]), select, textarea) {
    margin-bottom: calc(var(--pico-spacing) * 0.5);
  }

  :global(:where(input, select, textarea) + small) {
    margin-top: calc(var(--pico-spacing) * -.35);
  }

  :global(input[type="checkbox"] + small) {
    margin-top: calc(var(--pico-spacing) * 0);
  }

  button[rel="prev"] {
    width: 1.5rem;
    height: 1.5rem;
    background-size: auto 1.25rem;
    opacity: 1;
    margin: 0;
    position: absolute;
    right: 1rem;
    top: 0.75rem;

    &.noheader {
      position: absolute;
      right: 0.5rem;
      top: 0.25rem;
    }
  }

  header {
    padding: calc(var(--pico-block-spacing-vertical) * 0.75) calc(var(--pico-block-spacing-horizontal) * 1);
    :global(h2) {
      --pico-font-size: 110%;
    }
  }


  form {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    /* margin: calc(var(--pico-block-spacing-horizontal) * -1); */
  }

  &.noform {
    margin: 0;
    padding: 0;

    header {
      margin: 0;
    }

  }


  :global(footer) {
    padding: calc(var(--pico-block-spacing-vertical) * 1) var(--pico-block-spacing-horizontal);
    margin-block: 0 calc(var(--pico-block-spacing-vertical) * -1);
    margin-inline: calc(var(--pico-block-spacing-horizontal) * -1);
    background-color: var(--pico-card-sectioning-background-color);
    border-top: var(--pico-border-width) solid var(--pico-card-border-color);
    /*
    border-bottom-right-radius: var(--pico-border-radius);
    border-bottom-left-radius: var(--pico-border-radius);
     */
    text-align: right;
    display: flex;
    flex-direction: row-reverse;
    gap: calc(var(--pico-form-element-spacing-horizontal) * 1);
  }
}

dialog article {
  :global(footer button[type="submit"]) {
    width: auto;
    margin-bottom: 0;
  }
  :global(form label > small) {
    margin: -0.25rem 0 0.25rem 0;
    display: block;
  }
}

</style>

<dialog bind:this={dialog} {open} {onclick} onclose={close} use:autoFocus use:trapFocus>
  <article class:noform {...rest}>
    {if header}
      <header>
        {if ! noclose}<button rel="prev" onclick={close}></button>{/if}
        {render header()}
      </header>
    {else}
      {if showCloseButton}<button class="noheader" rel="prev" onclick={close}></button>{/if}
    {/if}
    {if noform}
      {render children?.()}
    {else}
      <form method="dialog" {onsubmit} {novalidate}>
        {render children?.()}
        {if showCloseButton}
          <footer><Button onclick={close} autofocus>Close</Button></footer>
        {/if}
      </form>
    {/if}
  </article>
</dialog>

{render trigger?.(show)}
