<script>
  import { Button, Card } from 'svultra/kit/components';
  import { snippetToHtml, dedent } from 'svultra/snippet';

  let { highlight, children, expanded = $bindable(false), ...rest } = $props();

  // snippetToHtml returns a writable; the template reads $html to subscribe.
  // svelte-ignore state_referenced_locally
  const html = snippetToHtml(children);

  function mark(s) {
    for (const re of highlight ?? []) s = s.replace(re, m => `<span>${m}</span>`);
    return s;
  }

  // String → dedented → highlight-wrapped → ready for {@html}.
  function formatCode(s) {
    return mark(dedent(s));
  }

  // Scroll the panel so the first highlighted token is near the top — the
  // reader lands at the interesting spot instead of the file header. Reading
  // $html creates a reactive dep so {@attach} re-runs on every content update.
  function scrollToFirstMark(node) {
    $html;
    const first = node.querySelector('span');
    if (!first) return;
    const codeRect = node.getBoundingClientRect();
    const markRect = first.getBoundingClientRect();
    node.scrollTop += markRect.top - codeRect.top - 16;
  }
</script>

<style>
  Card {
    position: relative;
    padding-bottom: 0;
  }

  code {
    white-space: pre;
    display: block;
    overflow-x: auto;
    margin: calc(-1 * var(--pico-block-spacing-vertical)) calc(-1 * var(--pico-block-spacing-horizontal)) 0 calc(-1 * var(--pico-block-spacing-horizontal));
    padding: var(--pico-form-element-spacing-vertical) var(--pico-form-element-spacing-horizontal);
    min-height: 15rem;

    overflow: auto;

    &:not(.expanded) {
      max-height: 15rem;
      mask-image: linear-gradient(to bottom, black 70%, transparent);
    }

    /* :global is needed here to style the <span> we insert via the `mark()` function above. */
    :global(span) {
      color: var(--pico-primary);
      font-weight: bold;
    }
  }

  Button {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    opacity: 0.5;
    &:hover { opacity: 1; }
  }
</style>

<Card {...rest}>
  <code class:expanded {@attach scrollToFirstMark}>{@html formatCode($html)}</code>
  <Button class="outline" onclick={() => expanded = !expanded}>{expanded ? '↑' : '↓'}</Button>
</Card>
