/**
 * Shruti server entry point.
 *
 * Startup order matters: configuration is validated and the Gemma model is
 * resolved *before* the port opens, so a misconfigured install fails loudly
 * instead of failing silently in front of a blind user mid-video.
 */
import { config, validateConfig } from './config.js';
import { logger } from './logger.js';
import { createApp } from './app.js';
import { ensureCacheDirs } from './lib/cache.js';
import { probeBinaries } from './lib/binaries.js';
import { resolveModel } from './services/gemma.js';

/**
 * Refuses to start, without tearing the process down mid-flight: setting
 * `exitCode` lets Node unwind its handles cleanly and still report failure.
 */
function refuseToStart(reason) {
  logger.error(reason);
  logger.error('Shruti did not start. Run `npm run doctor` to diagnose.');
  process.exitCode = 1;
  return false;
}

async function main() {
  logger.info('Starting Shruti server');

  const problems = validateConfig();
  if (problems.length) {
    for (const problem of problems) logger.error(`Configuration problem: ${problem}`);
    return refuseToStart('Fix the configuration problems above (see .env.example).');
  }

  await ensureCacheDirs();
  logger.info(`Cache directory: ${config.cacheDir}`);

  const binaries = await probeBinaries();
  for (const [name, probe] of Object.entries(binaries)) {
    if (probe.available) logger.info(`${name}: ${probe.version}`);
    else logger.warn(`${name} is NOT available — video processing will fail. Run npm run doctor.`);
  }

  try {
    const { model, source, requested } = await resolveModel();
    logger.info(`Gemma model: ${model} (requested "${requested}", ${source})`);
  } catch (err) {
    // Refusing to start is the correct behaviour: the alternative would be a
    // server that silently has no model, or worse, reaches for another one.
    return refuseToStart(`Could not resolve a Gemma model: ${err.message}`);
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info(`Shruti API listening on http://localhost:${config.port}`);
    logger.info(`Model proof: http://localhost:${config.port}/api/config`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  return true;
}

main().catch((err) => {
  logger.error('Fatal startup error:', err.stack || err.message);
  process.exitCode = 1;
});
