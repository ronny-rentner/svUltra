<script>
import { onMount, onDestroy } from 'svelte';

import { personStore as person } from '#kit/stores.js';
import { signOut } from '#kit/api.js';
import { accordion } from '#kit/actions/accordion.js';
import Icon from '#kit/components/IconWithLabel.svelte';
import Link from '#kit/components/LinkWithIcon.svelte';
import accountIcon from '@iconify-icons/ph/user-square-duotone';
import signOutIcon from '@iconify-icons/ph/sign-out-duotone';


import Toaster, { toastSuccess /*, toastWarning */ } from '#kit/components/Toasts.svelte';

import { ripple } from '#kit/actions/ripple.js';

import { navigate } from '#kit/router/Router.svelte';

let { mobile = false, ...rest } = $props();

let details;

const size = mobile ? '1.5rem' : '1.25rem';

function onclick(event) {
  event.preventDefault();
  signOut();
  toastSuccess('See you next time!');
  navigate('/');
}

function popstate(event) {
  /* When the user browses to some other page, we close the user menu */
  details.open = false;
}

onMount(() => {
  window.addEventListener('popstate', popstate);
});

onDestroy(() => {
  window.removeEventListener('popstate', popstate);
});

</script>

<style>
details.dropdown {
  display: inline-block;
  margin: 0;

  ul {
    left: auto;
    right: 0;

    li {

      &:has(>hr) {
        margin: 0;
        padding: 0;
        height: 1rem;

        hr {
          margin: 0.5rem 0;
        }
      }

      p {
        margin-bottom: 0;
      }
    }
  }

  summary {
    display: flex;
    align-items: center;
    overflow: hidden;

    &.mobile {
      height: 100%;
      border: 0;
      padding: 0.5rem;
    }
  }
}

details.dropdown summary :global(svg) {
  margin-right: 0.25rem;
}

details.dropdown ul li :global(svg) {
  margin-right: 0.25rem;
}
</style>

<details bind:this={details} use:accordion class="dropdown" >
  <summary use:ripple role="button" class:mobile class="primary outline {{...rest}.class}"><Icon icon={accountIcon} {size} />{if ! mobile}{$person.first_name}{/if}</summary>
  <ul>
    {#if $person}
      <li><p><strong>{$person.full_name}</strong><br />{$person.email}</p></li>
    {/if}
    <li><hr /></li>
    <li><Link href="/account" class="secondary" icon={accountIcon}>Account</Link></li>
    <li><Link {onclick} class="secondary" icon={signOutIcon}>Sign out</Link></li>
  </ul>
</details>
