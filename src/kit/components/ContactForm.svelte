<script module>
  // Default stub. The pattern is a singleton modal: `dialog` is a
  // module-level reference that the mounted instance writes via
  // bind:this; the named `onclick` export is what triggers (e.g. Footer)
  // import directly. Override svultra/kit/components/ContactForm.svelte
  // via Vite alias to wire up the real form / backend.

  import { toastWarning } from './Toasts.svelte';

  export let dialog;

  export function onclick(event) {
    event?.preventDefault?.();
    console.warn(
      'svultra/kit/components/ContactForm.svelte: default stub. ' +
      'Override via Vite alias to enable contact form.'
    );
    toastWarning('Contact form not configured. Override svultra/kit/components/ContactForm.svelte via Vite alias.');
  }
</script>

<slot {onclick}></slot>
