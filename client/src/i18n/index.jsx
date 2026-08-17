/**
 * Interface language.
 *
 * Self-contained: the provider owns the language state and its own persistence,
 * so `main.jsx` can wrap the app before any other hook runs and every component
 * — including the ones that speak — reads the same value.
 *
 * English is the default. A learner switches to Bangla explicitly; we do not
 * guess from the browser locale, because guessing wrong changes the language a
 * screen reader announces in, which is disorienting rather than helpful.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './en.js';
import bn from './bn.js';

const STORAGE_KEY = 'shruti.language.v1';

/** Languages the interface is available in. */
export const UI_LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'bn', label: 'বাংলা', short: 'বাং' },
];

const DICTIONARIES = { en, bn };

export const DEFAULT_LANGUAGE = 'en';

function readStored() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return DICTIONARIES[saved] ? saved : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

/** Fills `{name}` placeholders. An unknown placeholder is left visible rather than blanked. */
function interpolate(template, vars) {
  if (!vars) return template;
  return String(template).replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match,
  );
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(readStored);

  // Keep the document in sync: screen readers choose their pronunciation rules
  // from this, so it has to change with the interface, not just on first load.
  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* storage unavailable — the choice simply does not persist */
    }
  }, [lang]);

  const setLang = useCallback((next) => {
    if (DICTIONARIES[next]) setLangState(next);
  }, []);

  /**
   * Look up a string. Falls back to English for a key this language has not
   * translated yet, and to the key itself if it exists in neither — a visible
   * key is a bug report; an empty string is a silent one.
   */
  const t = useCallback(
    (key, vars) => {
      const dict = DICTIONARIES[lang] || en;
      return interpolate(dict[key] ?? en[key] ?? key, vars);
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside an I18nProvider');
  return context;
}

/**
 * A duration written for the ear: `93` -> "1 minute 33 seconds", or the Bangla
 * equivalent. The visual `formatTime` in lib/format.js stays language-neutral.
 *
 * @param {number} seconds
 * @param {(key:string, vars?:object) => string} t
 */
export function spokenTime(seconds, t) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  const parts = [];
  if (minutes) parts.push(t(minutes === 1 ? 'time.minute' : 'time.minutes', { count: minutes }));
  parts.push(t(secs === 1 ? 'time.second' : 'time.seconds', { count: secs }));
  return parts.join(' ');
}

export default useI18n;
