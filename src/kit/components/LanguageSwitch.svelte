<script>
  import { baseUrl, currentLanguage, currentRoute, navigate } from '#kit/router';
  import { configStore as config } from '#kit/stores';

  let { ...rest } = $props();

  function onclick(event) {
    const lang = event.target.hreflang;
    config.update({ language: lang });
    navigate($currentRoute.path, lang);
  }
</script>

<style>
  span {
    user-select: none;
    align-items: baseline;
    display: inline-flex;
    span {
      color: var(--pico-primary);
    }
  }
</style>

<span {...rest}>
  {each $currentRoute.variants as variant, i}
    {if i > 0}<span>&nbsp;·&nbsp;</span>{/if}
    <a href={baseUrl + variant.path} hreflang={variant.lang} class:active={variant.lang === $currentLanguage} {onclick}>{variant.lang}</a>
  {/each}
</span>
