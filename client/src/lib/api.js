/** Thin fetch wrapper around the Shruti API. */

/**
 * Where the API lives.
 *
 * Empty (the default) keeps every path relative, which is what local dev wants:
 * Vite proxies `/api` to the server, and `npm start` serves the built client
 * from the server itself. A split deployment — static client on one host, the
 * pipeline server on a machine with ffmpeg and yt-dlp — sets VITE_API_BASE to
 * that server's origin at build time.
 */
export const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

/** Resolves an API path against the configured base. */
export const apiUrl = (path) => `${API_BASE}${path}`;

async function request(path, { method = 'GET', body, signal } = {}) {
  const response = await fetch(apiUrl(path), {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error?.message || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.code = payload?.error?.code;
    error.status = response.status;
    throw error;
  }
  return payload;
}

export const api = {
  config: () => request('/api/config'),
  diagnostics: () => request('/api/config/diagnostics'),
  videoInfo: (url) => request(`/api/video/info?url=${encodeURIComponent(url)}`),
  captions: (url) => request(`/api/captions?url=${encodeURIComponent(url)}`),
  presets: () => request('/api/describe/presets'),
  startProcessing: (url, options) => request('/api/process', { method: 'POST', body: { url, ...options } }),
  jobStatus: (jobId) => request(`/api/process/${jobId}`),
  /**
   * Ask about the frame on screen. `outputLang` is the language the answer
   * should be written and spoken in — the interface language, not the video's.
   */
  askFrame: ({ videoId, time, question, presetId, outputLang, signal }) =>
    request('/api/describe/frame', {
      method: 'POST',
      body: { videoId, time, question, presetId, outputLang },
      signal,
    }),

  /**
   * Videos already processed on this server. These open with no yt-dlp call,
   * so they work even when YouTube is bot-checking the server's IP.
   */
  readyVideos: () => request('/api/videos/ready'),

  /** Text search of YouTube (yt-dlp). */
  search: (query) => request(`/api/search?q=${encodeURIComponent(query)}`),

  /** Whether spoken search is configured on the server. */
  voiceSearchStatus: () => request('/api/voice-search/status'),

  /** Send a recorded audio clip; the server transcribes it and searches. */
  voiceSearch: async (blob, { language } = {}) => {
    const qs = language ? `?language=${encodeURIComponent(language)}` : '';
    const response = await fetch(apiUrl(`/api/voice-search${qs}`), {
      method: 'POST',
      headers: { 'Content-Type': blob.type || 'audio/webm' },
      body: blob,
    });
    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }
    if (!response.ok) {
      const error = new Error(payload?.error?.message || `Request failed with status ${response.status}`);
      error.code = payload?.error?.code;
      error.status = response.status;
      throw error;
    }
    return payload;
  },
};

export default api;
