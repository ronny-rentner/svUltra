<script>
  import { onMount } from 'svelte';
  import { personStore as person } from '#kit/stores.js';
  import { navigate } from '#kit/router/Router.svelte';
  import Main from '#kit/components/Main.svelte';
  import Toaster, { /* toastSuccess, */ toastWarning } from '#kit/components/Toasts.svelte';

  onMount(() => {
    if (!$person) {
      navigate('/');
      toastWarning('Please signin first!');
    }
  });

  let { children, ...rest } = $props();
</script>

<style>
  div.grid {
    grid-template-columns: auto 1fr;
    @mobile {
      grid-template-columns: 1fr;
    }
  }

  div.content {
    position: relative;
    min-height: 100vh;
    padding: 1rem;
  }

  aside {
    margin-top: 3rem;
    margin-right: 1.5rem;

    li {
      padding-block: 0;
    }

    .header {
      padding-block: 1.25rem 0.25rem;
      font-weight: bold;

      &:first-child {
        padding-top: 0;
      }
    }

    @mobile {
      display: none;
    }
  }

</style>

{if $person}
<Main {...rest}>
  <div class="grid">
    <aside>
      <nav>
        <ul>
          <li class="header">Account</li>
          <li><a href="/account">Profile</a></li>
          <li><a href="/account/settings">Settings</a></li>
          <li><a href="/account/security">Security</a></li>
        </ul>
      </nav>
    </aside>

    <div class="content">{render children()}</div>
  </div>
</Main>
{else}
<Main style="height:100vh" {...rest}>
</Main>
{/if}
