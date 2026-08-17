# Shruti — architecture notes

Audio descriptions for video, spoken only when the screen shows something the narration leaves out.
Built for blind and low-vision learners.

npm workspaces: `server` (Express, ESM, Node >=20) and `client` (React 18 + Vite).
`npm run dev` runs both. `npm test` runs the server suite. `npm run doctor` checks binaries and keys.

## Invariants

These are load-bearing. Breaking one is a bug even when tests pass.

**Narration and Shruti are never audible at once.** Enforced in three cooperating places:
`holdingPlaybackRef` in [client/src/App.jsx](client/src/App.jsx), the force-play detector in the same
file's `handlePlayerState`, and the overlap timer in
[useDescriptionScheduler.js](client/src/hooks/useDescriptionScheduler.js). The hold flag is always
cleared *before* our own resume, so a normal end-of-description is not mistaken for the learner
forcing playback. If you touch playback control, re-check all three.

**Silence beats a wrong description.** A failed Gemma call, unparseable JSON, a truncated response,
or low confidence all degrade to "no description" — never to a guess. `normaliseDecision()` in
[timeline.js](server/src/services/timeline.js) coerces anything malformed to `needed: false`. Do not
add a fallback that invents content.

**Speech must always resolve.** `speak()` in [useSpeech.js](client/src/hooks/useSpeech.js) resolves
on end, error, cancel, or a watchdog timeout. A stranded promise leaves the video paused forever,
which for a blind learner is an unrecoverable state.

**Cache keys cover every input that changes the output.** `timelineKey()` hashes the model, prompt
version, output language, and pipeline settings. **Bump `PROMPT_VERSION` in
[timeline.js](server/src/services/timeline.js) whenever a prompt changes**, or stale timelines are
served for new prompts. `COMPREHENSION_VERSION` in
[comprehension.js](server/src/services/comprehension.js) works the same way.

**Accessibility is not a later pass.** Everything works by keyboard alone. State changes announce
through the live regions in [useAnnouncer.js](client/src/hooks/useAnnouncer.js). Nothing conveys
meaning by colour alone. Focus is always visible. Hit targets are at least 44px.

## Pipeline

`metadata → transcript → comprehension → gap detection → download → per-moment frame + vision call
→ confidence gate → duplicate suppression → cached timeline JSON`

The comprehension pass ([comprehension.js](server/src/services/comprehension.js)) reads the whole
transcript once and conditions every per-frame decision with the video's domain, key concepts,
expected visuals, and a pronunciation glossary. Per-frame prompts are built in
[prompts/describe.js](server/src/prompts/describe.js) — that file encodes the decide-before-describe
design and is where description quality actually lives.

Candidates come from [gaps.js](server/src/services/gaps.js): natural pauses in narration, plus
forced candidates on long unbroken stretches which pause the video to speak (Extended Audio
Description). Pure functions, no I/O — keep them that way so they stay testable.

## Models

Gemma is the default because it is open-weight: the same model runs locally through Ollama or hosted
through Google AI Studio. Cheap text work — the comprehension pass, brief/explain compression,
translation — should stay on a local model even when the vision tier is hosted.

Supporting technologies are not generative models and are fine to use freely: yt-dlp (search and
download), ffmpeg (frames), Whisper (speech-to-text).

Note: `assertGemmaOnly()` in [server/src/config.js](server/src/config.js) currently hard-locks every
request path to Gemma. It is scheduled to be replaced by a provider registry that keeps the
auditability — every description records which model produced it — without the restriction.

## Language

The interface ships in English and Bangla. `client/src/i18n/en.js` is the source of truth;
`bn.js` mirrors its keys exactly and `client/tests/i18n.test.js` fails if it drifts — missing keys,
mismatched `{placeholders}`, or a string left identical to the English. **Add a key to `en.js` and
`bn.js` in the same commit**, because a missing translation falls back to English silently and is
invisible in the browser.

No user-facing string belongs in a component. `t('some.key')` everywhere, including `aria-label`s
and every live-region announcement — most of this text is *heard*, so an untranslated one is a
learner hearing the wrong language mid-sentence.

The interface language is also the **generation** language: it is sent as `outputLang` on
`/api/process` and `/api/describe/frame`, so descriptions and answers come back in it. Timelines are
cached per language, so the two do not collide. Which language a given utterance is *spoken* in
depends on where the text came from: descriptions use the timeline's language (it keeps whatever it
was generated in), answers use the language the server reports on the answer, and status
announcements use the interface language. Pass `{ lang }` to `speech.speak()` rather than relying on
the hook's default when the text is not a description.

## Conventions

- ESM everywhere, `.js` extensions in imports.
- JSDoc on exported functions. Comments explain *why*, not *what* — match the existing density.
- Server tests use `node --test`. Add tests for pure functions; the pipeline services are the
  reason the gap and timeline logic is I/O-free.
- The client currently has no tests. The scheduler and the never-overlap behaviour are the first
  things that should get them.
