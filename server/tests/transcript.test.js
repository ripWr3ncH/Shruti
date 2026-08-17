import test from 'node:test';
import assert from 'node:assert/strict';
import { contextAround, parseJson3, parseVtt, parseVttTimestamp } from '../src/services/transcript.js';

const json3 = JSON.stringify({
  events: [
    { tStartMs: 1000, dDurationMs: 2000, segs: [{ utf8: 'Now ' }, { utf8: 'click here.' }] },
    { tStartMs: 5000, dDurationMs: 1500, segs: [{ utf8: '[Music]' }] },
    { tStartMs: 8000, dDurationMs: 2500, segs: [{ utf8: 'The output appears.' }] },
  ],
});

test('parseJson3 reads timings and joins segments', () => {
  const cues = parseJson3(json3);
  assert.equal(cues.length, 2, 'the music-only cue carries no words and is dropped');
  assert.deepEqual(cues[0], { start: 1, end: 3, text: 'Now click here.' });
  assert.equal(cues[1].start, 8);
  assert.equal(cues[1].end, 10.5);
});

test('parseJson3 estimates a duration when one is missing', () => {
  const cues = parseJson3(
    JSON.stringify({ events: [{ tStartMs: 0, segs: [{ utf8: 'one two three four five six' }] }] }),
  );
  assert.equal(cues.length, 1);
  assert.ok(cues[0].end > cues[0].start, 'a cue must never have zero length');
});

test('parseJson3 survives malformed input', () => {
  assert.deepEqual(parseJson3('not json'), []);
  assert.deepEqual(parseJson3(JSON.stringify({})), []);
});

test('parseJson3 collapses the roll-up repetition in auto-captions', () => {
  const rollup = JSON.stringify({
    events: [
      { tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: 'so now' }] },
      { tStartMs: 200, dDurationMs: 1200, segs: [{ utf8: 'so now we run it' }] },
    ],
  });
  const cues = parseJson3(rollup);
  assert.equal(cues.length, 1);
  assert.equal(cues[0].text, 'so now we run it');
});

test('parseVttTimestamp understands both timestamp forms', () => {
  assert.equal(parseVttTimestamp('00:01:02.500'), 62.5);
  assert.equal(parseVttTimestamp('01:02.500'), 62.5);
  assert.equal(parseVttTimestamp('00:00:01,250'), 1.25);
  assert.equal(parseVttTimestamp('garbage'), null);
});

test('parseVtt reads a standard cue list', () => {
  const vtt = `WEBVTT

00:00:01.000 --> 00:00:03.000
Now click here.

00:00:08.000 --> 00:00:10.500 align:start position:0%
The <b>output</b> appears.`;

  const cues = parseVtt(vtt);
  assert.equal(cues.length, 2);
  assert.deepEqual(cues[0], { start: 1, end: 3, text: 'Now click here.' });
  assert.equal(cues[1].text, 'The output appears.', 'inline markup is stripped');
});

test('contextAround splits narration into before, current and after', () => {
  const cues = [
    { start: 0, end: 4, text: 'First we open the editor.' },
    { start: 5, end: 9, text: 'Now let us execute it.' },
    { start: 12, end: 16, text: 'And there is the result.' },
  ];

  // A narrow window keeps only the utterance that just ended.
  const narrow = contextAround(cues, 10, 3);
  assert.equal(narrow.before, 'Now let us execute it.');
  assert.equal(narrow.current, '');
  assert.equal(narrow.after, 'And there is the result.');

  // The default 12 second window reaches further back for context.
  const wide = contextAround(cues, 10);
  assert.equal(wide.before, 'First we open the editor. Now let us execute it.');

  const during = contextAround(cues, 6);
  assert.equal(during.current, 'Now let us execute it.');
});

test('contextAround respects the window and never throws on empty input', () => {
  assert.deepEqual(contextAround([], 42), { before: '', current: '', after: '' });
  const far = contextAround([{ start: 0, end: 1, text: 'hello' }], 500);
  assert.equal(far.before, '');
});
