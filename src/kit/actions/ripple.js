import './ripple.css';

export function ripple(node) {
  //console.log('ripple() setup');

  let rippleVisible = false;
  let rippleStyle = '';
  let rippleTimeout;

  function rippleEffect(event) {
    //console.log('rippleEffect()');
    const rect = node.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    // Update the ripple style and visibility
    rippleStyle = `width: ${size}px; height: ${size}px; left: ${x}px; top: ${y}px;`;

    // Create a ripple element
    const rippleElement = document.createElement('span');
    rippleElement.className = 'ripple';
    rippleElement.style.cssText = rippleStyle;
    //TODO: Don't set inline styles
    // These guarantee ripple containment when the host doesn't already provide
    // position+overflow in CSS. Disabled because as inline styles they win over
    // consumer overrides like CodeExample's `Button { position: absolute }`. Re-
    // enable selectively (e.g. only when the computed style isn't already set)
    // if ripple containment breaks somewhere.
    //node.style.overflow = "hidden";
    //node.style.position = "relative";
    node.appendChild(rippleElement);

    requestAnimationFrame(() => {
      rippleVisible = true;
    });

    // Hide the ripple after the animation duration
    rippleTimeout = setTimeout(() => {
      rippleVisible = false;
      node.removeChild(rippleElement);
    }, 600); // Duration of the ripple effect
  }

  node.addEventListener('click', rippleEffect);

  return {
    destroy() {
      node.removeEventListener('click', rippleEffect);
    }
  };
}
