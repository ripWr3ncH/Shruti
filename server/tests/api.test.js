/**
 * HTTP-level tests. These run without network access and without an API key:
 * they cover routing, validation, error shape, and the Gemma-proof endpoint.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

let server;
let base;

test.before(async () => {
  const app = createApp();
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test('GET /health reports ok', async () => {
  const response = await fetch(`${base}/health`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, 'ok');
});

test('GET /api/config proves Gemma is the only generative model', async () => {
  const response = await fetch(`${base}/api/config`);
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.app, 'Shruti');
  assert.equal(body.ai.family, 'Gemma');
  assert.equal(body.ai.onlyGenerativeModel, 'Gemma');
  assert.deepEqual(body.ai.otherModelsUsed, []);
  assert.match(body.ai.policy, /Gemma/);
  // If a model was resolved, it must be a Gemma one.
  if (body.ai.model) assert.match(body.ai.model, /^gemma/i);
});

test('GET /api/describe/presets lists the interactive questions', async () => {
  const response = await fetch(`${base}/api/describe/presets`);
  const body = await response.json();
  assert.ok(body.presets.length >= 5);
  assert.ok(body.presets.some((p) => p.id === 'read-code'));
  for (const preset of body.presets) {
    assert.ok(preset.id && preset.label && preset.question);
  }
});

test('GET /api/video/info rejects a missing url with a helpful message', async () => {
  const response = await fetch(`${base}/api/video/info`);
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error.code, 'bad_request');
  assert.match(body.error.message, /YouTube url/i);
});

test('GET /api/video/info rejects a non-YouTube url', async () => {
  const response = await fetch(`${base}/api/video/info?url=https://vimeo.com/12345678`);
  assert.equal(response.status, 400);
});

test('POST /api/describe/frame requires a timestamp', async () => {
  const response = await fetch(`${base}/api/describe/frame`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId: 'aircAruvnKk', question: 'What is on screen?' }),
  });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(body.error.message, /time/);
});

test('POST /api/describe/frame requires a question', async () => {
  const response = await fetch(`${base}/api/describe/frame`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId: 'aircAruvnKk', time: 30 }),
  });
  assert.equal(response.status, 400);
});

test('POST /api/describe/frame rejects an over-long question', async () => {
  const response = await fetch(`${base}/api/describe/frame`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId: 'aircAruvnKk', time: 30, question: 'a'.repeat(400) }),
  });
  assert.equal(response.status, 400);
});

test('GET /api/process/:jobId returns 404 for an unknown job', async () => {
  const response = await fetch(`${base}/api/process/not-a-real-job`);
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal(body.error.code, 'not_found');
});

test('unknown routes return a structured 404', async () => {
  const response = await fetch(`${base}/api/does-not-exist`);
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.ok(body.error.message.includes('/api/does-not-exist'));
});

test('GET /api/videos/ready lists only fully processed videos', async () => {
  const response = await fetch(`${base}/api/videos/ready`);
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.ok(Array.isArray(body.videos));
  assert.equal(body.count, body.videos.length);

  // Every entry is offered as guaranteed-playable, so it must carry what the
  // client needs to render and open it without a lookup.
  for (const video of body.videos) {
    assert.ok(video.videoId, 'each entry needs a video id');
    assert.ok(video.title, 'each entry needs a title');
    assert.ok(video.url.includes(video.videoId), 'the url must point at that video');
    assert.ok(video.thumbnail, 'each entry needs a thumbnail');
    assert.ok(video.descriptions > 0, 'an example with no descriptions demonstrates nothing');
  }
});

test('DELETE /api/video/cache is not exposed unless explicitly enabled', async () => {
  // The API has no authentication and CORS does not constrain a non-browser
  // caller, so an unconfigured deployment must not expose cache eviction:
  // a wiped video cannot be rebuilt without live yt-dlp.
  const response = await fetch(`${base}/api/video/cache?videoId=aircAruvnKk`, { method: 'DELETE' });
  assert.equal(response.status, 404);
});
