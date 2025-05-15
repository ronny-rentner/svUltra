<script>
  import Button from '@components/Button.svelte';
  import CodeExample from '@components/CodeExample.svelte';
  import CodeComparison from '@components/CodeComparison.svelte';

  // For dark mode toggle
  function onclick() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  }
</script>

<style>
  /* This is the exact :global style from our first example */
  :global(.btn-gradient) {
    background: linear-gradient(to right, #4776E6, #8E54E9);
    color: white;
    font-weight: bold;
  }

  /* This would be processed by svUltra in our second example */
  Button {
    background: linear-gradient(to left, #4776E6, #8E54E9);
    color: white;
    font-weight: bold;
  }
</style>

<h2>Component Styles</h2>
<p>Style components directly like HTML elements in CSS</p>

<!-- Button using :global class as shown in first example -->
<Button class="btn-gradient" {onclick}>Click me</Button>

<!-- Button using inline style to represent how svUltra would style it -->
<Button {onclick}>Click me</Button>

<CodeComparison>
  <CodeExample title="Svelte 5: more boilerplate and forced :global()">
<style>
:global(.btn-gradient) {
  background: linear-gradient(to right, #4776E6, #8E54E9);
  color: white;
  font-weight: bold;
}
</style>
<Button class="btn-gradient">Click me</Button>
  </CodeExample>
  
  <CodeExample title="svUltra: target components directly in CSS like HTML">
<style>
Button {
  background: linear-gradient(to right, #4776E6, #8E54E9);
  color: white;
  font-weight: bold;
}
</style>
<Button>Click me</Button>
  </CodeExample>
</CodeComparison>
