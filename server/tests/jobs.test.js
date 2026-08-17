import test from 'node:test';
import assert from 'node:assert/strict';
import { __clearJobs, getJob, getJobForVideo, serialiseJob, startJob } from '../src/services/jobs.js';

const settle = () => new Promise((resolve) => setImmediate(resolve));

test.beforeEach(() => __clearJobs());

test('a job runs, reports progress, and stores its result', async () => {
  const job = startJob({
    videoId: 'video-a',
    run: async (report) => {
      report({ stage: 'transcript', percent: 40, message: 'Reading captions' });
      return { descriptions: [{ time: 1, description: 'x' }] };
    },
  });

  assert.equal(job.status, 'running');
  await settle();
  await settle();

  const finished = getJob(job.id);
  assert.equal(finished.status, 'done');
  assert.equal(finished.percent, 100);
  assert.equal(finished.result.descriptions.length, 1);
});

test('a failing job records the error instead of throwing', async () => {
  const job = startJob({
    videoId: 'video-b',
    run: async () => {
      throw new Error('yt-dlp exploded');
    },
  });

  await settle();
  await settle();

  const finished = getJob(job.id);
  assert.equal(finished.status, 'error');
  assert.match(finished.error.message, /exploded/);
});

test('a second request for a running video joins the existing job', async () => {
  let started = 0;
  const run = async () => {
    started += 1;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return {};
  };

  const first = startJob({ videoId: 'video-c', run });
  const second = startJob({ videoId: 'video-c', run });

  assert.equal(first.id, second.id, 'the same video must not be processed twice at once');
  assert.equal(started, 1);
});

test('refresh forces a new job even when one has finished', async () => {
  const run = async () => ({});
  const first = startJob({ videoId: 'video-d', run });
  await settle();
  await settle();

  const reused = startJob({ videoId: 'video-d', run });
  assert.equal(reused.id, first.id);

  const forced = startJob({ videoId: 'video-d', run, refresh: true });
  assert.notEqual(forced.id, first.id);
});

test('getJobForVideo finds the latest job for a video', async () => {
  const job = startJob({ videoId: 'video-e', run: async () => ({}) });
  assert.equal(getJobForVideo('video-e').id, job.id);
  assert.equal(getJobForVideo('never-processed'), null);
});

test('serialiseJob exposes only client-safe fields', () => {
  const job = startJob({ videoId: 'video-f', run: async () => ({}) });
  const view = serialiseJob(job);
  assert.deepEqual(Object.keys(view).sort(), [
    'error',
    'finishedAt',
    'jobId',
    'message',
    'percent',
    'result',
    'stage',
    'startedAt',
    'status',
    'videoId',
  ]);
  assert.equal(serialiseJob(null), null);
});
