import { useEffect, useRef } from 'react';
import Icon from './Icon.jsx';
import { useI18n } from '../i18n/index.jsx';

/**
 * Step one of the audio-first workflow: paste a link.
 * Autofocused, because for a keyboard-only user this is the only thing on the
 * page that needs doing.
 */
export function UrlForm({ onSubmit, busy, error, defaultValue = '' }) {
  const inputRef = useRef(null);
  const { t } = useI18n();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    const value = inputRef.current?.value?.trim();
    if (value) onSubmit(value);
  };

  return (
    <form className="panel url-form" onSubmit={handleSubmit} aria-labelledby="url-form-heading">
      <h2 id="url-form-heading">{t('url.heading')}</h2>

      <label htmlFor="youtube-url">{t('url.label')}</label>
      <input
        id="youtube-url"
        ref={inputRef}
        type="url"
        name="url"
        inputMode="url"
        autoComplete="url"
        spellCheck="false"
        defaultValue={defaultValue}
        placeholder="https://www.youtube.com/watch?v=..."
        aria-describedby="url-help url-error"
        aria-invalid={error ? 'true' : undefined}
        disabled={busy}
        required
      />

      <p id="url-help" className="help">
        {t('url.help')}
      </p>

      <p id="url-error" className="error" role="none">
        {error || ''}
      </p>

      <button type="submit" className="primary" disabled={busy}>
        {!busy && <Icon name="sparkle" size={18} />}
        {busy ? t('url.submitBusy') : t('url.submit')}
      </button>
    </form>
  );
}

export default UrlForm;
