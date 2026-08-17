/**
 * Speech-to-text for voice search.
 *
 * IMPORTANT: this is Automatic Speech Recognition (Whisper), an explicitly
 * permitted *supporting* technology. It transcribes a spoken search phrase into
 * text — it never generates content and is not an LLM, so Gemma stays the only
 * generative model in the project. Every provider-specific detail lives behind
 * the single `transcribe()` function, so switching to a local Whisper (e.g.
 * whisper.cpp) later is a one-file change with no impact on the rest of the app.
 */
import { config } from '../config.js';
import { AppError } from '../errors.js';
import { logger } from '../logger.js';

/** Whether voice search is available (an API key is configured). */
export function voiceConfigured() {
  return Boolean(config.voice.openaiApiKey);
}

/** Map a recorded audio MIME type to a filename Whisper will recognise. */
function filenameFor(mimeType) {
  const type = String(mimeType || '').toLowerCase();
  if (type.includes('mp4') || type.includes('m4a') || type.includes('aac')) return 'audio.mp4';
  if (type.includes('ogg')) return 'audio.ogg';
  if (type.includes('wav')) return 'audio.wav';
  if (type.includes('mpeg') || type.includes('mp3')) return 'audio.mp3';
  return 'audio.webm';
}

/**
 * Transcribes a spoken clip to text.
 *
 * @param {Buffer} audio raw audio bytes as recorded by the browser
 * @param {{mimeType?:string, language?:string}} [options]
 * @returns {Promise<string>} the recognised text (may be empty for silence)
 */
export async function transcribe(audio, { mimeType = 'audio/webm', language } = {}) {
  const key = config.voice.openaiApiKey;
  if (!key) {
    throw new AppError(
      'Voice search is not configured. Add OPENAI_API_KEY to .env to enable it, or type your search instead.',
      503,
      'voice_unconfigured',
    );
  }
  if (!audio || !audio.length) {
    throw new AppError('No audio was received to transcribe.', 400, 'no_audio');
  }

  const form = new FormData();
  form.append('file', new Blob([audio], { type: mimeType }), filenameFor(mimeType));
  form.append('model', config.voice.whisperModel);
  form.append('response_format', 'json');
  // A language hint improves accuracy and speed when we know it (e.g. Bengali).
  if (language) form.append('language', language);

  let response;
  try {
    response = await logger.time('whisper transcription', () =>
      fetch(`${config.voice.openaiBaseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}` },
        body: form,
      }),
    );
  } catch (err) {
    logger.warn(`Whisper request failed to send: ${err.message}`);
    throw new AppError('Could not reach the transcription service. Check your connection.', 502, 'transcribe_unreachable');
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    logger.warn(`Whisper transcription failed: ${response.status} ${detail.slice(0, 200)}`);
    const message =
      response.status === 401
        ? 'The transcription service rejected the API key. Check OPENAI_API_KEY in .env.'
        : 'Could not transcribe the audio. Please try speaking again.';
    throw new AppError(message, 502, 'transcribe_failed');
  }

  const data = await response.json().catch(() => null);
  return String(data?.text || '').trim();
}
