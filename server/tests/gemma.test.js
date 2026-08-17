import test from 'node:test';
import assert from 'node:assert/strict';
import { extractAnswerText } from '../src/services/gemma.js';
import { parseModelJson } from '../src/lib/json.js';

/**
 * Gemma 4 is a reasoning model whose thinking cannot be disabled, so every
 * response arrives as a `thought: true` part plus the real answer. These tests
 * pin the separation, because getting it wrong is silent: the pipeline would
 * parse the model's scratchpad and quietly stop producing descriptions.
 */

/** Shaped exactly like a real gemma-4-31b-it response. */
const candidate = {
  finishReason: 'STOP',
  content: {
    parts: [
      {
        thought: true,
        text:
          '*   Constraint: Reply with JSON only.\n' +
          '    *   JSON format: `{"needed": true|false, "description": "", "confidence": 0.0}`.\n' +
          '    *   The visual matches the audio.',
      },
      {
        text: '{"needed": true, "description": "The terminal prints one through ten.", "confidence": 0.94}',
      },
    ],
  },
};

test('the answer is taken from the non-thought part only', () => {
  const { text } = extractAnswerText(candidate);
  assert.equal(
    text,
    '{"needed": true, "description": "The terminal prints one through ten.", "confidence": 0.94}',
  );
});

test('the reasoning is kept separate, not discarded', () => {
  const { thoughts } = extractAnswerText(candidate);
  assert.match(thoughts, /Constraint: Reply with JSON only/);
});

test('the schema echoed inside the reasoning never reaches the parser', () => {
  // The regression this whole file exists for. Joining every part would hand
  // the parser the schema from the scratchpad, whose `true|false` is not valid
  // JSON — descriptions would silently vanish.
  const { text, thoughts } = extractAnswerText(candidate);
  const parsed = parseModelJson(text);

  assert.equal(parsed.needed, true);
  assert.equal(parsed.confidence, 0.94);
  assert.match(parsed.description, /terminal/);

  const naive = parseModelJson(thoughts + text);
  assert.notDeepEqual(naive, parsed, 'joining thoughts and answer must not be equivalent');
});

test('a response with no thought part still works', () => {
  const plain = { content: { parts: [{ text: '{"needed": false}' }] } };
  assert.equal(extractAnswerText(plain).text, '{"needed": false}');
  assert.equal(extractAnswerText(plain).thoughts, '');
});

test('multiple answer parts are concatenated in order', () => {
  const split = {
    content: {
      parts: [
        { thought: true, text: 'thinking...' },
        { text: '{"needed": true, ' },
        { text: '"confidence": 0.9}' },
      ],
    },
  };
  assert.equal(parseModelJson(extractAnswerText(split).text).confidence, 0.9);
});

test('a missing or malformed candidate yields empty strings, never a throw', () => {
  for (const input of [null, undefined, {}, { content: {} }, { content: { parts: [] } }]) {
    const result = extractAnswerText(input);
    assert.equal(result.text, '');
    assert.equal(result.thoughts, '');
  }
});
