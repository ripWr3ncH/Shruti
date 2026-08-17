import { useI18n, UI_LANGUAGES } from '../i18n/index.jsx';

/**
 * Interface language switch.
 *
 * A radio group rather than a dropdown: with only two options, every choice is
 * visible and reachable with one keystroke, and a screen reader announces the
 * current state without opening anything. Each option is labelled in its own
 * language — "বাংলা", not "Bengali" — so it is recognisable to someone who
 * cannot read the language currently on screen.
 */
export function LanguageSwitch({ onChange }) {
  const { lang, setLang, t } = useI18n();

  const choose = (code) => {
    if (code === lang) return;
    setLang(code);
    onChange?.(code);
  };

  return (
    <div className="lang-switch" role="radiogroup" aria-label={t('app.languageLabel')}>
      {UI_LANGUAGES.map((option) => (
        <button
          key={option.code}
          type="button"
          role="radio"
          aria-checked={lang === option.code}
          className={lang === option.code ? 'active' : undefined}
          onClick={() => choose(option.code)}
          lang={option.code}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default LanguageSwitch;
