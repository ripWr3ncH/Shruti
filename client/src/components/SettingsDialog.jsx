import { useEffect, useRef } from 'react';
import { useI18n } from '../i18n/index.jsx';

/**
 * Modal wrapper for the settings panel, so speech/display preferences live one
 * click away instead of taking a whole column. Focus-trapped, Escape closes,
 * focus returns to the trigger.
 */
export function SettingsDialog({ open, onClose, children }) {
  const dialogRef = useRef(null);
  const returnFocusRef = useRef(null);
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return undefined;
    returnFocusRef.current = document.activeElement;
    dialogRef.current?.focus();

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

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog settings-dialog"
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-heading"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
        <button type="button" className="primary" onClick={onClose}>
          {t('settings.done')}
        </button>
      </div>
    </div>
  );
}

export default SettingsDialog;
