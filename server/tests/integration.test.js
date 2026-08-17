/**
 * End-to-end integration tests (spec §16).
 *
 * These hit YouTube and Gemma for real, so they are opt-in:
 *
 *   RUN_INTEGRATION=1 npm test --workspace server
 *
 * They cover the full chain the spec asks for:
 *   YouTube URL -> transcript -> frame extraction -> Gemma -> timeline,
 * plus both description endpoints.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src/config.js';
import { createApp } from '../src/app.js';

const enabled = process.env.RUN_INTEGRATION === '1' && Boolean(config.gemma.apiKey);
const VIDEO = process.env.INTEGRATION_VIDEO_ID || 'aircAruvnKk';
const options = { skip: enabled ? false : 'set RUN_INTEGRATION=1 and GEMMA_API_KEY to run' };

let server;
let base;

test.before(async () => {
  if (!enabled) return;
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => (server ? new Promise((resolve) => server.close(resolve)) : undefined));

const post = (path, body) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

test('the running model is a Gemma model', options, async () => {
  const body = await (await fetch(`${base}/api/config`)).json();
  assert.match(body.ai.model, /^gemma/i);
  assert.equal(body.ai.error, null);
});

test('captions come back with cues and detected gaps', options, async () => {
  const body = await (await fetch(`${base}/api/captions?videoId=${VIDEO}`)).json();
  assert.ok(body.cues.length > 10);
  assert.ok(body.speechIntervals.length > 0);
  assert.ok(Array.isArray(body.gaps));
});

test('a frame can be extracted and served', options, async () => {
  const response = await fetch(`${base}/api/video/frame?videoId=${VIDEO}&time=30`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/jpeg');
  const buffer = Buffer.from(await response.arrayBuffer());
  assert.ok(buffer.length > 2000, 'a real JPEG, not an empty file');
  assert.equal(buffer[0], 0xff, 'JPEG magic byte');
});

test(
  'POST /api/describe/batch produces a valid, confidence-filtered timeline',
  { ...options, timeout: 900_000 },
  async () => {
    const response = await post('/api/describe/batch', {
      videoId: VIDEO,
      maxCandidates: 6,
    });
    assert.equal(response.status, 200);
    const timeline = await response.json();

    assert.match(timeline.model, /^gemma/i);
    assert.ok(Array.isArray(timeline.descriptions));
    assert.ok(timeline.stats.candidates > 0);

    let previousTime = -1;
    for (const entry of timeline.descriptions) {
      assert.ok(entry.description.length > 0, 'no empty descriptions may be stored');
      assert.ok(
        entry.confidence >= config.confidence.critical,
        `confidence ${entry.confidence} is below the discard threshold`,
      );
      assert.ok(entry.description.split(/\s+/).length <= 20, 'descriptions stay short');
      assert.ok(entry.time > previousTime, 'timeline must be in ascending time order');
      previousTime = entry.time;
    }
  },
);

test('a second batch call is served from the cache', { ...options, timeout: 120_000 }, async () => {
  const response = await post('/api/describe/batch', { videoId: VIDEO, maxCandidates: 6 });
  const timeline = await response.json();
  assert.equal(timeline.cached, true, 'regenerating would waste Gemma calls');
});

test(
  'POST /api/describe/frame answers from the current frame',
  { ...options, timeout: 180_000 },
  async () => {
    const response = await post('/api/describe/frame', {
      videoId: VIDEO,
      time: 105,
      presetId: 'whats-on-screen',
    });
    assert.equal(response.status, 200);

    const answer = await response.json();
    assert.match(answer.model, /^gemma/i);
    assert.equal(answer.time, 105);
    assert.ok(answer.answer.length > 0);
    assert.equal(typeof answer.grounded, 'boolean');
    assert.ok(answer.confidence >= 0 && answer.confidence <= 1);
  },
);
