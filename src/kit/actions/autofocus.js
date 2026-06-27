let _preventNextFocusChange = false;
let isMobile = false;

export function preventNextFocusChange() {
  _preventNextFocusChange = true;
}

// Utility function to detect if the user is on a mobile device
function detectMobile() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  // Checks for Android or iOS devices
  return /android|iphone|ipad|ipod/i.test(userAgent);
}

export default function autofocus(node, { filter } = {}) {
  let _keyIsDown = false;
  let _shouldFocus = false;

  const scrollingKeys = [
    'ArrowDown',
    'ArrowUp',
    'ArrowLeft',
    'ArrowRight',
    'PageUp',
    'PageDown',
    'Home',
    'End',
    ' ',
  ];

  // Detect if the current platform is mobile
  isMobile = detectMobile();

  function onKeyDown(e) {
    if (scrollingKeys.includes(e.key)) {
      _keyIsDown = true;
    }
  }

  function onKeyUp(e) {
    if (scrollingKeys.includes(e.key)) {
      _keyIsDown = false;
      if (_shouldFocus) {
        _shouldFocus = false;
        node.focus();
      }
    }
  }

  if (!isMobile) {  // Exclude autofocus for mobile platforms
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        const activeElement = document.activeElement;

        if (!filter || !activeElement || !activeElement.matches(filter)) {
          if (_preventNextFocusChange) {
            _preventNextFocusChange = false;
          } else if (_keyIsDown) {
            _shouldFocus = true;
          } else {
            //We need to prevent scrolling because it scrolls way too far
            //(at least for the tasks list of a process)
            node.focus({ preventScroll: true });
          }
        }
      }
    });

    observer.observe(node);

    return {
      destroy() {
        observer.disconnect();
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
      },
    };
  }

  // If on mobile, simply return a no-op destroy function
  return {
    destroy() {},
  };
}
