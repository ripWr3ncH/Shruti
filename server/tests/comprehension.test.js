/**
 * The comprehension pass shapes every later decision, so its normalisation
 * (which must never trust raw model output) and its rendered context block are
 * pinned here.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DOMAINS,
  comprehensionContextBlock,
  normaliseComprehension,
} from '../src/services/comprehension.js';

test('a well-formed understanding passes through', () => {
  const result = normaliseComprehension({
    domain: 'math',
    summary: 'Introduces the sigmoid function.',
    keyConcepts: ['sigmoid', 'activation'],
    expectedVisuals: ['a plotted sigmoid curve'],
    glossary: [{ term: 'σ(x)', say: 'sigma of x' }],
    guidance: 'The plotted curve matters most.',
  });
  assert.equal(result.domain, 'math');
  assert.equal(result.keyConcepts.length, 2);
  assert.equal(result.glossary[0].say, 'sigma of x');
});

test('an unknown domain falls back to general', () => {
  assert.equal(normaliseComprehension({ domain: 'astrology' }).domain, 'general');
  assert.equal(normaliseComprehension({}).domain, 'general');
  assert.equal(normaliseComprehension(null).domain, 'general');
});

test('every declared domain is accepted', () => {
  for (const domain of DOMAINS) {
    assert.equal(normaliseComprehension({ domain }).domain, domain);
  }
});

test('malformed arrays and glossary entries are dropped, never thrown on', () => {
  const result = normaliseComprehension({
    domain: 'coding',
    keyConcepts: 'not an array',
    expectedVisuals: [null, '', '  code  ', 42],
    glossary: [{ term: 'ok', say: 'okay' }, { term: '', say: 'x' }, 'garbage'],
  });
  assert.deepEqual(result.keyConcepts, []);
  assert.deepEqual(result.expectedVisuals, ['code']);
  assert.equal(result.glossary.length, 1);
  assert.equal(result.glossary[0].term, 'ok');
});

test('the arrays are capped so the context block stays small', () => {
  const many = Array.from({ length: 40 }, (_, i) => `concept ${i}`);
  const result = normaliseComprehension({ domain: 'science', keyConcepts: many, expectedVisuals: many });
  assert.ok(result.keyConcepts.length <= 8);
  assert.ok(result.expectedVisuals.length <= 7);
});

test('the context block renders the understanding for a prompt', () => {
  const block = comprehensionContextBlock({
    domain: 'math',
    summary: 'The sigmoid function.',
    keyConcepts: ['sigmoid'],
    expectedVisuals: ['a plotted curve'],
    glossary: [{ term: 'σ(x)', say: 'sigma of x' }],
    guidance: 'Focus on the curve.',
  });
  assert.match(block, /The sigmoid function/);
  assert.match(block, /sigmoid/);
  assert.match(block, /σ\(x\).*sigma of x/);
  assert.match(block, /Focus on the curve/);
});

test('the context block is empty for a null understanding', () => {
  assert.equal(comprehensionContextBlock(null), '');
});
