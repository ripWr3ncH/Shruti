/**
 * Central configuration for Shruti.
 *
 * Reads `.env` from the repository root, applies defaults, and enforces the
 * project's single non-negotiable AI rule: **Gemma is the only LLM**.
 */
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, '..', '..');

loadEnv({ path: path.join(REPO_ROOT, '.env') });
loadEnv({ path: path.join(REPO_ROOT, 'server', '.env') });

/** Any model Shruti is allowed to call must satisfy this. */
export const GEMMA_MODEL_PATTERN = /^(models\/)?gemma[-\d.]/i;

const num = (value, fallback) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const int = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : fallback;
};

const list = (value, fallback) =>
  (value ? value.split(',') : fallback).map((s) => s.trim()).filter(Boolean);

/**
 * Only an explicit, affirmative value turns a flag on. Anything else — unset,
 * empty, `false`, or a typo — leaves it off, so a destructive capability is
 * never enabled by a malformed setting.
 */
const bool = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const env = process.env;

export const config = {
  port: int(env.PORT, 5174),
  logLevel: env.LOG_LEVEL || 'info',
  corsOrigin: env.CORS_ORIGIN || 'http://localhost:5173',
  cacheDir: path.isAbsolute(env.CACHE_DIR || '')
    ? env.CACHE_DIR
    : path.join(REPO_ROOT, env.CACHE_DIR || '.cache'),

  // Registers DELETE /api/video/cache, which erases every artefact for a video.
  // Off unless explicitly enabled, so a deployment that configures nothing does
  // not expose it: the API has no authentication, and CORS does not apply to a
  // non-browser client. Losing a cached video is worse than it sounds — it
  // cannot be rebuilt without live yt-dlp, and Gemma is not deterministic, so
  // the replacement descriptions would no longer match the ones documented.
  enableCacheAdmin: bool(env.ENABLE_CACHE_ADMIN, false),

  gemma: {
    apiKey: env.GEMMA_API_KEY || '',
    // Optional fallback: a second Google AI Studio key (e.g. a different Google
    // account). Used only when the primary key fails or is rate-limited — same
    // endpoint, same Gemma model, separate quota.
    apiKeyFallback: env.GEMMA_API_KEY_FALLBACK || '',
    /**
     * The generative model. Pinned to a verified Gemma 4 id by default;
     * `auto` (resolve the best available Gemma at startup) is also supported.
     */
    model: env.GEMMA_MODEL || 'gemma-4-31b-it',
    // Gemma 4 ids served by the Gemini API, best first. The fallback is the
    // faster MoE Gemma 4 variant.
    preferences: list(env.GEMMA_MODEL_PREFERENCES, ['gemma-4-31b-it', 'gemma-4-26b-a4b-it']),
    baseUrl: (env.GEMMA_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(
      /\/$/,
      '',
    ),
    timeoutMs: int(env.GEMMA_TIMEOUT_MS, 90_000),
    maxRetries: int(env.GEMMA_MAX_RETRIES, 2),
    concurrency: int(env.GEMMA_CONCURRENCY, 3),
  },

  bin: {
    ytdlp: env.YTDLP_PATH || '',
    ffmpeg: env.FFMPEG_PATH || '',
    ffprobe: env.FFPROBE_PATH || '',
    // Netscape-format cookies.txt for yt-dlp. Needed on hosts whose IP YouTube
    // treats as a bot (most datacenter/cloud ranges) — without it, metadata,
    // video and subtitle requests all fail with "Sign in to confirm you're
    // not a bot". Leave blank to let yt-dlp request anonymously (fine on most
    // residential connections).
    ytdlpCookies: env.YTDLP_COOKIES_PATH || '',
    // A directory of cookies.txt files (one per throwaway account), tried in
    // rotation. YouTube revokes a session's cookies on its own schedule, not
    // the file's stated expiry — when one is bot-checked, it is skipped for a
    // cooldown and the next file in the pool is used automatically. Takes
    // priority over YTDLP_COOKIES_PATH when set.
    ytdlpCookiesDir: env.YTDLP_COOKIES_DIR || '',
    // Egress proxy for every yt-dlp request (`http://`, `https://` or
    // `socks5://`). The bot-check is really a judgement about the *IP*, not
    // the session, which is why cookies exported from a working browser still
    // rot within days on a datacenter host. Sending yt-dlp out through a
    // residential connection addresses the cause, and needs no cookies at all.
    // Only the one-time download per video goes through it — playback is the
    // YouTube iframe and Q&A reads the cached file, so neither touches this.
    ytdlpProxy: env.YTDLP_PROXY || '',
  },

  pipeline: {
    minGapSeconds: num(env.MIN_GAP_SECONDS, 1.2),
    minSpacingSeconds: num(env.MIN_SPACING_SECONDS, 8),
    forcedCandidateInterval: num(env.FORCED_CANDIDATE_INTERVAL, 45),
    maxCandidates: int(env.MAX_CANDIDATES, 60),
  },

  confidence: {
    high: num(env.CONFIDENCE_HIGH, 0.85),
    critical: num(env.CONFIDENCE_CRITICAL, 0.6),
  },

  frames: {
    width: int(env.FRAME_WIDTH, 640),
    quality: int(env.FRAME_QUALITY, 5),
    maxVideoHeight: int(env.MAX_VIDEO_HEIGHT, 480),
  },

  // Voice search — speech-to-text so a blind learner can search YouTube by
  // speaking. Whisper is a Speech-Processing (ASR) model, an explicitly allowed
  // *supporting* technology; it is NOT an LLM and never generates content, so
  // Gemma remains the only generative model in the project.
  voice: {
    openaiApiKey: env.OPENAI_API_KEY || '',
    whisperModel: env.WHISPER_MODEL || 'whisper-1',
    openaiBaseUrl: (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
  },

  // YouTube search — powered by yt-dlp's built-in search (no extra API key).
  search: {
    maxResults: int(env.SEARCH_MAX_RESULTS, 6),
  },

  language: {
    /**
     * Caption languages to fetch. `auto` (the default) derives them from the
     * video's own available tracks, so a Bengali lesson gets Bengali captions
     * and an English one gets English — no per-language code anywhere. An
     * explicit comma list (e.g. `bn,en`) forces a fixed preference instead.
     */
    captionLangs: list(env.CAPTION_LANGS, ['auto']),
    /**
     * Fallback language for descriptions and answers, used when a request does
     * not name one. English by default, matching the app's own default; `auto`
     * mirrors the narration (describe a Bengali video in Bengali), and a
     * BCP-47 code (e.g. `bn`, `es`) forces one regardless of the video.
     *
     * The app sends its interface language on every request, so this only
     * applies to direct API calls.
     */
    output: (env.OUTPUT_LANG || 'en').trim(),
  },
};

/**
 * Normalises a model id to its bare form (`models/gemma-3-4b-it` -> `gemma-3-4b-it`).
 */
export function bareModelId(model) {
  return String(model || '').replace(/^models\//, '');
}

/**
 * Throws unless `model` is a Gemma model.
 *
 * This is the guard that makes rule #1 of the spec mechanically enforceable:
 * no GPT, no Claude, no Gemini, no other generative model can ever be reached
 * through this codebase, because every request path calls this first.
 */
export function assertGemmaOnly(model) {
  if (!GEMMA_MODEL_PATTERN.test(String(model || ''))) {
    throw new Error(
      `Shruti refuses to run a non-Gemma model. Got "${model}". ` +
        'Gemma is the only generative model permitted in this project.',
    );
  }
  return bareModelId(model);
}

/**
 * Validates configuration at startup. Returns a list of human-readable
 * problems; an empty list means the process is safe to serve traffic.
 */
export function validateConfig(cfg = config) {
  const problems = [];
  if (!cfg.gemma.apiKey) {
    problems.push('GEMMA_API_KEY is not set. Get a key at https://aistudio.google.com/apikey');
  }
  if (cfg.gemma.model !== 'auto') {
    try {
      assertGemmaOnly(cfg.gemma.model);
    } catch (err) {
      problems.push(err.message);
    }
  }
  for (const pref of cfg.gemma.preferences) {
    if (!GEMMA_MODEL_PATTERN.test(pref)) {
      problems.push(`GEMMA_MODEL_PREFERENCES contains a non-Gemma model: "${pref}"`);
    }
  }
  if (cfg.confidence.critical > cfg.confidence.high) {
    problems.push('CONFIDENCE_CRITICAL must be <= CONFIDENCE_HIGH');
  }
  if (cfg.pipeline.minGapSeconds <= 0) {
    problems.push('MIN_GAP_SECONDS must be greater than 0');
  }
  return problems;
}

export default config;
