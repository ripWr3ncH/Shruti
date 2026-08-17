import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyConfidenceRules,
  descriptionSimilarity,
  findNearDuplicate,
  isCriticalDescription,
  normaliseDecision,
} from '../src/services/timeline.js';

const thresholds = { high: 0.85, critical: 0.6 };

/* --------------------------------------------------------- normalisation -- */

test('normaliseDecision passes a well-formed positive decision through', () => {
  assert.deepEqual(
    normaliseDecision({
      needed: true,
      mode: 'brief',
      visualType: 'ui',
      description: 'The Run button is clicked.',
      confidence: 0.91,
    }),
    {
      needed: true,
      mode: 'brief',
      visualType: 'ui',
      description: 'The Run button is clicked.',
      confidence: 0.91,
    },
  );
});

test('normaliseDecision defaults mode to brief and visualType to other', () => {
  const result = normaliseDecision({ needed: true, description: 'x', confidence: 0.9 });
  assert.equal(result.mode, 'brief');
  assert.equal(result.visualType, 'other');
});

test('normaliseDecision keeps an explain decision and normalises visualType', () => {
  const result = normaliseDecision({
    needed: true,
    mode: 'explain',
    visualType: 'Graph',
    description: 'The curve rises from zero to one.',
    confidence: 0.95,
  });
  assert.equal(result.mode, 'explain');
  assert.equal(result.visualType, 'graph');
});

test('normaliseDecision rejects an unknown mode down to brief', () => {
  const result = normaliseDecision({ needed: true, mode: 'sing', description: 'x', confidence: 0.9 });
  assert.equal(result.mode, 'brief');
});

test('normaliseDecision accepts the string and numeric forms of `needed`', () => {
  assert.equal(normaliseDecision({ needed: 'true', description: 'x', confidence: 1 }).needed, true);
  assert.equal(normaliseDecision({ needed: 1, description: 'x', confidence: 1 }).needed, true);
  assert.equal(normaliseDecision({ needed: 'yes', description: 'x', confidence: 1 }).needed, true);
  assert.equal(normaliseDecision({ needed: 'false', description: 'x', confidence: 1 }).needed, false);
});

test('normaliseDecision strips "the image shows" style preambles', () => {
  const result = normaliseDecision({
    needed: true,
    description: 'The image shows a flowchart with three boxes.',
    confidence: 0.9,
  });
  assert.equal(result.description, 'a flowchart with three boxes.');
});

test('normaliseDecision treats a needed decision with no text as silence', () => {
  const result = normaliseDecision({ needed: true, description: '   ', confidence: 0.99 });
  assert.equal(result.needed, false);
});

test('normaliseDecision never invents data from malformed input', () => {
  for (const input of [null, undefined, 'nonsense', 42, []]) {
    const result = normaliseDecision(input);
    assert.equal(result.needed, false);
    assert.equal(result.description, '');
  }
});

test('normaliseDecision clamps an out-of-range confidence', () => {
  assert.equal(normaliseDecision({ needed: true, description: 'x', confidence: 42 }).confidence, 1);
  assert.equal(normaliseDecision({ needed: true, description: 'x', confidence: -1 }).confidence, 0);
});

/* ------------------------------------------------------ confidence rules -- */

test('a not-needed decision is never spoken', () => {
  const verdict = applyConfidenceRules(
    { needed: false, description: '', confidence: 0.99 },
    {},
    thresholds,
  );
  assert.equal(verdict.accepted, false);
  assert.equal(verdict.tier, 'not_needed');
});

test('confidence at or above the high threshold is spoken', () => {
  for (const confidence of [0.85, 0.9, 1]) {
    const verdict = applyConfidenceRules(
      { needed: true, description: 'A flowchart appears.', confidence },
      {},
      thresholds,
    );
    assert.equal(verdict.accepted, true, `confidence ${confidence} should be accepted`);
    assert.equal(verdict.tier, 'high');
  }
});

test('the middle band is spoken only when the information is critical', () => {
  const critical = applyConfidenceRules(
    { needed: true, description: 'The terminal prints seven.', confidence: 0.72 },
    { requiresPause: false },
    thresholds,
  );
  assert.equal(critical.accepted, true);
  assert.equal(critical.tier, 'conditional');

  const cosmetic = applyConfidenceRules(
    { needed: true, description: 'A slide fades in.', confidence: 0.72 },
    { requiresPause: false },
    thresholds,
  );
  assert.equal(cosmetic.accepted, false);
});

