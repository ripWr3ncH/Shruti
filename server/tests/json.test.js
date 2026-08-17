import test from 'node:test';
import assert from 'node:assert/strict';
import { clamp01, findJsonObject, parseModelJson } from '../src/lib/json.js';

test('parses a clean JSON response', () => {
  assert.deepEqual(parseModelJson('{"needed":true,"confidence":0.9}'), {
    needed: true,
    confidence: 0.9,
  });
});

test('parses JSON inside a markdown fence', () => {
  const raw = '```json\n{"needed": false, "description": ""}\n```';
  assert.deepEqual(parseModelJson(raw), { needed: false, description: '' });
});

test('parses JSON that follows a sentence of prose', () => {
  const raw = 'Here is my answer:\n{"needed": true, "description": "The Run button is clicked."}';
  assert.equal(parseModelJson(raw).description, 'The Run button is clicked.');
});

test('handles braces inside string values', () => {
  const raw = '{"description": "The code shows for (i) { print(i) }", "needed": true}';
  assert.equal(parseModelJson(raw).description, 'The code shows for (i) { print(i) }');
});

test('handles escaped quotes inside string values', () => {
  const raw = '{"description": "He types \\"hello\\" in the terminal", "needed": true}';
  assert.equal(parseModelJson(raw).description, 'He types "hello" in the terminal');
});

test('repairs trailing commas', () => {
  assert.deepEqual(parseModelJson('{"needed": false,}'), { needed: false });
});

test('repairs single-quoted keys and values', () => {
  const parsed = parseModelJson("{'needed': true, 'description': 'A flowchart appears.'}");
  assert.equal(parsed.description, 'A flowchart appears.');
});

test('returns null rather than guessing when nothing is parseable', () => {
  assert.equal(parseModelJson('I am not sure what to do here.'), null);
  assert.equal(parseModelJson(''), null);
  assert.equal(parseModelJson(null), null);
});

test('rejects arrays and scalars — the contract is an object', () => {
  assert.equal(parseModelJson('[1,2,3]'), null);
  assert.equal(parseModelJson('"just a string"'), null);
});

test('findJsonObject returns the first balanced object', () => {
  assert.equal(findJsonObject('noise {"a":{"b":1}} tail'), '{"a":{"b":1}}');
  assert.equal(findJsonObject('{"unbalanced": '), null);
  assert.equal(findJsonObject('no braces at all'), null);
});

test('clamp01 keeps confidence inside the unit interval', () => {
  assert.equal(clamp01(0.5), 0.5);
  assert.equal(clamp01(1.7), 1);
  assert.equal(clamp01(-3), 0);
  assert.equal(clamp01('0.8'), 0.8);
  assert.equal(clamp01('not a number'), 0);
  assert.equal(clamp01(undefined), 0);
});
