import { useEffect, useRef } from 'react';
import Icon from './Icon.jsx';
import { useI18n } from '../i18n/index.jsx';

/**
 * Interactive assistant.
 *
 * Presets are numbered so a keyboard user can fire the common questions with a
 * single keystroke, and the free-text box is there for everything else. Each
 * preset carries a decorative icon hinting at the kind of content it asks about.
 *
 * The server supplies each preset's id, English label, and the question text it
 * sends to Gemma. Only the *label* is translated here — the question itself
 * stays as the server wrote it, because the prompt's output language is
 * controlled separately and the two must not drift.
 */

/** Preset id → decorative icon. Falls back to a generic prompt icon. */
const PRESET_ICONS = {
  'whats-on-screen': 'eye',
  'read-code': 'code',
  'read-terminal': 'terminal',
  'describe-diagram': 'diagram',
  'explain-graph': 'chart',
  'explain-formula': 'sigma',
  'which-button': 'cursor',
  'what-changed': 'sparkle',
};

export function QuestionPanel({ presets, onAsk, busy, lastAnswer, disabled }) {
  const inputRef = useRef(null);
  const answerRef = useRef(null);
  const { t } = useI18n();

  useEffect(() => {
    // Move focus to the answer once it arrives so a screen-reader user can
    // read it at their own pace, and re-read it with their reading keys.
    if (lastAnswer && answerRef.current) answerRef.current.focus();
  }, [lastAnswer]);

  const submit = (event) => {
    event.preventDefault();
    const value = inputRef.current?.value?.trim();
    if (!value) return;
    onAsk({ question: value });
    inputRef.current.value = '';
  };

  /** Translated preset label, falling back to whatever the server sent. */
  const presetLabel = (preset) => {
    const key = `preset.${preset.id}`;
    const translated = t(key);
    return translated === key ? preset.label : translated;
  };

  return (
    <section className="panel questions" aria-labelledby="questions-heading">
      <h2 id="questions-heading">{t('questions.heading')}</h2>
      <p className="help" id="questions-help">
        {t('questions.help')}
      </p>

      <ul className="preset-list" aria-label={t('questions.common')}>
        {presets.map((preset, index) => (
          <li key={preset.id}>
            <button
              type="button"
              onClick={() => onAsk({ presetId: preset.id, question: preset.question })}
              disabled={busy || disabled}
              aria-keyshortcuts={index < 9 ? String(index + 1) : undefined}
            >
              <span className="preset-head">
                <span className="key-hint" aria-hidden="true">
                  {index < 9 ? index + 1 : '•'}
                </span>
                <Icon name={PRESET_ICONS[preset.id] || 'help'} size={18} />
              </span>
              <span className="preset-label">{presetLabel(preset)}</span>
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="question-form">
        <div className="field">
          <label htmlFor="question-input">{t('questions.ownLabel')}</label>
          <input
            id="question-input"
            ref={inputRef}
            type="text"
            maxLength={300}
            disabled={busy || disabled}
            aria-describedby="questions-help"
            placeholder={t('questions.placeholder')}
          />
        </div>
        <button type="submit" className="primary" disabled={busy || disabled}>
          {busy ? t('questions.asking') : t('questions.ask')}
          {!busy && <Icon name="sparkle" size={16} />}
        </button>
      </form>

      {lastAnswer && (
        <div
          className={`answer${lastAnswer.grounded ? '' : ' unverified'}`}
          ref={answerRef}
          tabIndex={-1}
          role="region"
          aria-label={t('questions.answerRegion')}
        >
          <img className="answer-avatar" src="/logo.svg" alt="" />
          <p className="answer-question">
            {t('questions.youAsked')} <strong>{lastAnswer.question}</strong>
          </p>
          <p className="answer-text">{lastAnswer.answer}</p>
          <p className={`answer-meta ${lastAnswer.grounded ? 'ok' : 'warn'}`}>
            <Icon name={lastAnswer.grounded ? 'check' : 'alert'} size={16} />
            {lastAnswer.grounded
              ? t('questions.grounded', { seconds: Math.round(lastAnswer.time) })
              : t('questions.notGrounded')}
          </p>
        </div>
      )}
    </section>
  );
}

export default QuestionPanel;
