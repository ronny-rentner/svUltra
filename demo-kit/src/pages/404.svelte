<script>
  import { Main } from 'svultra/kit/components';

  import src from '@assets/404.webp';

  let { meta, ...rest } = $props();
  meta({
    title: '404 - Page Not Found',
    description: '404 - Page Not Found'
  });
</script>


<style>
Main {
  text-align: center;
  h1 {
    position: relative;
    top: 6rem;
    margin-top: -2rem;
    font-size: 3rem;
  }

  img {
    border-radius: 0.5rem;
  }
}
</style>

<Main {...rest}>
  <h1>404 - Page Not Found!</h1>
  <img {src} alt="404" />
</Main>
