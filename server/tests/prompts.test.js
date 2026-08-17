/**
 * The prompts carry the project's safety properties, so they are asserted
 * like any other contract: the decision must come before the description,
 * silence must always be an acceptable answer, and the intelligence upgrades
 * (whole-video understanding, brief-vs-explain, domain awareness) must actually
 * reach the model.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDecisionPrompt, buildQuestionPrompt, QUESTION_PRESETS } from '../src/prompts/describe.js';

const context = {
  before: 'So now let us run the program.',
  current: '',
  after: 'And there is our output.',
};

const understanding = {
  domain: 'coding',
  summary: 'How to write a Python function that sums a list.',
  keyConcepts: ['functions', 'loops', 'return values'],
  expectedVisuals: ['code defining a function', 'a terminal showing output'],
  glossary: [{ term: 'numpy', say: 'num-pie' }],
  guidance: 'The code on screen matters most; the webcam does not.',
};

const block =
  "This video's topic: How to write a Python function that sums a list.\nKey concepts: functions, loops, return values.";

/* -------------------------------------------------------- decision prompt -- */

test('the decision prompt asks for a decision before it allows a description', () => {
  const prompt = buildDecisionPrompt({ time: 37.2, context });
  const decisionIndex = prompt.indexOf('DECISION FIRST');
  const writingIndex = prompt.indexOf('WRITING FOR THE EAR');
  assert.ok(decisionIndex > -1, 'prompt must frame the task as a decision');
  assert.ok(writingIndex > decisionIndex, 'writing guidance must come after the decision');
});

test('the decision prompt makes silence an explicit, expected answer', () => {
  const prompt = buildDecisionPrompt({ time: 10, context });
  assert.match(prompt, /correct, expected answer most of the time/);
  assert.match(prompt, /worse than no description/);
});

test('the decision prompt offers both a brief and a full-explanation mode', () => {
  const prompt = buildDecisionPrompt({ time: 10, context });
  assert.match(prompt, /mode "brief"/);
  assert.match(prompt, /mode "explain"/);
  assert.match(prompt, /video will be paused/i);
});

test('the decision prompt lists what must never be described', () => {
  const prompt = buildDecisionPrompt({ time: 10, context });
  for (const forbidden of ['speaker', 'room', 'camera movement', 'already explained']) {
    assert.match(prompt, new RegExp(forbidden, 'i'));
  }
});

test('the decision prompt carries the narration on both sides of the moment', () => {
  const prompt = buildDecisionPrompt({ time: 10, context });
  assert.match(prompt, /So now let us run the program/);
  assert.match(prompt, /And there is our output/);
  assert.match(prompt, /\(silence\)/, 'an empty context must read as silence, not as nothing');
});

test('the brief word budget is clamped into a speakable range', () => {
  assert.match(buildDecisionPrompt({ time: 1, context, wordBudget: 2 }), /At most 6 words/);
  assert.match(buildDecisionPrompt({ time: 1, context, wordBudget: 99 }), /At most 16 words/);
  assert.match(buildDecisionPrompt({ time: 1, context, wordBudget: 9 }), /At most 9 words/);
});

test('earlier descriptions are passed back so they are not repeated', () => {
  const prompt = buildDecisionPrompt({
    time: 90,
    context,
    alreadyDescribed: ['A flowchart appears.', 'The Run button is clicked.'],
  });
  assert.match(prompt, /never repeat/i);
  assert.match(prompt, /A flowchart appears\./);
});

test('the decision prompt requests the upgraded JSON contract', () => {
  const prompt = buildDecisionPrompt({ time: 1, context });
  for (const key of ['"needed"', '"mode"', '"visualType"', '"description"', '"confidence"']) {
    assert.match(prompt, new RegExp(key));
  }
});

/* --------------------------------------------------- comprehension + domain */

test('the whole-video understanding is injected when provided', () => {
  const prompt = buildDecisionPrompt({ time: 10, context, understanding, comprehensionBlock: block });
  assert.match(prompt, /WHAT THIS VIDEO IS ABOUT/);
  assert.match(prompt, /How to write a Python function/);
});

test('a coding video gets the coding-specific describing rules', () => {
  const prompt = buildDecisionPrompt({ time: 10, context, understanding, comprehensionBlock: block });
  assert.match(prompt, /RULES FOR THIS KIND OF VIDEO \(coding\)/);
  assert.match(prompt, /do NOT describe individual keystrokes/i);
  assert.match(prompt, /COMPLETE and settled/i);
});

test('a math video gets math-speak rules', () => {
  const prompt = buildDecisionPrompt({
    time: 10,
    context,
    understanding: { ...understanding, domain: 'math' },
    comprehensionBlock: block,
  });
  assert.match(prompt, /RULES FOR THIS KIND OF VIDEO \(math\)/);
  assert.match(prompt, /read aloud|say symbols|the way a person would read it/i);
});

test('with no understanding, no domain block is emitted', () => {
  const prompt = buildDecisionPrompt({ time: 10, context });
  assert.doesNotMatch(prompt, /RULES FOR THIS KIND OF VIDEO/);
});

/* -------------------------------------------------------- question prompt -- */

test('the question prompt refuses to answer from anything but the frame', () => {
  const prompt = buildQuestionPrompt({ question: 'Read the code.', time: 42, context });
  assert.match(prompt, /Read the code\./);
  assert.match(prompt, /only from what is literally visible/i);
  assert.match(prompt, /never invent/i);
  assert.match(prompt, /say so plainly/i);
});

test('the question prompt writes for the ear', () => {
  const prompt = buildQuestionPrompt({ question: 'Read the code.', time: 42, context });
  assert.match(prompt, /spoken aloud/);
  assert.match(prompt, /no markdown/i);
});

test('the question prompt carries the video understanding too', () => {
  const prompt = buildQuestionPrompt({
    question: 'Explain the graph.',
    time: 42,
    context,
    understanding,
    comprehensionBlock: block,
  });
  assert.match(prompt, /WHAT THIS VIDEO IS ABOUT/);
  assert.match(prompt, /HOW TO EXPLAIN THIS KIND OF CONTENT \(coding\)/);
});

test('every preset is well formed and covers the questions in the spec', () => {
  const labels = QUESTION_PRESETS.map((p) => p.label.toLowerCase());
  for (const expected of ['read the code', "what's on screen?", 'what changed?']) {
    assert.ok(labels.includes(expected), `missing preset: ${expected}`);
  }
  const ids = QUESTION_PRESETS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, 'preset ids must be unique');
});
