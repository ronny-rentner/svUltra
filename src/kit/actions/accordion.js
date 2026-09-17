import './accordion.css';
import { trapFocus } from 'trap-focus-svelte';

// Border-box height of an element plus its own vertical margins.
function outerHeight(el) {
  const style = getComputedStyle(el);
  return el.getBoundingClientRect().height + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
}

// Animate the element immediately following the summary of a <details> element.
export function accordion(node, options = {}) {
  let animation = null;
  let isClosing = false;
  let timeoutId = null;
  let focusTrap = null;
  const duration = options.duration || 300;
  const summary = node.querySelector(options.trigger || 'summary');
  const content = summary.nextElementSibling;

  // Limit clipping and Pico's animation adjustments to panels using this action.
  node.classList.add('accordion');

  // Only trapped panels need a focus target when they contain no controls.
  if (options.trapFocus) {
    content.setAttribute('tabindex', '-1');
  }

  // Include direct children's vertical margins in the expanded height.
  // Text-only panels, such as a bare <p>, use their own scrollHeight.
  const fullHeight = () => content.children.length
    ? [...content.children].reduce((h, c) => h + outerHeight(c), 0)
    : content.scrollHeight;

  function onClick(e) {
    e.preventDefault();
    if (isClosing || !node.open) {
      open();
    } else {
      shrink();
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape' && node.open) {
      shrink();
    }
  }

  function onToggle() {
    // Callers also close details directly, without running the closing animation.
    if (!node.open && focusTrap) {
      focusTrap.destroy();
      focusTrap = null;
    }
  }

  function shrink() {
    isClosing = true;

    if (animation) {
      animation.cancel();
    }

    // Collapse the panel's vertical margins with its height to avoid a spacing jump when it closes.
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
  }

  function onAnimationFinish(open) {
    node.open = open;
    node.classList.remove('closing');
    animation = null;
    isClosing = false;
    if (!open) {
      content.style.height = '0px';
    } else {
      content.style.height = 'auto';
      // Reopening during a close keeps the existing focus trap.
      if (options.trapFocus && !focusTrap) {
        focusTrap = trapFocus(content);
      }
    }
  }

  summary.addEventListener('click', onClick);
  document.addEventListener('keydown', onKeyDown);
  node.addEventListener('toggle', onToggle);

  return {
    destroy() {
      summary.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKeyDown);
      node.removeEventListener('toggle', onToggle);

      // Release the action's styling hooks when the panel stops being animated.
      node.classList.remove('accordion', 'closing');

      // Removing an open panel must release its document-level focus listener.
      if (focusTrap) {
        focusTrap.destroy();
      }

      // Cancel any ongoing animation
      if (animation) {
        animation.cancel();
      }

      // Cancel the scheduled expansion frame.
      if (timeoutId) {
        window.cancelAnimationFrame(timeoutId);
      }
    }
  };
}
