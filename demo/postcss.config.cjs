module.exports = {
  plugins: [
    // Hoist @keyframes nested inside selectors (e.g. LoadingIndicator.svelte)
    // to the top level — required since standard CSS doesn't allow @keyframes
    // inside selectors and lightningcss enforces the spec.
    require('postcss-nested'),
  ],
};
