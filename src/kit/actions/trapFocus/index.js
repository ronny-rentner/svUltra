// Insourced from trap-focus-svelte 1.1.0 (MIT, its LICENSE kept), with the TypeScript types removed.
// Changes are marked `svUltra:`.

let stack = []

/** adds event listener to node and returns function that removes the listener */
function listen(node, event, handler) {
	node.addEventListener(event, handler)
	return () => node.removeEventListener(event, handler)
}

/** Traps focus within a wrapper element */
function trapFocus(wrap, active = true) {
	/** return the first and last focusable children */
	function getFirstAndLastFocusable() {
		const els = [...wrap.querySelectorAll('*')].filter(
			(element) => element.tabIndex >= 0
		)
		return [els.at(0) ?? wrap, els.at(-1) ?? wrap]
	}

	// store document.activeElement to restore focus when untrapped
	let lastActiveElement

	/** activates trap (adds to stack) and focuses inside */
	function addToStack() {
		stack.push(wrap)
		lastActiveElement = document.activeElement
		getFirstAndLastFocusable().at(0).focus()
	}
	/** deactivates trap (removes from stack) and restores focus to lastActiveElement */
	function removeFromStack() {
		stack.pop()
		lastActiveElement.focus()
	}

	// add to stack if active
	if (active) {
		addToStack()
	}

	/** true if element is in the trap most recently added to stack */
	const inCurrentTrap = (el) => stack.at(-1)?.contains(el)

	// svUltra: true while the Tab key is held down. Focus leaves the wrap between keydown and keyup,
	// so only a focus change in that span is a Tab or Shift+Tab that wraps around.
	let tabbing = false
	const keyDownListener = listen(document, 'keydown', (e) => {
		tabbing = e.key === 'Tab'
	})
	const keyUpListener = listen(document, 'keyup', () => {
		tabbing = false
	})

	/** moves focus back to wrap if something outside the wrap is focused */
	const focusInListener = listen(document, 'focusin', (e) => {
		// return if ths trap is not active
		// return if focus is inside the trap
		if (!inCurrentTrap(wrap) || inCurrentTrap(e.target)) {
			return
		}

		const [firstFocusable, lastFocusable] = getFirstAndLastFocusable()
		const previousFocusable = e.relatedTarget

		// if no previousFocusable, focus first focusable
		// if previousFocusable is not in the trap, focus first focusable
		if (!previousFocusable || !inCurrentTrap(previousFocusable)) {
			firstFocusable.focus()
			return
		}

		// svUltra: focus that left without the Tab key, such as by a click outside the wrap, goes back to the
		// element that had it. The original took every exit from the first element for Shift+Tab and focused the last.
		if (!tabbing) {
			previousFocusable.focus()
			return
		}

		// if last element, focus first focusable
		if (previousFocusable === lastFocusable) {
			firstFocusable.focus()
			return
		}

		// if first element and shift tab within time, focus last element
		if (previousFocusable === firstFocusable || previousFocusable === wrap) {
			lastFocusable.focus()
			return
		}
		// fall back to focus on previousFocusable (we made sure it was in current trap above)
		previousFocusable.focus()
	})

	return {
		/** Enables / disables trap */
		update(active) {
			if (active) {
				addToStack()
			} else {
				removeFromStack()
			}
		},
		/** Destroys trap and removes event listeners */
		destroy() {
			keyDownListener()
			keyUpListener()
			focusInListener()
			removeFromStack()
		},
	}
}

export { trapFocus }
