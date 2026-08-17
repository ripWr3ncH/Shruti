import { useEffect, useRef, useState } from 'react';
import { formatTime } from '../lib/format.js';
import Icon from './Icon.jsx';
import { useI18n } from '../i18n/index.jsx';

/** A pasted YouTube link or a bare 11-character id, versus a search phrase. */
const looksLikeYouTube = (text) => /(?:youtube\.com|youtu\.be)/i.test(text) || /^[\w-]{11}$/.test(text.trim());

/**
 * Find a video by typing or *speaking* a search.
 *
 * Presentational: all the recording/transcription/search state lives in the
 * shared `voice` hook (so the push-to-talk W key and this dialog stay in sync).
 * Voice search is Whisper — speech recognition, a supporting technology, not an
 * LLM. Everything is keyboard-operable and announced for screen-reader users.
 */
export function SearchDialog({ open, onClose, onPick, voice }) {
  const [query, setQuery] = useState('');
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const returnFocusRef = useRef(null);
  const { t } = useI18n();

  // A voice transcript fills the search box so it can be edited and re-run.
  useEffect(() => {
    if (voice.transcript) setQuery(voice.transcript);
  }, [voice.transcript]);

  useEffect(() => {
    if (!open) return undefined;
    returnFocusRef.current = document.activeElement;
    inputRef.current?.focus();

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

  const submit = (event) => {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    // A pasted link loads straight away; anything else is a search.
    if (looksLikeYouTube(q)) onPick(q);
    else voice.runText(q);
  };

  const busy = voice.busy;
  const listening = voice.listening;

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog search-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="panel-title-row">
          <h2 id="search-title">{t('search.heading')}</h2>
          <button
            type="button"
            className="secondary icon-only"
            onClick={onClose}
            aria-label={t('search.close')}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <p className="help">{t('search.help', { key: 'W' })}</p>

        <form className="search-bar" onSubmit={submit}>
          <label htmlFor="search-input" className="sr-only">
            {t('search.label')}
          </label>
          <input
            id="search-input"
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={200}
            placeholder={t('search.placeholder')}
            disabled={busy || listening}
          />
          {voice.voiceEnabled && (
            <button
              type="button"
              className={`mic-btn ${listening ? 'listening' : ''}`}
              onClick={listening ? voice.stopHold : voice.startHold}
              disabled={busy}
              aria-pressed={listening}
            >
              <Icon name={listening ? 'stop' : 'mic'} size={20} />
              {listening ? t('search.stop') : t('search.speak')}
            </button>
          )}
          <button type="submit" className="primary" disabled={busy || listening || !query.trim()}>
            {busy ? t('search.submitBusy') : t('search.submit')}
          </button>
        </form>

        {voice.voiceEnabled === false && (
          <p className="field-note">
            <Icon name="alert" size={16} />
            <span>{t('search.voiceOff')}</span>
          </p>
        )}

        {voice.status && (
          <p className="search-status" aria-live="polite">
            {voice.status}
          </p>
        )}
        {voice.error && <p className="error">{voice.error}</p>}

        {voice.results.length > 0 && (
          <ul className="search-results" aria-label={t('search.results')}>
            {voice.results.map((result) => (
              <li key={result.videoId}>
                <button
                  type="button"
                  onClick={() => onPick(result.url)}
                  aria-label={t('search.resultLabel', {
                    title: result.title,
                    channel: result.channel
                      ? t('examples.byChannel', { channel: result.channel })
                      : '',
                    duration: result.duration ? `, ${formatTime(result.duration)}` : '',
                  })}
                >
                  <img src={result.thumbnail} alt="" loading="lazy" />
                  <span className="result-body">
                    <span className="result-title">{result.title}</span>
                    <span className="result-meta" aria-hidden="true">
                      {result.channel}
                      {result.channel && result.duration ? ' · ' : ''}
                      {result.duration ? formatTime(result.duration) : ''}
                    </span>
                  </span>
                  <Icon name="play" size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default SearchDialog;
