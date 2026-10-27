1. Evaluate usage of $state.eager for the Loader and Router

$state.eager for user-input responsiveness

Newer in Svelte 5: when state updates happen inside await, Svelte batches them for efficiency. That is usually what you want, but it means the UI can lag a frame behind a user action. $state.eager forces the read to flush synchronously:

<a aria-current={$state.eager(pathname) === '/' ? 'page' : null}>home</a>

Use it sparingly. Only when a user-visible value must reflect the latest update immediately.
