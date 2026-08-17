/**
 * Global keyboard shortcuts.
 *
 * Rule 4 of the spec: everything must be reachable without a mouse. Shortcuts
 * are declared as data so the same list drives both the handlers and the help
 * dialog — the two can never drift apart.
 */
import { useEffect, useRef } from 'react';

/** True when focus is somewhere that needs the raw keystroke. */
function isTypingTarget(target) {
  if (!target) return false;
  const tag = target.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  return target.isContentEditable === true;
}

function matches(binding, event) {
  const key = event.key;
  return binding.keys.some((candidate) => {
    if (candidate.length === 1) return key.toLowerCase() === candidate.toLowerCase();
    return key === candidate;
  });
}

/**
 * @param {Array<{keys:string[], label:string, group:string, run:Function,
 *                allowWhileTyping?:boolean, hidden?:boolean}>} bindings
 * @param {{enabled?:boolean}} [options]
 */
export function useKeyboardShortcuts(bindings, { enabled = true, onFire } = {}) {
  const ref = useRef(bindings);
  ref.current = bindings;
  const onFireRef = useRef(onFire);
  onFireRef.current = onFire;

  useEffect(() => {
    if (!enabled) return undefined;

    const onKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const typing = isTypingTarget(event.target);
      for (const binding of ref.current) {
        if (!matches(binding, event)) continue;
        if (typing && !binding.allowWhileTyping) continue;
        event.preventDefault();
        event.stopPropagation();
        onFireRef.current?.({ key: event.key, label: binding.label });
        binding.run(event);
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}

/** Human-readable key name for the help dialog and ARIA descriptions. */
export function keyLabel(key) {
  const names = {
    ' ': 'Space',
    ArrowLeft: 'Left arrow',
    ArrowRight: 'Right arrow',
    ArrowUp: 'Up arrow',
    ArrowDown: 'Down arrow',
    Escape: 'Escape',
    Home: 'Home',
    End: 'End',
    '?': 'Question mark',
  };
  return names[key] || key.toUpperCase();
}

/** Short symbol for the on-screen keystroke flash (a compact key-cap). */
export function keyCap(key) {
  const caps = {
    ' ': 'Space',
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    Escape: 'Esc',
  };
  return caps[key] || key.toUpperCase();
}

export default useKeyboardShortcuts;
