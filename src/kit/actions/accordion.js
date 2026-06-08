import { trapFocus } from 'trap-focus-svelte';

//NOTE: Not a real accordion but a drop down

//TODO: Rename to something more fitting like dropdownanimation.js
export function accordion(node, options = {}) {
  let animation = null;
  let isClosing = false;
  let isExpanding = false;
  let timeoutId = null;
  const duration = options.duration || 300; // Default duration if not provided
  const summary = node.querySelector(options.trigger || 'summary');
  const content = node.querySelector(options.content || 'ul');

  // Ensure the <ul> is focusable
  content.setAttribute('tabindex', '-1');

  function onClick(e) {
    console.log('onClick', event);
    e.preventDefault();
    if (isClosing || !node.open) {
      open();
    } else if (isExpanding || node.open) {
      shrink();
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape' && node.open) {
      shrink();
    }
  }

  function shrink() {
    isClosing = true;
    const startHeight = `${content.scrollHeight}px`;
    const endHeight = '0px';

    if (animation) {
      animation.cancel();
    }

    animation = content.animate([
      { height: startHeight, opacity: 1 },
      { height: endHeight, opacity: 0 }
    ], {
      duration,
      easing: 'ease-out'
    });

    animation.onfinish = () => onAnimationFinish(false);
    animation.oncancel = () => isClosing = false;
  }

  function open() {
    node.style.height = 'auto';
    node.open = true;
    timeoutId = window.requestAnimationFrame(() => expand());
  }

  function expand() {
    isExpanding = true;
    const startHeight = '0px';
    const endHeight = `${content.scrollHeight}px`;

    if (animation) {
      animation.cancel();
    }

    animation = content.animate([
      { height: startHeight, opacity: 0 },
      { height: endHeight, opacity: 1 }
    ], {
      duration,
      easing: 'ease-out'
    });

    animation.onfinish = () => onAnimationFinish(true);
    animation.oncancel = () => isExpanding = false;
  }

  function onAnimationFinish(open) {
    node.open = open;
    animation = null;
    isClosing = false;
    isExpanding = false;
    if (!open) {
      content.style.height = '0px';
    } else {
      content.style.height = 'auto';
      //content.style.border = '1px red solid';
      trapFocus(content);
      content.focus();
      //console.log('focus', content, content.tabIndex, document.activeElement);
      //setTimeout(() => content.querySelector('a')[0].focus());
    }
  }

  summary.addEventListener('click', onClick);
  document.addEventListener('keydown', onKeyDown);

  return {
    destroy() {
      summary.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKeyDown);

      // Cancel any ongoing animation
      if (animation) {
        animation.cancel();
      }

      // Cancel any outstanding timeout
      if (timeoutId) {
        window.cancelAnimationFrame(timeoutId);
      }
    }
  };
}
