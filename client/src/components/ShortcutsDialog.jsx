import { useEffect, useRef } from 'react';
import { keyLabel } from '../hooks/useKeyboardShortcuts.js';
import { useI18n } from '../i18n/index.jsx';

/**
 * Keyboard shortcut reference.
 *
 * A modal dialog with a focus trap: focus enters on open, cannot leave while
 * open, and returns to the trigger on close.
 */
export function ShortcutsDialog({ open, onClose, bindings }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const returnFocusRef = useRef(null);
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return undefined;
    returnFocusRef.current = document.activeElement;
    closeRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      returnFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const groups = bindings
    .filter((binding) => !binding.hidden)
    .reduce((acc, binding) => {
      (acc[binding.group] ||= []).push(binding);
      return acc;
    }, {});

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="shortcuts-title">{t('shortcuts.heading')}</h2>
        <p className="help">{t('shortcuts.help')}</p>

        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <h3>{group}</h3>
            <dl className="shortcut-list">
              {items.map((binding) => (
                <div key={binding.label} className="shortcut">
                  <dt>{binding.keys.map(keyLabel).join(` ${t('shortcuts.or')} `)}</dt>
                  <dd>{binding.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}

        <button type="button" ref={closeRef} className="primary" onClick={onClose}>
          {t('shortcuts.close')}
        </button>
      </div>
    </div>
  );
}

export default ShortcutsDialog;
