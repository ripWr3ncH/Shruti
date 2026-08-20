# Changelog

All notable changes to Shruti are recorded here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Video playback speed, separate from the speech rate: `-` and `=`, or the select in the player.
  A learner who wants the instructor at 1.5x usually still wants descriptions read unhurried.
  Remembered across videos and sessions.
- Resume where you left off. The position in each video is kept locally and offered back on the
  next visit, announced with the position and the key that undoes it. `Home` clears it.
- Download the prepared descriptions as plain text or as a WebVTT description track, generated in
  the browser from the timeline already on screen.
- A filter over the description list, so finding a moment in a long lecture no longer means
  reading the whole list. The match count is announced.

### Changed

- New visual design: a lilac ground with white cards, violet actions, a teal "live" accent,
  Poppins with a handwritten Caveat accent line, and hand-drawn background squiggles. Card
  entrances, button lift, a drifting progress stripe, and a floating mark — all switched off by
  `prefers-reduced-motion`. High-contrast mode is unchanged and additionally drops the script face.

### Planned

- Pluggable vision backend, with local Gemma via Ollama as the default engine.
- Speech synthesised on the server, removing the browser-voice dependency.
- Videos without captions, transcribed locally.
- Sources beyond YouTube: file upload, direct video URLs, lecture recordings.
- Persistence and shareable described videos.

## [1.0.0] — 2026-08-17

First release.

### Added

- English and Bangla interface, switchable from the header or the settings panel, English by
  default. The switch covers descriptions and answers as well as the interface: reading the app in
  Bangla means Gemma writes and speaks in Bangla. Timelines are cached per language.

- Decide-before-describe pipeline: every candidate moment is a yes/no judgement before it is a
  sentence, gated on confidence, with silence as a valid and common answer.
- Whole-transcript comprehension pass that conditions each per-frame decision on the video's
  domain, key concepts, expected visuals, and a pronunciation glossary.
- Narration gap detection, with Extended Audio Description — pausing the video — where no natural
  pause exists.
- Interactive assistant answering questions about the exact frame on screen.
- Voice and text search for finding a video.
- Full keyboard control, screen-reader announcements, and a high-contrast mode.
