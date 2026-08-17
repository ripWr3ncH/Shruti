/**
 * Gemma client — the ONLY generative model in Shruti.
 *
 * Talks to the Google AI Studio `generateContent` endpoint. Every request path
 * runs through `assertGemmaOnly`, so it is structurally impossible for this
 * codebase to call GPT, Claude, Gemini or any other model.
 *
 * Note on the request shape: Gemma models on AI Studio do not accept
 * `systemInstruction` or a JSON response mime type, so instructions live in the
 * user turn and JSON is recovered from the text with `parseModelJson`.
 */
import { assertGemmaOnly, bareModelId, config } from '../config.js';
import { upstreamError, AppError } from '../errors.js';
import { logger } from '../logger.js';
import { parseModelJson } from '../lib/json.js';
import { sleep } from '../lib/pool.js';

/** Cached result of model resolution, so we list models at most once. */
let resolution = null;

/**
 * Splits a candidate's parts into the model's private reasoning and its actual
 * answer.
 *
 * Gemma 4 is a reasoning model: it always thinks before answering, and the
 * thinking cannot be switched off (`thinkingConfig` is rejected outright).
 * The API returns those thoughts as parts flagged `thought: true`, alongside
 * the real answer.
 *
 * Keeping them apart is not cosmetic. The reasoning routinely quotes the JSON
 * schema it was given, so a naive join would hand the parser a fake object
 * before the genuine one and every description would come out wrong.
 *
 * @param {object} candidate a `candidates[i]` object from generateContent
 * @returns {{text:string, thoughts:string}}
 */
export function extractAnswerText(candidate) {
  const parts = candidate?.content?.parts || [];
  const collect = (wantThought) =>
    parts
      .filter((part) => Boolean(part.thought) === wantThought)
      .map((part) => part.text || '')
      .join('')
      .trim();

  return { text: collect(false), thoughts: collect(true) };
}

/** Parses "gemma-3-27b-it" into sortable parts. */
function scoreModel(id) {
  const bare = bareModelId(id);
  const version = Number.parseFloat((bare.match(/gemma-(\d+(?:\.\d+)?)/i) || [])[1] || '0');
  const params = Number.parseFloat((bare.match(/-(\d+(?:\.\d+)?)b/i) || [])[1] || '0');
  const instructionTuned = /-it\b/i.test(bare) ? 1 : 0;
  return { version, params, instructionTuned };
}

/**
 * Every Gemma 4 size is multimodal, as is every Gemma 3 size except the 1B
 * checkpoint, which is text-only. Shruti cannot work without vision, so
 * 1B is never an acceptable pick.
 *
 * A size we cannot parse (the E2B/E4B naming, or a future scheme) scores 0 and
 * is allowed through: the resolver would rather try a model and fail loudly
 * than silently exclude a usable one.
 */
function isVisionCapable(id) {
  const { params } = scoreModel(id);
  return params === 0 || params >= 2;
}

function betterThan(a, b) {
  const sa = scoreModel(a);
  const sb = scoreModel(b);
  if (sa.version !== sb.version) return sa.version > sb.version;
  if (sa.instructionTuned !== sb.instructionTuned) return sa.instructionTuned > sb.instructionTuned;
  return sa.params > sb.params;
}

