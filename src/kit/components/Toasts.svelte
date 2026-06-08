<script context="module">
  import { SvelteToast, toast } from '@zerodevx/svelte-toast'

  export const toastSuccess = (msg, props={}) => toast.push(msg, {
    //initial: 0,
    theme: {
      /*'--toastColor': 'mintcream',
      '--toastBackground': 'rgba(72,187,120,0.9)',
      '--toastBarBackground': '#2F855A'*/
    },
    classes: ['success'],
    ...props
  });

  export const toastWarning = (msg, props={}) => toast.push(msg, {
    //initial: 0,
    theme: {
      /*'--toastColor': 'mintcream',
      '--toastBackground': 'rgba(72,187,120,0.9)',
      '--toastBarBackground': '#2F855A'*/
    },
    classes: ['warning'],
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


</script>

<style>
  :root {
    --toastContainerTop: auto;
    --toastContainerRight: auto;
    --toastContainerBottom: 6vh;
    --toastContainerLeft: 50%;
    --toastBorderRadius: var(--pico-border-radius);
    --toastProgressBackground: rgba(255, 255, 255, 0.2);
  }

  div {
    :global(> ul) {
      transform: translate(-50%, -50%);
      :global(> li) {
        list-style: none;
        --toastWidth: fit-content;
      }
    }
  }

  div > :global(ul > li progress) {
    margin-bottom: 0;
  }

  div > :global(ul > li.toast.success) {
    --toastBackground: var(--pico-primary-background);
  }

  div > :global(ul > li.toast.warning) {
    --toastBackground: var(--pico-form-element-invalid-active-border-color);
  }

  div > :global(ul > li div._toastMsg) {
    padding: var(--pico-form-element-spacing-vertical) var(--pico-form-element-spacing-horizontal);
  }

  div > :global(ul > li div._toastBtn) {
    background: transparent;
    border: 0;
  }
</style>

<div>
  <SvelteToast {options} class="someClass" />
</div>
