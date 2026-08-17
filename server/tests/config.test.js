import test from 'node:test';
import assert from 'node:assert/strict';
import { assertGemmaOnly, bareModelId, validateConfig, config } from '../src/config.js';

/* Rule #1 of the spec, mechanically enforced. */

test('Gemma model ids are accepted', () => {
  const accepted = [
    // The two Gemma 4 ids served by the Gemini API.
    'gemma-4-31b-it',
    'gemma-4-26b-a4b-it',
    // Other released sizes and the Gemma 3 fallbacks.
    'gemma-4-E4B-it',
    'gemma-3-27b-it',
    'models/gemma-3-4b-it',
    'Gemma-4.5-9b',
  ];
  for (const model of accepted) {
    assert.equal(assertGemmaOnly(model), bareModelId(model));
  }
});

test('the default preference list contains only Gemma models', () => {
  assert.ok(config.gemma.preferences.length > 0);
  for (const model of config.gemma.preferences) {
    assert.doesNotThrow(() => assertGemmaOnly(model), `${model} should be a Gemma model`);
  }
  assert.match(config.gemma.preferences[0], /^gemma-4/, 'Gemma 4 should be preferred');
});

test('every non-Gemma model is refused', () => {
  const forbidden = [
    'gpt-4o',
    'gpt-5',
    'claude-opus-4-8',
    'gemini-2.5-pro',
    'gemini-1.5-flash',
    'llama-3-70b',
    'mistral-large',
    'gemmax',
    'not-gemma-3',
    // A non-Gemma model routed through OpenRouter must still be refused.
    'google/gpt-4o',
    'openai/gpt-4o',
    'google/gemini-2.0-flash',
    'anthropic/claude-3.5-sonnet',
    '',
    null,
    undefined,
  ];
  for (const model of forbidden) {
    assert.throws(() => assertGemmaOnly(model), /refuses to run a non-Gemma model/, `${model} must be refused`);
  }
});

test('"gemini" is not mistaken for "gemma"', () => {
  assert.throws(() => assertGemmaOnly('gemini-2.0-flash'));
});

test('bareModelId strips the models/ prefix', () => {
  assert.equal(bareModelId('models/gemma-3-27b-it'), 'gemma-3-27b-it');
  assert.equal(bareModelId('gemma-3-27b-it'), 'gemma-3-27b-it');
});

test('validateConfig reports a missing API key', () => {
  const problems = validateConfig({
    ...config,
    gemma: { ...config.gemma, apiKey: '' },
  });
  assert.ok(problems.some((p) => p.includes('GEMMA_API_KEY')));
});

test('validateConfig rejects a non-Gemma pinned model', () => {
  const problems = validateConfig({
    ...config,
    gemma: { ...config.gemma, apiKey: 'test-key', model: 'gpt-4o' },
  });
  assert.ok(problems.some((p) => p.includes('non-Gemma model')));
});

test('validateConfig rejects a non-Gemma model in the preference list', () => {
  const problems = validateConfig({
    ...config,
    gemma: { ...config.gemma, apiKey: 'test-key', model: 'auto', preferences: ['gemini-2.0-flash'] },
  });
  assert.ok(problems.some((p) => p.includes('GEMMA_MODEL_PREFERENCES')));
});

test('validateConfig accepts a well-formed configuration', () => {
  const problems = validateConfig({
    ...config,
    gemma: { ...config.gemma, apiKey: 'test-key', model: 'gemma-4-27b-it' },
  });
  assert.deepEqual(problems, []);
});

test('validateConfig catches inverted confidence thresholds', () => {
  const problems = validateConfig({
    ...config,
    gemma: { ...config.gemma, apiKey: 'test-key' },
    confidence: { high: 0.5, critical: 0.9 },
  });
  assert.ok(problems.some((p) => p.includes('CONFIDENCE_CRITICAL')));
});
