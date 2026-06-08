<script>

  import Icon from '@iconify/svelte';

  import logo     from '#kit/assets/logo.svg'
  import logoDark from '#kit/assets/logo-dark.svg'

  import { configStore as config } from '#kit/stores.js';

  //import buildInfo from '/src/build-info.json';

  import twitterIcon   from '@iconify-icons/mdi/twitter';
  import facebookIcon  from '@iconify-icons/mdi/facebook';
  import instagramIcon from '@iconify-icons/mdi/instagram';

  import { onclick as showContactForm } from '#kit/components/ContactForm.svelte';

  const isProduction = !window.config?.dev;

  let screenStatus = '';

  /*
  $effect(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const devicePixelRatio = window.devicePixelRatio;
    const dpi = devicePixelRatio * 96; // 96 is default browser DPI

    console.log(`Viewport: ${viewportWidth}x${viewportHeight}, Screen: ${screenWidth}x${screenHeight}, DPR: ${devicePixelRatio}, DPI: ${dpi}`);
  });
   */

</script>

<style>
  footer {
    /*
     */
    padding: var(--pico-spacing) 0;
    border-top: 1px solid var(--pico-muted-border-color);
    margin-top: calc(var(--pico-spacing) * 8);

    div.grid {
      padding: var(--pico-spacing);
      justify-content: center;
      grid-template-columns: repeat(auto-fit,minmax(8rem,1fr));
      white-space: nowrap;

      div {
        padding-inline: 1rem;
      }

      div.grid-column {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding-inline: 0;

        .footer-icons {
          display: flex;
          width: 10rem;
          justify-content: space-between;
          align-items: center;
          a {
            display: inline-block;
            margin: auto;
            border-radius: var(--pico-border-radius);
            color: var(--pico-contrast);
          }
        }
      }
    }
  }

  @media mobile {
    div.grid {
      &, h4 {
        font-size: 110%;
      }
      ul li {
      margin-bottom: 1rem;
      }
    }
  }

  footer img.logo {
    height: 6rem;
    margin-bottom: 1rem;
    opacity: 0.7;
  }
  /*
  footer > div {
    flex: 1;
    margin: 1rem calc(var(--pico-spacing) * 2);
  }
   */
  footer h4 {
    margin-bottom: calc(var(--pico-typography-spacing-vertical) * 0.75);
  }
  footer ul, footer ul li {
    list-style-type: none;
    padding: 0;
  }
  footer a {
    text-decoration: none;
    color: var(--pico-secondary);
    transition: color var(--pico-transition);
    cursor: pointer;
  }
  footer a:hover {
    color: var(--pico-primary);
    text-decoration: var(--pico-text-decoration);
  }
  div.copyright {
    flex-basis: 100%;
    text-align: center;
    padding-top: calc(var(--pico-spacing) * 0.75);
    margin: 0;
    text-align: center;
    border-top: 1px solid var(--pico-muted-border-color);

    svg {
      width: 1.35rem;
      color: red;
    }

  }
  small {
    color: var(--pico-muted-color);
  }
</style>

<footer class="container">
  <div class="grid">
    <div class="grid-column">
      {#if $config.darkMode}
        <img src={logoDark} alt="Logo" class="logo" />
      {:else}
        <img src={logo} alt="Logo" class="logo" />
      {/if}
      <div class="footer-icons">
        <a href="#" aria-label="Twitter"><Icon icon={twitterIcon} /></a>
        <a href="#" aria-label="Facebook"><Icon icon={facebookIcon} /></a>
        <a href="#" aria-label="Instagram"><Icon icon={instagramIcon} /></a>
      </div>
    </div>
    <div>
      <h4>Site</h4>
      <ul>
        <li><a href="/about">About</a></li>
        <li><a onclick={showContactForm}>Contact</a></li>
        <li><a href="/pricing">Pricing</a></li>
      </ul>
    </div>
    <div>
      <h4>Legal</h4>
      <ul>
        <li><a href="/imprint">Imprint</a></li>
        <li><a href="/terms">Terms</a></li>
        <li><a href="/privacy">Privacy policy</a></li>
      </ul>
    </div>
  </div>
  <div class="copyright">
    <strong>© 2024 Your Company</strong>.
    <p>
    Crafted with <svg viewBox="0 0 24 24" class="inline inline w-6 h-6 text-red-600" xmlns="http://www.w3.org/2000/svg" data-v-67ce246f=""><path d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z" data-v-67ce246f=""></path></svg> with care.
    All rights reserved.
    </p>

    <small>
      {#if isProduction}
        Production mode
      {:else}
        Development mode
      {/if}
      <!-- &mdash; Last build: {buildInfo.lastBuildTimestamp} &mdash; v{buildInfo.buildNumber} -->
    </small>
  </div>

</footer>
