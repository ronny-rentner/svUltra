<script module>
import Badges from '#kit/components/Badges.svelte';
export { Badges };
</script>

<script>
let { children, color = 'red', ...rest } = $props();
</script>

<style>
span {
  padding: .125rem .25rem;
  border-radius: .125rem;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
}

.red    { color: rgb(168,  52,  16); background-color: rgba(168,  52,  16, 0.125); }
.blue   { color: rgb( 26, 115, 232); background-color: rgba( 26, 115, 232, 0.125); }
.yellow { color: rgb(255, 193,   7); background-color: rgba(255, 193,   7, 0.125); }
.green  { color: rgb( 52, 168,  83); background-color: rgba( 52, 168,  83, 0.125); }
.purple { color: rgb(103,  58, 183); background-color: rgba(103,  58, 183, 0.125); }
.orange { color: rgb(255,  87,  34); background-color: rgba(255,  87,  34, 0.125); }
.pink   { color: rgb(233,  30,  99); background-color: rgba(233,  30,  99, 0.125); }
.teal   { color: rgb(  0, 150, 136); background-color: rgba(  0, 150, 136, 0.125); }
.gray   { color: rgb(158, 158, 158); background-color: rgba(158, 158, 158, 0.125); }
.black  { color: rgb(  0,   0,   0); background-color: rgba(  0,   0,   0, 0.125); }
</style>

<span class={color} {...rest}>{render children()}</span>
