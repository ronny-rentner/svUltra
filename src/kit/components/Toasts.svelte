<script context="module">
  import { SvelteToast, toast } from '#kit/components/toast/index.js'

  // The library's name for the second stack, at the top; a toast goes there with { top: true }
  const topTarget = 'top';

  export const toastSuccess = (msg, { top, ...props } = {}) => toast.push(msg, {
    //initial: 0,
    theme: {
      /*'--toastColor': 'mintcream',
      '--toastBackground': 'rgba(72,187,120,0.9)',
      '--toastBarBackground': '#2F855A'*/
    },
    classes: ['success'],
    target: top ? topTarget : 'default',
    ...props
  });

  export const toastWarning = (msg, { top, ...props } = {}) => toast.push(msg, {
    //initial: 0,
    theme: {
      /*'--toastColor': 'mintcream',
      '--toastBackground': 'rgba(72,187,120,0.9)',
      '--toastBarBackground': '#2F855A'*/
    },
    classes: ['warning'],
    target: top ? topTarget : 'default',
    ...props
  });

  export const toastPop = (id) => toast.pop(id);

</script>

<script>
  const options = {
    duration: 4000,       // duration of progress bar tween to the `next` value
    initial: 1.0,         // initial progress bar value
    next: 0,              // next progress value
    pausable: true,       // pause progress bar tween on mouse hover
    dismissable: true,    // allow dismiss with close button
    reversed: true,       // insert new toast to bottom of stack
    intro: { y: 256 },    // toast intro fly animation settings

    //test
    theme: {},            // css var overrides

    classes: ['toast']    // user-defined classes
  }

  // The top stack's toasts come in from above, and a new one goes next to the top edge
  const topOptions = { ...options, reversed: false, intro: { y: -256 } };

</script>

<style>
  :root {
    /* Where the top stack starts; a site with a fixed header sets it below the header */
    --toastContainerTop: 6vh;
    --toastContainerRight: 0;
    --toastContainerBottom: 6vh;
    --toastContainerLeft: 0;
    --toastBorderRadius: var(--pico-border-radius);
    --toastProgressBackground: rgba(255, 255, 255, 0.2);
  }

  div {
    /* The bottom stack spans the viewport between both distances, so its box does not change with its toasts: a leaving
       toast, taken out of the flow, keeps its place while it fades */
    :global(> ul) {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;
      :global(> li) {
        list-style: none;
        --toastWidth: fit-content;
      }
    }
  }

  /* The top stack ends below its last toast */
  div.top {
    --toastContainerBottom: auto;
  }

  div > :global(ul > li progress) {
    margin-bottom: 0;
  }

  div > :global(ul > li.toast.success) {
    --toastBackground: var(--pico-form-element-valid-active-border-color);
  }

  div > :global(ul > li.toast.warning) {
    --toastBackground: var(--pico-form-element-invalid-active-border-color);
  }

  div > :global(ul > li div._toastMsg) {
    padding: var(--pico-form-element-spacing-vertical) var(--pico-form-element-spacing-horizontal);
    /* Links in the toast's text colour instead of the primary one, with Pico's link look: a half-transparent underline
       that turns solid on hover */
    --pico-primary: currentColor;
    --pico-primary-underline: color-mix(in srgb, currentColor 50%, transparent);
    --pico-primary-hover: currentColor;
    --pico-primary-hover-underline: currentColor;
  }

  div > :global(ul > li div._toastBtn) {
    background: transparent;
    border: 0;
    /* Pico's focus ring for the ✕ in the toast's text colour, half transparent like Pico's own */
    --pico-primary-focus: color-mix(in srgb, currentColor 50%, transparent);
  }

  /* Pico rings a button on any focus; the ring stays for the keyboard and goes after a click */
  div > :global(ul > li div._toastBtn:focus:not(:focus-visible)) {
    box-shadow: none;
  }
</style>

<div>
  <SvelteToast {options} class="someClass" />
</div>
<div class="top">
  <SvelteToast target={topTarget} options={topOptions} />
</div>
