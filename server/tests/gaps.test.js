import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCandidates, findGaps, limitCandidates, speechIntervals, wordBudget } from '../src/services/gaps.js';

const cue = (start, end, text = 'words here') => ({ start, end, text });

test('speechIntervals merges cues separated by less than the threshold', () => {
  const merged = speechIntervals([cue(0, 2), cue(2.2, 4), cue(10, 12)]);
  assert.deepEqual(merged, [
    { start: 0, end: 4 },
    { start: 10, end: 12 },
  ]);
});

test('speechIntervals keeps a real pause separate', () => {
  const merged = speechIntervals([cue(0, 2), cue(5, 7)]);
  assert.equal(merged.length, 2);
});

test('speechIntervals handles overlapping cues and unsorted input', () => {
  const merged = speechIntervals([cue(5, 8), cue(0, 6)]);
  assert.deepEqual(merged, [{ start: 0, end: 8 }]);
});

test('speechIntervals discards zero-length and malformed cues', () => {
  const merged = speechIntervals([cue(3, 3), cue(NaN, 5), cue(10, 12)]);
  assert.deepEqual(merged, [{ start: 10, end: 12 }]);
});

test('findGaps returns only silences at or above the minimum', () => {
  const gaps = findGaps(
    [
      { start: 0, end: 10 },
      { start: 10.5, end: 20 },
      { start: 23, end: 30 },
    ],
    1.2,
  );
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].start, 20);
  assert.equal(gaps[0].duration, 3);
});

test('findGaps ignores silence before the first and after the last utterance', () => {
  const gaps = findGaps([{ start: 30, end: 60 }], 1);
  assert.deepEqual(gaps, []);
});

test('wordBudget scales with the length of the gap', () => {
  assert.equal(wordBudget(1), 2);
  assert.equal(wordBudget(5), 14);
  assert.equal(wordBudget(0), 0);
});

test('buildCandidates places a candidate inside each natural pause', () => {
  const cues = [cue(0, 10), cue(14, 24)];
  const candidates = buildCandidates({ cues, duration: 30 });

  assert.equal(candidates.length, 1);
  const [candidate] = candidates;
  assert.equal(candidate.kind, 'pause');
  assert.equal(candidate.requiresPause, false);
  // Speak just after narration stops...
  assert.ok(candidate.time > 10 && candidate.time < 14);
  // ...but look at the frame from while the instructor was still talking.
  assert.ok(candidate.frameTime < 10);
});

test('buildCandidates adds forced candidates when narration never pauses', () => {
  const cues = [cue(0, 200)];
  const candidates = buildCandidates({
    cues,
    duration: 200,
    options: { forcedCandidateInterval: 45, minSpacingSeconds: 8 },
  });

  assert.ok(candidates.length >= 4);
  assert.ok(candidates.every((c) => c.requiresPause === true));
  assert.deepEqual(
    candidates.map((c) => c.time),
    [45, 90, 135, 180],
  );
});

test('buildCandidates returns nothing when there is no speech at all', () => {
  assert.deepEqual(buildCandidates({ cues: [], duration: 60 }), []);
});

test('candidates are always in ascending time order', () => {
  const cues = [cue(0, 100), cue(104, 300)];
  const candidates = buildCandidates({ cues, duration: 300 });
  const times = candidates.map((c) => c.time);
  assert.deepEqual(times, [...times].sort((a, b) => a - b));
});

test('limitCandidates enforces minimum spacing, preferring natural pauses', () => {
  const kept = limitCandidates(
    [
      { time: 10, kind: 'forced', gapDuration: 0 },
      { time: 12, kind: 'pause', gapDuration: 3 },
      { time: 40, kind: 'pause', gapDuration: 2 },
    ],
    { minSpacingSeconds: 8, maxCandidates: 10 },
  );

  assert.equal(kept.length, 2);
  assert.equal(kept[0].kind, 'pause', 'the natural pause should displace the forced one');
  assert.equal(kept[0].time, 12);
});

test('limitCandidates caps the number of Gemma calls but keeps time order', () => {
  const many = Array.from({ length: 30 }, (_, i) => ({
    time: i * 20,
    kind: 'pause',
    gapDuration: i,
  }));

  const kept = limitCandidates(many, { minSpacingSeconds: 8, maxCandidates: 5 });
  assert.equal(kept.length, 5);
  assert.deepEqual(
    kept.map((c) => c.time),
    [...kept].map((c) => c.time).sort((a, b) => a - b),
  );
  // The five longest gaps are the last five candidates.
  assert.equal(kept[0].gapDuration, 25);
});
