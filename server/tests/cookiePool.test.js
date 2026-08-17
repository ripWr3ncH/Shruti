import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { config } from '../src/config.js';
import { cachePath, ensureCacheDirs } from '../src/lib/cache.js';
import { aliveCookieFiles, markCookieFileDead, cookiePoolStatus } from '../src/lib/cookiePool.js';

const originalDir = config.bin.ytdlpCookiesDir;
const originalSingle = config.bin.ytdlpCookies;
let poolDir;

test.before(async () => {
  await ensureCacheDirs();
  poolDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'vb-cookie-pool-'));
});

test.after(async () => {
  config.bin.ytdlpCookiesDir = originalDir;
  config.bin.ytdlpCookies = originalSingle;
  await fsp.rm(poolDir, { recursive: true, force: true });
  await fsp.rm(cachePath('data', 'cookie-pool.json'), { force: true });
});

test.beforeEach(async () => {
  // Every file in poolDir, and any persisted dead-file state, starts clean.
  for (const name of await fsp.readdir(poolDir)) await fsp.rm(path.join(poolDir, name));
  await fsp.rm(cachePath('data', 'cookie-pool.json'), { force: true });
  config.bin.ytdlpCookiesDir = poolDir;
  config.bin.ytdlpCookies = '';
});

function writeCookieFile(name) {
  const file = path.join(poolDir, name);
  fs.writeFileSync(file, '# Netscape HTTP Cookie File\n');
  return file;
}

test('no pool configured: alive list is empty, not an error', () => {
  config.bin.ytdlpCookiesDir = '';
  config.bin.ytdlpCookies = '';
  assert.deepEqual(aliveCookieFiles(), []);
  assert.deepEqual(cookiePoolStatus(), { total: 0, alive: 0 });
});

test('falls back to a single YTDLP_COOKIES_PATH when no dir is set', () => {
  config.bin.ytdlpCookiesDir = '';
  config.bin.ytdlpCookies = '/tmp/solo-cookies.txt';
  assert.deepEqual(aliveCookieFiles(), ['/tmp/solo-cookies.txt']);
});

test('every file in the pool directory is alive by default', () => {
  const a = writeCookieFile('cookies-1.txt');
  const b = writeCookieFile('cookies-2.txt');
  assert.deepEqual(aliveCookieFiles(), [a, b]);
  assert.deepEqual(cookiePoolStatus(), { total: 2, alive: 2 });
});

test('marking a file dead removes it from rotation until the cooldown passes', () => {
  const a = writeCookieFile('cookies-1.txt');
  const b = writeCookieFile('cookies-2.txt');
  markCookieFileDead(a);
  assert.deepEqual(aliveCookieFiles(), [b]);
  assert.equal(cookiePoolStatus().alive, 1);
});

test('when every file is dead, the whole pool is returned rather than nothing', () => {
  const a = writeCookieFile('cookies-1.txt');
  const b = writeCookieFile('cookies-2.txt');
  markCookieFileDead(a);
  markCookieFileDead(b);
  // A stale cookie still beats no cookie, and this gives a file a chance to
  // self-heal instead of being permanently skipped after one bad day.
  assert.deepEqual(aliveCookieFiles().sort(), [a, b].sort());
});

test('status reports 0 alive when every file is dead, not the retry fallback count', () => {
  const a = writeCookieFile('cookies-1.txt');
  markCookieFileDead(a);
  // aliveCookieFiles() falls back to the whole pool for actual retries, but
  // an operator checking status needs the honest number to know a fresh
  // cookie file is genuinely needed.
  assert.equal(aliveCookieFiles().length, 1);
  assert.deepEqual(cookiePoolStatus(), { total: 1, alive: 0 });
});

test('a fresh file dropped into the pool directory is picked up without a restart', () => {
  writeCookieFile('cookies-1.txt');
  assert.equal(aliveCookieFiles().length, 1);
  writeCookieFile('cookies-2.txt');
  assert.equal(aliveCookieFiles().length, 2);
});
