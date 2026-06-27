import './accordion.css';
import { trapFocus } from 'trap-focus-svelte';

//NOTE: Not a real accordion but a drop down

//TODO: Rename to something more fitting like dropdownanimation.js

//TODO: Optional exclusive mode — open one item and animate-close the others in its
//      group (grouped via the `name` attribute), like a classic accordion.

// The action marks each element with an `accordion` class, and adds a `closing`
// class while a panel collapses — both are there as styling hooks. Note the height
// animates smoothly but the `open` attribute flips in a single frame, so CSS keyed
// on `details[open]` changes instantly instead of easing with the slide; mirror
// such a style on `.closing` to keep it in step while closing.
export function accordion(node, options = {}) {
  let animation = null;
  let isClosing = false;
  let isExpanding = false;
  let timeoutId = null;
  const duration = options.duration || 300; // Default duration if not provided
  const summary = node.querySelector(options.trigger || 'summary');
  // The content is animated inside a wrapper that carries no padding or margin of
  // its own (styled in accordion.css), so it collapses cleanly to 0 and clips
  // whatever it holds — letting the content style its own spacing without flooring
  // the animation. By default the content is everything in the node except the
  // trigger; pass options.content to wrap one specific element.
  const wrapper = document.createElement('div');
  // Opt-in focus trap (for menu-style dropdowns) needs the wrapper focusable.
  if (options.trapFocus) wrapper.setAttribute('tabindex', '-1');

  if (options.content) {
    const content = node.querySelector(options.content);
    content.before(wrapper);
    wrapper.append(content);
  } else {
    const rest = [...node.children].filter((child) => child !== summary);
    if (rest[0]) rest[0].before(wrapper);
    else node.append(wrapper);
    wrapper.append(...rest);
  }

  // Mark the element so CSS can target action-driven accordions without touching
  // plain <details>.
  node.classList.add('accordion');

  function onClick(e) {
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
    node.classList.add('closing');
    const startHeight = `${wrapper.scrollHeight}px`;
    const endHeight = '0px';

    if (animation) {
      animation.cancel();
    }

    animation = wrapper.animate([
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
    node.classList.remove('closing');
    node.open = true;
    timeoutId = window.requestAnimationFrame(() => expand());
  }

  function expand() {
    isExpanding = true;
    const startHeight = '0px';
    const endHeight = `${wrapper.scrollHeight}px`;

    if (animation) {
      animation.cancel();
    }

    animation = wrapper.animate([
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
    node.classList.remove('closing');
    animation = null;
    isClosing = false;
    isExpanding = false;
    if (!open) {
      wrapper.style.height = '0px';
    } else {
      wrapper.style.height = 'auto';
      // Menu dropdowns trap focus inside the open panel; accordions keep it on the
      // trigger so it can be toggled again — hence opt-in.
      if (options.trapFocus) {
        trapFocus(wrapper);
        wrapper.focus();
      }
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

      // Unwrap: move the content back out and drop the wrapper
      wrapper.replaceWith(...wrapper.childNodes);
    }
  };
}
