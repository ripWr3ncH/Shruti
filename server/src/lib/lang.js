/**
 * Language helpers for Shruti's multilingual pipeline.
 *
 * Shruti used to assume English everywhere. Rather than special-casing a
 * second language, one language value — detected from the video's own captions
 * — now flows through the whole system: the caption fetch, the Gemma prompts,
 * and the browser's speech synthesis. These helpers turn a raw, messy language
 * code ("bn", "en-US", "bn-orig", "pt-BR") into the pieces each stage needs.
 *
 * Language display names come from Intl.DisplayNames, which needs the full ICU
 * data Node 20+ ships by default — so "bn" resolves to "Bengali" in English and
 * "বাংলা" in its own script with no bundled table to maintain.
 */

/** Bare language subtag: "en-US" -> "en", "bn-orig" -> "bn", "" -> "". */
export function baseLang(code) {
  return String(code || '')
    .trim()
    .toLowerCase()
    .replace(/-orig$/i, '')
    .split(/[-_]/)[0];
}

/** English is the pipeline's historical default, so treat "" as English too. */
export const isEnglish = (code) => {
  const base = baseLang(code);
  return base === '' || base === 'en';
};

let englishNames = null;
function englishDisplay() {
  if (!englishNames) {
    try {
      englishNames = new Intl.DisplayNames(['en'], { type: 'language' });
    } catch {
      englishNames = { of: (code) => code };
    }
  }
  return englishNames;
}

/** English name of a language code: "bn" -> "Bengali". Falls back to the code. */
export function languageName(code) {
  const base = baseLang(code);
  if (!base) return 'English';
  try {
    return englishDisplay().of(base) || base;
  } catch {
    return base;
  }
}

/** The language's own name: "bn" -> "বাংলা". Falls back to the English name. */
export function nativeLanguageName(code) {
  const base = baseLang(code);
  if (!base) return 'English';
  try {
    return new Intl.DisplayNames([base], { type: 'language' }).of(base) || languageName(base);
  } catch {
    return languageName(base);
  }
}

/**
 * A compact language descriptor carried through the pipeline and returned to
 * the client (which uses `code` to pick a speech voice and `name`/`native` for
 * on-screen labels).
 *
 * @param {string} code any BCP-47-ish code or bare subtag
 * @returns {{code:string, name:string, native:string, isEnglish:boolean}}
 */
export function describeLanguage(code) {
  const base = baseLang(code) || 'en';
  return {
    code: base,
    name: languageName(base),
    native: nativeLanguageName(base),
    isEnglish: base === 'en',
  };
}

/**
 * Resolves the output language from the configured policy and the language the
 * narration was actually detected in.
 *
 * @param {string} configured `auto` (mirror the narration) or a forced code
 * @param {string} narrationLang the language the captions were found in
 */
export function resolveOutputLanguage(configured, narrationLang) {
  const policy = String(configured || 'auto').trim().toLowerCase();
  const code = !policy || policy === 'auto' ? narrationLang : policy;
  return describeLanguage(code || 'en');
}
