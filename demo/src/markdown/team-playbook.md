# Demo Team Playbook

The markdown preprocessor matters when a component should stay focused on layout while the content lives in a file that non-component authors can edit.

## Why this sells the workflow

- Product or documentation copy can move without rewriting Svelte markup.
- Headings, links, and lists stay readable in source control.
- The demo still rebuilds when the markdown file changes.

## What svUltra keeps in the component

The Svelte file decides:

- where the content block sits
- how it is styled
- how it blends with the rest of the demo

The markdown file owns the text itself, which is the part that tends to change most often.

[Open the source markdown file](https://github.com/ronny-rentner/svUltra/tree/main/demo/src/markdown)
