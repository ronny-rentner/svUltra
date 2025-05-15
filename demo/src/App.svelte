<script>
  import Button from '@components/Button.svelte';
  import CodeExample from '@components/CodeExample.svelte';
  import CodeComparison from '@components/CodeComparison.svelte';
  import ComponentStylesDemo from '@components/ComponentStylesDemo.svelte';
  
  // Import icons for the Button components
  import iconNext from '@icons/ph/arrow-right';
  
  // Minimal script to test basic preprocessors
  let count = $state(0);
  
  function increment() {
    count++;
  }
  
  // For testing 'elif'
  let value = $state(1);
  
  function changeValue() {
    value = (value % 3) + 1;
  }
  
  // For attribute transformation
  let tooltipText = "This tooltip was processed by attribute-transformer";
</script>

<style>
  /* Simple styles for testing preprocessors */
  .demo-section {
    margin: 2rem 0;
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 0.5rem;
  }
  
  /* For testing @media directives */
  @mobile {
    .responsive-test {
      color: blue;
    }
  }
  
  @desktop {
    .responsive-test {
      color: green;
    }
  }
  
  /* For testing Component Style preprocessor */
  Button {
    margin: 0.5rem;
  }
</style>

<main class="container">
  <h1>svUltra Preprocessor Demo</h1>
  
  <section class="demo-section">
    <ComponentStylesDemo />
  </section>
  
  <section class="demo-section">
    <h2>Class Merge</h2>
    <p>Automatically combines multiple class declarations</p>
    
    <div class="test" class:active={count > 0}>
      This div has merged classes (test + active when count > 0)
    </div>
    <p>
      <button onclick={increment}>Count: {count}</button>
    </p>
  </section>
  
  <section class="demo-section">
    <h2>Attribute Transformer</h2>
    <p>Transforms custom attributes to standard HTML attributes</p>
    
    <p tooltip={tooltipText} placement="bottom">
      Hover over me to see a tooltip (transformed to data-tooltip)
    </p>
  </section>
  
  <section class="demo-section">
    <h2>Media Query Shortcuts</h2>
    <p>Simplified responsive design with shorthand media queries</p>
    
    <p class="responsive-test">
      This text color changes based on viewport size (blue on mobile, green on desktop)
    </p>
  </section>
  
  <section class="demo-section">
    <h2>Syntax Sugar</h2>
    <p>Simplified syntax for common Svelte patterns</p>
    
    <CodeComparison>
      <CodeExample title="Simplified Syntax">
// What you write with svUltra
{if condition}
{elif otherCondition}
{else}
{/if}

{const x = 1}
{render children()}
      </CodeExample>
      <CodeExample title="Standard Svelte Syntax">
// What Svelte actually processes
{#if condition}
{:else if otherCondition}
{:else}
{/if}

{@const x = 1}
{@render children()}
      </CodeExample>
    </CodeComparison>

    <div class="syntax-demo">
      <p>Live example (using syntax sugar):</p>
      <div>
        <button onclick={changeValue}>Current value: {value}</button>
        {if value === 1}
          <p>Value is 1</p>
        {elif value === 2}
          <p>Value is 2 (using 'elif')</p>
        {else}
          <p>Value is 3</p>
        {/if}
      </div>
    </div>
  </section>
</main>