/** Lists every model this API key can reach. */
export async function listModels() {
  if (!config.gemma.apiKey) {
    throw new AppError(
      'GEMMA_API_KEY is not set. Add it to .env — see .env.example.',
      500,
      'missing_api_key',
    );
  }
  const url = `${config.gemma.baseUrl}/models?pageSize=1000&key=${encodeURIComponent(config.gemma.apiKey)}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(config.gemma.timeoutMs) });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw upstreamError(`Could not list models (HTTP ${response.status})`, body.slice(0, 400));
  }
  const payload = await response.json();
  return (payload.models || []).map((m) => ({
    id: bareModelId(m.name),
    methods: m.supportedGenerationMethods || [],
    inputTokenLimit: m.inputTokenLimit,
  }));
}

/**
 * Decides which Gemma model this process will use, and proves it exists.
 *
 * - `GEMMA_MODEL=auto` picks the newest vision-capable Gemma the key can see.
 * - A pinned id is used as-is when available, otherwise we fall back through
 *   `GEMMA_MODEL_PREFERENCES` and report that we did.
 *
 * @param {{force?: boolean}} [options]
 */
export async function resolveModel({ force = false } = {}) {
  if (resolution && !force) return resolution;

  const configured = config.gemma.model;
  const available = await listModels();
  const gemmaModels = available
    .filter((m) => m.methods.includes('generateContent'))
    .map((m) => m.id)
    .filter((id) => {
      try {
        assertGemmaOnly(id);
        return true;
      } catch {
        return false; // Not a Gemma model — Shruti will not consider it.
      }
    });

  const usable = gemmaModels.filter(isVisionCapable);

  let selected = null;
  let source = 'pinned';
  let requested = configured;

  if (configured && configured !== 'auto') {
    assertGemmaOnly(configured);
    if (usable.includes(bareModelId(configured))) selected = bareModelId(configured);
  }

  if (!selected) {
    source = configured === 'auto' ? 'auto' : 'fallback';
    for (const preference of config.gemma.preferences) {
      assertGemmaOnly(preference);
      if (usable.includes(bareModelId(preference))) {
        selected = bareModelId(preference);
        break;
      }
    }
  }

  if (!selected && usable.length) {
    source = 'auto';
    selected = usable.reduce((best, id) => (betterThan(id, best) ? id : best));
  }

  if (!selected) {
    throw new AppError(
      'No Gemma model with vision support is available to this API key. ' +
        `Models visible to the key: ${gemmaModels.join(', ') || '(none)'}. ` +
        'Shruti will not substitute a non-Gemma model.',
      503,
      'no_gemma_model',
    );
  }

  assertGemmaOnly(selected);
  resolution = { model: selected, requested, source, candidates: usable, resolvedAt: new Date().toISOString() };
  logger.info(`Gemma model resolved: ${selected} (requested "${requested}", source: ${source})`);
  return resolution;
}

/** The resolved model, if resolution has already happened. */
export const currentResolution = () => resolution;

/**
 * One Gemma generation via the primary provider — Google AI Studio's
 * `generateContent`. Retries on rate limits and 5xx.
 */
async function generateViaGoogle(
  model,
  apiKey,
  {
    prompt,
    images = [],
    temperature = 0.1,
    maxOutputTokens = 512,
    maxRetries = config.gemma.maxRetries,
    timeoutMs = config.gemma.timeoutMs,
    thinkingLevel,
  },
) {
  const parts = [];
  for (const image of images) {
    parts.push({
      inline_data: { mime_type: image.mimeType || 'image/jpeg', data: image.data },
    });
  }
  parts.push({ text: prompt });

  const generationConfig = { temperature, maxOutputTokens, topP: 0.9 };
  // Gemma 4 reasons before answering by default, which is worth ~80s of latency
  // we don't want on an interactive question. The Gemini API exposes this as
  // thinkingConfig.thinkingLevel ("minimal" = off; note it does NOT accept the
  // thinkingBudget knob that Gemini 2.5 models use — that returns a 400 here).
  if (thinkingLevel) generationConfig.thinkingConfig = { thinkingLevel };

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig,
  };
  const url = `${config.gemma.baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (response.status === 429 || response.status >= 500) {
        const detail = await response.text().catch(() => '');
        lastError = upstreamError(`Gemma returned HTTP ${response.status}`, detail.slice(0, 300));
        await sleep(500 * 2 ** attempt);
        continue;
      }
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw upstreamError(`Gemma request failed (HTTP ${response.status})`, detail.slice(0, 400));
      }

      const payload = await response.json();
      const candidate = payload.candidates?.[0];
      const { text, thoughts } = extractAnswerText(candidate);

      // Thinking is billed against maxOutputTokens, so an over-tight budget is
      // spent reasoning and the answer never arrives. Silent truncation would
      // look exactly like "no description needed", so say so loudly.
      if (candidate?.finishReason === 'MAX_TOKENS') {
        logger.warn(
          `Gemma hit the output token limit before finishing` +
            ` (${payload.usageMetadata?.thoughtsTokenCount ?? '?'} tokens spent thinking).` +
            ' Raise maxOutputTokens — the answer was truncated.',
        );
      }

      return {
        text,
        thoughts,
        model,
        provider: 'google',
        usage: payload.usageMetadata || null,
        finishReason: candidate?.finishReason,
      };
    } catch (err) {
      lastError = err;
      if (err instanceof AppError && err.code !== 'upstream_error') throw err;
      if (attempt === maxRetries) break;
      await sleep(500 * 2 ** attempt);
    }
  }
  throw lastError || upstreamError('Gemma request failed');
}

/**
 * Single Gemma generation call. Uses the primary Google AI Studio key; if that
 * fails and a secondary key is configured (e.g. a different Google account), it
 * retries the same Gemma model on the fallback key — same endpoint, separate
 * rate-limit quota. Both keys only ever call Gemma.
 *
 * @param {object} options
 * @param {string} options.prompt instruction + context, already assembled
 * @param {Array<{data:string, mimeType?:string}>} [options.images] base64 frames
 * @param {number} [options.temperature]
 * @param {number} [options.maxOutputTokens]
 * @returns {Promise<{text:string, model:string, provider:string, usage:object|null}>}
 */
export async function generate(options = {}) {
  // An explicit `model` override (e.g. the faster Gemma 4 for live Q&A) skips
  // resolution; otherwise use the pinned/auto-resolved model. Either way the
  // Gemma-only guard still runs, so nothing but Gemma can ever be called.
  const { model: modelOverride, allowFallback = true, ...genOptions } = options;
  const model = modelOverride || (await resolveModel()).model;
  assertGemmaOnly(model);

  try {
    return await generateViaGoogle(model, config.gemma.apiKey, genOptions);
  } catch (primaryErr) {
    // Interactive callers can opt out of the fallback key: a slow-but-alive
    // primary should not trigger a second full-length call (that is what turned
    // a timeout into a multi-minute wait). The fallback still guards batch work.
    if (!allowFallback || !config.gemma.apiKeyFallback) throw primaryErr;
    logger.warn(
      `Primary Gemma key failed: ${primaryErr.message}. Falling back to the secondary Google key.`,
    );
    try {
      const result = await generateViaGoogle(model, config.gemma.apiKeyFallback, genOptions);
      logger.info('Served by the secondary Gemma API key (fallback).');
      return { ...result, provider: 'google-fallback' };
    } catch (fallbackErr) {
      logger.warn(`Secondary Gemma key also failed: ${fallbackErr.message}`);
      throw primaryErr; // surface the primary failure to the caller
    }
  }
}

/**
 * Generation that must produce a JSON object.
 * @returns {Promise<{json:object|null, text:string, model:string}>}
 */
export async function generateJson(options) {
  const result = await generate(options);
  const json = parseModelJson(result.text);
  if (!json) {
    logger.warn(`Gemma returned unparseable JSON: ${result.text.slice(0, 200)}`);
  }
  return { ...result, json };
}

/** Test hook: clears the memoised model resolution. */
export function __resetResolution() {
  resolution = null;
}
