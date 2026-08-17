/**
 * Speech-timestamp and gap detection.
 *
 * These are pure functions over transcript cues — no I/O — so the scheduling
 * behaviour that decides when Shruti is *allowed* to speak is fully unit
 * testable (spec §16).
 */
import { config } from '../config.js';

/**
 * Merges cues into continuous speech intervals.
 *
 * Captions arrive fragmented; two cues 0.2s apart are one breath, not a pause
 * worth speaking into. `mergeThreshold` closes those micro-gaps.
 *
 * @param {Array<{start:number,end:number}>} cues
 * @param {number} [mergeThreshold] seconds
 * @returns {Array<{start:number,end:number}>}
 */
export function speechIntervals(cues, mergeThreshold = 0.35) {
  const sorted = [...cues]
    .filter((cue) => Number.isFinite(cue.start) && Number.isFinite(cue.end) && cue.end > cue.start)
    .sort((a, b) => a.start - b.start);

  const merged = [];
  for (const cue of sorted) {
    const last = merged[merged.length - 1];
    if (last && cue.start - last.end <= mergeThreshold) {
      last.end = Math.max(last.end, cue.end);
    } else {
      merged.push({ start: cue.start, end: cue.end });
    }
  }
  return merged;
}

/**
 * The complement of `intervals` — the silences.
 *
 * Only gaps *between* the first and last utterance are returned: silence
 * before the instructor starts or after they finish is not a place where a
 * description helps.
 *
 * @param {Array<{start:number,end:number}>} intervals merged speech
 * @param {number} [minGap] shortest silence worth using
 * @returns {Array<{start:number,end:number,duration:number}>}
 */
export function findGaps(intervals, minGap = config.pipeline.minGapSeconds) {
  const gaps = [];
  for (let i = 0; i < intervals.length - 1; i += 1) {
    const start = intervals[i].end;
    const end = intervals[i + 1].start;
    const duration = end - start;
    if (duration >= minGap) gaps.push({ start, end, duration });
  }
  return gaps;
}

/**
 * How many words fit in a gap at normal speech-synthesis speed.
 * Used to keep descriptions inside the silence they are scheduled in.
 */
export function wordBudget(gapDuration, wordsPerSecond = 2.8) {
  return Math.max(0, Math.floor(gapDuration * wordsPerSecond));
}

/**
 * Builds the candidate timestamps that Gemma will be asked about.
 *
 * Two kinds of candidate:
 *  - `pause`  — a natural silence exists; a description can be spoken without
 *               ever overlapping the instructor (spec §8, Case 1).
 *  - `forced` — narration has run without a usable pause for a long stretch;
 *               playback will be paused to speak (Extended AD, spec §8 Case 2).
 *
 * @param {object} args
 * @param {Array} args.cues transcript cues
 * @param {number} [args.duration] video duration in seconds
 * @param {object} [args.options] overrides for the pipeline config
 * @returns {Array<{time:number, frameTime:number, gapStart:number, gapEnd:number,
 *                  gapDuration:number, requiresPause:boolean, wordBudget:number}>}
 */
export function buildCandidates({ cues, duration, options = {} }) {
  const settings = {
    minGapSeconds: config.pipeline.minGapSeconds,
    minSpacingSeconds: config.pipeline.minSpacingSeconds,
    forcedCandidateInterval: config.pipeline.forcedCandidateInterval,
    maxCandidates: config.pipeline.maxCandidates,
    ...options,
  };

  const intervals = speechIntervals(cues);
  if (!intervals.length) return [];

  const videoEnd = Number.isFinite(duration) ? duration : intervals[intervals.length - 1].end;
  const gaps = findGaps(intervals, settings.minGapSeconds);

  /** @type {Array} */
  const candidates = [];

  for (const gap of gaps) {
    // Speak just after narration stops; look at the frame just *before* it
    // stopped, because that is the visual the instructor was talking over.
    const time = round(gap.start + 0.15);
    candidates.push({
      time,
      frameTime: round(Math.max(0, gap.start - 0.4)),
      gapStart: round(gap.start),
      gapEnd: round(gap.end),
      gapDuration: round(gap.duration),
      requiresPause: false,
      wordBudget: Math.min(14, wordBudget(gap.duration)),
      kind: 'pause',
    });
  }

  // Extended AD: long unbroken narration still needs coverage.
  for (const interval of intervals) {
    const length = interval.end - interval.start;
    if (length < settings.forcedCandidateInterval) continue;
    const steps = Math.floor(length / settings.forcedCandidateInterval);
    for (let step = 1; step <= steps; step += 1) {
      const time = round(interval.start + step * settings.forcedCandidateInterval);
      if (time >= videoEnd - 1) continue;
      candidates.push({
        time,
        frameTime: time,
        gapStart: time,
        gapEnd: time,
        gapDuration: 0,
        requiresPause: true,
        wordBudget: 12,
        kind: 'forced',
      });
    }
  }

  return limitCandidates(candidates, settings);
}

/**
 * Enforces minimum spacing and the hard ceiling on Gemma calls.
 * Natural pauses win ties over forced ones, and longer pauses win over shorter.
 */
export function limitCandidates(candidates, settings) {
  const ordered = [...candidates].sort((a, b) => a.time - b.time);

  const spaced = [];
  for (const candidate of ordered) {
    const previous = spaced[spaced.length - 1];
    if (!previous || candidate.time - previous.time >= settings.minSpacingSeconds) {
      spaced.push(candidate);
      continue;
    }
    // Too close to the one we already kept — keep whichever is the better
    // speaking opportunity rather than blindly taking the earlier one.
    const better =
      (candidate.kind === 'pause' && previous.kind === 'forced') ||
      (candidate.kind === previous.kind && candidate.gapDuration > previous.gapDuration);
    if (better) spaced[spaced.length - 1] = candidate;
  }

  if (spaced.length <= settings.maxCandidates) return spaced;

  // Over budget: keep the best opportunities, then restore time order.
  const ranked = [...spaced].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'pause' ? -1 : 1;
    return b.gapDuration - a.gapDuration;
  });
  return ranked.slice(0, settings.maxCandidates).sort((a, b) => a.time - b.time);
}

const round = (value) => Math.round(value * 100) / 100;
