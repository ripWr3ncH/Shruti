/**
 * The ready-to-play library.
 *
 * Lists videos that are *fully* processed on this server, so the client can
 * offer them as examples. This matters most on a cloud host: a video already
 * in the cache needs no yt-dlp call, so it plays instantly and works even when
 * YouTube is bot-checking the server's IP. Anything listed here is guaranteed
 * to open without touching the network.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { cachePath, exists, readJson } from '../lib/cache.js';
import { logger } from '../logger.js';

/**
 * A video counts as ready only when every artefact the player needs is on
 * disk. A timeline is the payoff, but the video file matters too: interactive
 * Q&A extracts frames from it with ffmpeg, so listing an entry without one
 * would offer a video whose questions cannot be answered.
 */
async function isReady(videoId, dataFiles) {
  const hasTimeline = dataFiles.some(
    (name) => name.startsWith(`${videoId}.timeline.`) && name.endsWith('.json'),
  );
  if (!hasTimeline) return false;
  if (!(await exists(cachePath('data', `${videoId}.transcript.json`)))) return false;

  // The download keeps its original container, so the extension is not fixed.
  const videoDir = cachePath('videos');
  let entries = [];
  try {
    entries = await fs.readdir(videoDir);
  } catch {
    return false;
  }
  return entries.some((name) => name.startsWith(`${videoId}.`));
}

/** How many descriptions a ready video has, for display. Never throws. */
async function describedCount(videoId, dataFiles) {
  const name = dataFiles.find(
    (file) => file.startsWith(`${videoId}.timeline.`) && file.endsWith('.json'),
  );
  if (!name) return null;
  try {
    const timeline = await readJson('data', name);
    return Array.isArray(timeline?.descriptions) ? timeline.descriptions.length : null;
  } catch {
    return null;
  }
}

/**
 * Every fully-processed video on this server, newest cache entry first.
 * @returns {Promise<Array<object>>}
 */
export async function listReadyVideos() {
  let dataFiles;
  try {
    dataFiles = await fs.readdir(cachePath('data'));
  } catch {
    return []; // nothing processed yet
  }

  const ids = dataFiles
    .filter((name) => name.endsWith('.info.json'))
    .map((name) => name.slice(0, -'.info.json'.length));

  const ready = [];
  for (const videoId of ids) {
    try {
      if (!(await isReady(videoId, dataFiles))) continue;
      const info = await readJson('data', `${videoId}.info.json`);
      if (!info?.title) continue;

      // Staying silent is a valid outcome — the pipeline speaks only when the
      // screen shows something the narration does not explain. But a video
      // with nothing to say demonstrates nothing, so it is not offered as an
      // example, however completely it was processed.
      const descriptions = await describedCount(videoId, dataFiles);
      if (!descriptions) continue;

      const { mtimeMs } = await fs.stat(path.join(cachePath('data'), `${videoId}.info.json`));
      ready.push({
        videoId,
        title: info.title,
        channel: info.channel || null,
        duration: info.duration ?? null,
        language: info.language || null,
        thumbnail: info.thumbnail || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        url: info.webpageUrl || `https://www.youtube.com/watch?v=${videoId}`,
        descriptions,
        cachedAt: mtimeMs,
      });
    } catch (err) {
      // One unreadable entry must not blank the whole library.
      logger.debug(`skipping ${videoId} in ready library: ${err.message}`);
    }
  }

  ready.sort((a, b) => b.cachedAt - a.cachedAt);
  return ready.map(({ cachedAt, ...video }) => video);
}

export default listReadyVideos;
