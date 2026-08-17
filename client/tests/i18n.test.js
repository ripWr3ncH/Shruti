/**
 * Dictionary parity.
 *
 * English is the source of truth and every other language mirrors its keys.
 * A missing key falls back to English at runtime rather than rendering blank,
 * so drift is invisible in the browser — which is exactly why it needs a test.
 * The placeholder check matters just as much: `t('announce.found', {...})` with
 * a translation that dropped `{duration}` silently loses information a blind
 * learner was relying on hearing.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import en from '../src/i18n/en.js';
import bn from '../src/i18n/bn.js';

const LANGUAGES = { bn };

/** The `{name}` placeholders a template expects, as a sorted list. */
function placeholders(template) {
  return [...String(template).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

test('every language defines the same keys as English', () => {
  const expected = Object.keys(en).sort();
  for (const [code, dict] of Object.entries(LANGUAGES)) {
    const actual = Object.keys(dict).sort();
    const missing = expected.filter((key) => !dict[key]);
    const extra = actual.filter((key) => !(key in en));
    assert.deepEqual(missing, [], `${code} is missing keys: ${missing.join(', ')}`);
    assert.deepEqual(extra, [], `${code} has keys English does not: ${extra.join(', ')}`);
  }
});

test('translations keep every placeholder the English string uses', () => {
  for (const [code, dict] of Object.entries(LANGUAGES)) {
    for (const [key, template] of Object.entries(en)) {
      if (!dict[key]) continue;
      assert.deepEqual(
        placeholders(dict[key]),
        placeholders(template),
        `${code}.${key} does not use the same placeholders as English`,
      );
    }
  }
});

test('no translation is left as the English original by accident', () => {
  // A handful of strings are legitimately identical across languages: proper
  // nouns, and the language names in the switch, which are always written in
  // their own language.
  const allowedIdentical = new Set(['app.languageEnglish', 'app.languageBangla']);
  for (const [code, dict] of Object.entries(LANGUAGES)) {
    const untranslated = Object.keys(en).filter(
      (key) => !allowedIdentical.has(key) && dict[key] === en[key],
    );
    assert.deepEqual(untranslated, [], `${code} left these identical to English: ${untranslated.join(', ')}`);
  }
});
