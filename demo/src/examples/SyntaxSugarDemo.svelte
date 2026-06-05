<script>
  import { writable } from 'svelte/store';
  import { Button, Card } from 'svultra/kit/components';

  let { color = 'var(--pico-primary)', placeholder = 'Add a to-do…' } = $props();

  const title = writable('List of Tasks');

  let value = $state('');
  let todos = $state(['Read the svUltra docs', 'Try the syntax sugar']);

  function onsubmit(event) {
    event.preventDefault();
    todos = [...todos, value];
    value = '';
  }

  function onclick(event) {
    todos = todos.filter((_, i) => i !== Number(event.currentTarget.dataset.index));
  }
</script>

<style>
  Card { 
    width: 30rem;  
    @mobile { width: auto; }
    @dark & li { font-weight: bold; }
  }
</style>

<Card {$title}>
  <form action="#" role="group" {onsubmit}>
    <input bind:{value} {placeholder} />
    <Button type="submit" disabled={!value}>Add</Button>
  </form>

  {if todos.length}
    <ul>
      {each todos as todo, index}
        <li style:{color}>{index + 1}/{todos.length}: {todo} <a {onclick} data-index={index}>✘</a></li>
      {/each}
    </ul>
  {else}
    <p>Nothing to do 🎉</p>
  {/if}
</Card>
