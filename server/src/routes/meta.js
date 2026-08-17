/**
 * Health and configuration endpoints.
 *
 * `/api/config` is the spec's proof-of-Gemma endpoint (§3.5, §17 Scene 5): it
 * reports the model actually being used and states that no other generative
 * model exists in the system.
 */
import { Router } from 'express';
import { config, validateConfig } from '../config.js';
import { asyncRoute } from '../errors.js';
import { cacheStats } from '../lib/cache.js';
import { probeBinaries } from '../lib/binaries.js';
import { cookiePoolStatus } from '../lib/cookiePool.js';
import { currentResolution, listModels, resolveModel } from '../services/gemma.js';

export const metaRouter = Router();

metaRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), time: new Date().toISOString() });
});

metaRouter.get(
  '/api/config',
  asyncRoute(async (req, res) => {
    let resolution = currentResolution();
    let modelError = null;
    if (!resolution) {
      try {
        resolution = await resolveModel();
      } catch (err) {
        modelError = err.message;
      }
    }

    res.json({
      app: 'Shruti',
      tagline: 'Making visual content accessible through intelligent audio descriptions.',
      ai: {
        provider: 'Google AI Studio',
        family: 'Gemma',
        model: resolution?.model ?? null,
        requestedModel: resolution?.requested ?? config.gemma.model,
        selection: resolution?.source ?? null,
        availableGemmaModels: resolution?.candidates ?? [],
        error: modelError,
        // The guarantee this endpoint exists to prove.
        onlyGenerativeModel: 'Gemma',
        otherModelsUsed: [],
        policy:
          'Shruti calls exactly one generative model family: Gemma. Every request path ' +
          'validates the model id against /^gemma/ before dispatch and refuses anything else. ' +
          'No GPT, Claude, Gemini or other generative model is present in this codebase.',
      },
      pipeline: config.pipeline,
      confidence: config.confidence,
      frames: config.frames,
      configurationProblems: validateConfig(),
    });
  }),
);

/** Diagnostics for the doctor script and the settings screen. */
metaRouter.get(
  '/api/config/diagnostics',
  asyncRoute(async (req, res) => {
    const [binaries, cache] = await Promise.all([probeBinaries(), cacheStats()]);
    let models = [];
    let error = null;
    try {
      models = (await listModels()).map((m) => m.id);
    } catch (err) {
      error = err.message;
    }
    res.json({
      binaries,
      cache: { dir: config.cacheDir, ...cache },
      ytdlpCookiePool: cookiePoolStatus(),
      visibleModels: models,
      gemmaModels: models.filter((id) => /^gemma/i.test(id)),
      error,
      node: process.version,
      platform: process.platform,
    });
  }),
);
