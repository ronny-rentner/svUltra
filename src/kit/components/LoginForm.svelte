<script>
  import Button from './Button.svelte';
  import loginIcon from '@iconify-icons/ph/sign-in-duotone';

  // Default stub. The real LoginForm lives in each consumer (per-app auth
  // flow). Override svultra/kit/components/LoginForm.svelte via Vite alias
  // to wire up your sign-in form / backend.
  function onclick(event) {
    event?.preventDefault?.();
    console.warn(
      'svultra/kit/components/LoginForm.svelte: default stub. ' +
      'Override via Vite alias to enable sign-in.'
    );
    alert('Sign-in not configured. Override svultra/kit/components/LoginForm.svelte via Vite alias.');
  }
</script>

<slot {onclick}>
  <Button {onclick} icon={loginIcon}>Sign in</Button>
</slot>
