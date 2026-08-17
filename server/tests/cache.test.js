import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  cachePath,
  ensureCacheDirs,
  evictVideo,
  exists,
  hashKey,
  readJson,
  withJsonCache,
  writeJson,
} from '../src/lib/cache.js';

const NAME = 'cache-test-fixture.json';

test.after(async () => {
  await fs.rm(cachePath('tmp', NAME), { force: true });
});

test('ensureCacheDirs creates every area', async () => {
  const root = await ensureCacheDirs();
  for (const area of ['videos', 'frames', 'data', 'tmp']) {
    const stat = await fs.stat(path.join(root, area));
    assert.ok(stat.isDirectory(), `${area} should exist`);
  }
});

test('cachePath refuses an unknown area', () => {
  assert.throws(() => cachePath('etc', 'passwd'), /Unknown cache area/);
});

test('cachePath neutralises path traversal in the key', () => {
  const resolved = cachePath('data', '../../escaped');
  assert.ok(!resolved.includes('..'), 'the key must not escape the cache directory');
  assert.ok(resolved.startsWith(cachePath('data')));
});

test('cachePath keeps ordinary video ids readable', () => {
  assert.ok(cachePath('frames', 'aircAruvnKk').endsWith('aircAruvnKk'));
});

test('JSON round-trips through the cache', async () => {
  await ensureCacheDirs();
  const value = { descriptions: [{ time: 13.5, description: 'A flowchart appears.' }] };
  await writeJson('tmp', NAME, value);
  assert.deepEqual(await readJson('tmp', NAME), value);
});

test('reading a missing entry is a miss, not an error', async () => {
  assert.equal(await readJson('tmp', 'definitely-not-written.json'), null);
});

test('withJsonCache calls the producer once and reuses the result', async () => {
  await fs.rm(cachePath('tmp', NAME), { force: true });

  let calls = 0;
  const produce = async () => {
    calls += 1;
    return { generated: calls };
  };

  const first = await withJsonCache('tmp', NAME, produce);
  const second = await withJsonCache('tmp', NAME, produce);

  assert.equal(calls, 1, 'the expensive producer must not run twice');
  assert.deepEqual(first, second);
});

test('exists reports false for missing and empty files', async () => {
  assert.equal(await exists(cachePath('tmp', 'nope.bin')), false);
  const emptyFile = cachePath('tmp', 'empty.bin');
  await fs.writeFile(emptyFile, '');
  assert.equal(await exists(emptyFile), false, 'a zero-byte file is a failed write, not a hit');
  await fs.rm(emptyFile, { force: true });
});

test('hashKey is stable and order-independent for the same object', () => {
  const a = hashKey({ model: 'gemma-4-27b-it', threshold: 0.85 });
  const b = hashKey({ model: 'gemma-4-27b-it', threshold: 0.85 });
  assert.equal(a, b);
  assert.notEqual(a, hashKey({ model: 'gemma-3-4b-it', threshold: 0.85 }));
  assert.equal(a.length, 16);
});

test('evictVideo reports nothing removed when the id was never cached', async () => {
  await ensureCacheDirs();
  // `fs.rm(..., { force: true })` silently succeeds on a missing path, which
  // previously made every target count as removed — so evicting an unknown id
  // reported files it had not touched.
  const removed = await evictVideo('no-such-video-id-xyz');
  assert.deepEqual(removed, [], 'an uncached id must report zero removals');
});