test('a medium-confidence BRIEF pointer never justifies pausing the instructor', () => {
  const verdict = applyConfidenceRules(
    { needed: true, mode: 'brief', visualType: 'terminal', description: 'The terminal prints seven.', confidence: 0.72 },
    { requiresPause: true },
    thresholds,
  );
  assert.equal(verdict.accepted, false);
});

test('a medium-confidence full EXPLANATION of a complex visual earns the pause', () => {
  // The user directive: an unexplained graph/diagram should be paused for and
  // explained properly, even at middling confidence, because that is exactly
  // the moment a blind learner is otherwise lost.
  const verdict = applyConfidenceRules(
    {
      needed: true,
      mode: 'explain',
      visualType: 'graph',
      description: 'The sigmoid curve rises from zero, through one half at x equals zero, toward one.',
      confidence: 0.72,
    },
    { requiresPause: false },
    thresholds,
  );
  assert.equal(verdict.accepted, true);
  assert.equal(verdict.tier, 'conditional');
});

test('an explain decision at high confidence is always accepted', () => {
  const verdict = applyConfidenceRules(
    { needed: true, mode: 'explain', visualType: 'diagram', description: 'A layered network diagram.', confidence: 0.95 },
    { requiresPause: false },
    thresholds,
  );
  assert.equal(verdict.accepted, true);
  assert.equal(verdict.tier, 'high');
});

test('a non-critical visual type in the middle band is still discarded', () => {
  const verdict = applyConfidenceRules(
    { needed: true, mode: 'brief', visualType: 'other', description: 'A slide fades in.', confidence: 0.72 },
    { requiresPause: false },
    thresholds,
  );
  assert.equal(verdict.accepted, false);
});

test('anything below the critical threshold is discarded', () => {
  for (const confidence of [0.59, 0.3, 0]) {
    const verdict = applyConfidenceRules(
      { needed: true, description: 'The terminal prints seven.', confidence },
      {},
      thresholds,
    );
    assert.equal(verdict.accepted, false, `confidence ${confidence} must be discarded`);
    assert.equal(verdict.tier, 'low');
  }
});

/* ------------------------------------------------- near-duplicate filter -- */

// The two graph descriptions from the Dijkstra video — the exact case the user
// reported: the same weighted graph explained a second time, minutes apart.
const graphAt45 =
  'A weighted graph with nodes A through F. Node A connects to B with weight 2 and D with weight 8. B connects to E with weight 6 and D with weight 5. D connects to E with weight 3 and F with weight 2. E connects to F with weight 1 and C with weight 9. Finally, F connects to C with weight 3.';
const graphAt90 =
  'A graph shows six nodes, A through F. Node A connects to B with weight 2 and D with weight 8. B connects to E with weight 6 and D with weight 5. D connects to E with weight 3 and F with weight 2. E connects to F with weight 1 and C with weight 9. F connects to C with weight 3.';

test('descriptionSimilarity scores a near-verbatim repeat very high', () => {
  assert.ok(descriptionSimilarity(graphAt45, graphAt90) > 0.85);
});

test('descriptionSimilarity scores genuinely different descriptions low', () => {
  const a = 'The green Run button is clicked.';
  const b = 'A terminal prints the numbers one through ten.';
  assert.ok(descriptionSimilarity(a, b) < 0.3);
});

test('findNearDuplicate catches the repeated graph', () => {
  const accepted = [{ description: graphAt45, time: 45 }];
  const hit = findNearDuplicate(graphAt90, accepted);
  assert.ok(hit);
  assert.equal(hit.time, 45);
});

test('findNearDuplicate lets a genuinely new description through', () => {
  const accepted = [{ description: graphAt45, time: 45 }];
  assert.equal(
    findNearDuplicate('The distance to node B updates to 2 and node B is marked visited.', accepted),
    null,
  );
});

test('findNearDuplicate never suppresses short pointers', () => {
  // Two brief pointers can share most of their few words yet be different
  // events; there is too little text to call it a repeat.
  const accepted = [{ description: 'Node A is selected.', time: 10 }];
  assert.equal(findNearDuplicate('Node B is selected.', accepted), null);
});

test('isCriticalDescription recognises learning-critical content', () => {
  assert.ok(isCriticalDescription('The green Run button is clicked.'));
  assert.ok(isCriticalDescription('An error message appears.'));
  assert.ok(isCriticalDescription('The graph axis is labelled time.'));
  assert.ok(!isCriticalDescription('The speaker smiles at the camera.'));
  assert.ok(!isCriticalDescription(''));
});
