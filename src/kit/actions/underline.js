import './underline.css';

// use:underline on a word in a headline draws Relonee's animated brush underline under it
export function underline(node) {
  node.classList.add('underline--magical');

  return {
    destroy() {
      node.classList.remove('underline--magical');
    }
  };
}
