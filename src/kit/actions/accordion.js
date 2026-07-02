import './accordion.css';
import { trapFocus } from 'trap-focus-svelte';

// Border-box height of an element plus its own vertical margins.
function outerHeight(el) {
  const style = getComputedStyle(el);
  return el.getBoundingClientRect().height + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
}

//NOTE: Not a real accordion but a drop down

//TODO: Rename to something more fitting like dropdownanimation.js
export function accordion(node, options = {}) {
  let animation = null;
  let isClosing = false;
  let isExpanding = false;
  let timeoutId = null;
  const duration = options.duration || 300; // Default duration 300 ms if not provided
  const summary = node.querySelector(options.trigger || 'summary');
  const content = summary.nextElementSibling;

  // Ensure the content panel is focusable
  content.setAttribute('tabindex', '-1');

  // Full height including the children's own margins. scrollHeight drops margins that
  // collapse out of the panel, which is what makes the slide jump at the ends. A leaf
  // panel (no element children, e.g. a bare <p>) has no such margins, so scrollHeight
  // is already correct there.
  const fullHeight = () => content.children.length
    ? [...content.children].reduce((h, c) => h + outerHeight(c), 0)
    : content.scrollHeight;

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

    if (animation) {
      animation.cancel();
    }

    // Collapse the panel's own top/bottom margins along with its height, so they don't
    // stay full-size through the slide and pop away at the end.
    const cs = getComputedStyle(content);
    node.classList.add('closing');

    animation = content.animate([
      { height: `${fullHeight()}px`, marginTop: cs.marginTop, marginBottom: cs.marginBottom, opacity: 1 },
      { height: '0px', marginTop: '0px', marginBottom: '0px', opacity: 0 }
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

    if (animation) {
      animation.cancel();
    }

    const cs = getComputedStyle(content);

    animation = content.animate([
      { height: '0px', marginTop: '0px', marginBottom: '0px', opacity: 0 },
      { height: `${fullHeight()}px`, marginTop: cs.marginTop, marginBottom: cs.marginBottom, opacity: 1 }
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
