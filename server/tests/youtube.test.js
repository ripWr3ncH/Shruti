import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVideoId, watchUrl } from '../src/services/youtube.js';

test('parses every common YouTube URL form', () => {
  const cases = [
    ['https://www.youtube.com/watch?v=aircAruvnKk', 'aircAruvnKk'],
    ['https://youtube.com/watch?v=aircAruvnKk&t=90s', 'aircAruvnKk'],
    ['https://m.youtube.com/watch?v=aircAruvnKk', 'aircAruvnKk'],
    ['https://youtu.be/aircAruvnKk', 'aircAruvnKk'],
    ['https://youtu.be/aircAruvnKk?t=42', 'aircAruvnKk'],
    ['https://www.youtube.com/embed/aircAruvnKk', 'aircAruvnKk'],
    ['https://www.youtube.com/shorts/aircAruvnKk', 'aircAruvnKk'],
    ['youtube.com/watch?v=aircAruvnKk', 'aircAruvnKk'],
    ['  https://www.youtube.com/watch?v=aircAruvnKk  ', 'aircAruvnKk'],
    ['aircAruvnKk', 'aircAruvnKk'],
  ];
  for (const [input, expected] of cases) {
    assert.equal(parseVideoId(input), expected, `failed on ${input}`);
  }
});

test('rejects input that is not a YouTube video', () => {
  const bad = [
    '',
    '   ',
    null,
    undefined,
    'https://vimeo.com/12345678',
    'https://www.youtube.com/',
    'https://www.youtube.com/watch?v=tooshort',
    'not a url at all',
  ];
  for (const input of bad) {
    assert.throws(() => parseVideoId(input), `should have rejected ${input}`);
  }
});

test('rejections are phrased for a person, not a stack trace', () => {
  try {
    parseVideoId('https://vimeo.com/12345678');
    assert.fail('expected a rejection');
  } catch (err) {
    assert.equal(err.status, 400);
    assert.match(err.message, /YouTube/);
  }
});

test('watchUrl builds a canonical link', () => {
  assert.equal(watchUrl('aircAruvnKk'), 'https://www.youtube.com/watch?v=aircAruvnKk');
});
