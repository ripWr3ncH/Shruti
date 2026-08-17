# Shruti — Design Specification

**Tagline:** *Hear what's on screen.*

## One-line summary

Shruti enables blind and low-vision learners to independently understand visual YouTube tutorials. It watches video frames, reads the transcript, determines **whether visual information is necessary**, and inserts short spoken descriptions only during natural pauses in narration. Users can also ask questions like *"Read the code"* or *"What's on screen?"* and receive frame-grounded answers.

> This document describes the design the implementation follows. It reflects the original single-model build; where it says Gemma is the only permitted model, read that as the current default rather than a permanent constraint — see [`ARCHITECTURE.md`](../ARCHITECTURE.md).

---

# 1. Vision

Most educational YouTube videos are designed for people who can see the screen.

A blind learner can hear the instructor speaking, but frequently misses the most important information because it is communicated visually rather than verbally.

Examples include:

- Code being typed
- Buttons being clicked
- Terminal output changing
- Diagrams
- Graphs
- Mathematical equations
- UI navigation
- Highlighted text
- Mouse movements
- Flowcharts

The instructor often says things like

> "As you can see..."

or

> "Now click here..."

without actually describing what happened.

Traditional screen readers cannot interpret video pixels, and creators rarely provide audio descriptions.

Shruti bridges this gap.

---

# 2. Innovation

Existing accessibility tools generally follow one of two approaches:

- Read subtitles.
- Describe every visual event.

Neither provides a good learning experience.

Reading subtitles ignores visual information.

Describing every frame quickly becomes distracting and constantly interrupts the instructor.

## Shruti introduces Context-Aware Audio Description.

Instead of asking

> "What is on screen?"

Gemma first asks

> **"Does the user actually need to know what is on screen to understand the lesson?"**

Only if the answer is **yes** does Shruti generate a description.

This "decide first, describe second" workflow is the core innovation of the project.

The result is a smooth listening experience where the AI only speaks when visual information is genuinely required.

---

# 3. Goals

## Primary Goal

Allow blind and low-vision users to independently follow visual YouTube tutorials without missing important visual information.

The application should feel like an intelligent companion rather than a narrator.

It should only intervene when necessary.

---

## In Scope

Build these features.

### 1. YouTube Processing

The user pastes a YouTube URL.

Shruti downloads the video, extracts the transcript, analyzes the visual content, and prepares an audio-description timeline before playback begins.

---

### 2. Smart Audio Description

Gemma analyzes video frames together with nearby transcript context.

For each potential description point it decides

- Is there essential visual information?

If yes

Generate a concise description (roughly 12 words or fewer).

If not

Return nothing.

Descriptions are played only during natural pauses in narration.

If no suitable pause exists, briefly pause the video, speak the description, then resume playback.

---

### 3. Interactive Assistant

At any point the learner can ask

- What's on screen?
- Read the code.
- Describe the diagram.
- What changed?
- Explain the graph.

Shruti pauses playback, extracts the current frame, asks Gemma, speaks the answer, and resumes automatically.

---

### 4. Accessible Interface

The application itself must be fully usable by blind users.

Requirements

- Complete keyboard navigation
- Screen-reader compatibility
- Proper ARIA labels
- Audio-first workflow
- Adjustable speech speed
- High-contrast mode

---

### 5. Gemma Compliance

Gemma 4 is the **only** generative model.

The project should expose a `/api/config` endpoint proving the running model.

Startup validation must refuse non-Gemma models.

---

## Out of Scope

Do not build

- Live stream support
- Multiple video platforms
- Multiple languages (English first)
- Any additional LLM
- Video editing features

---

# 4. Core Design Philosophy

Shruti follows one principle.

> **Silence is better than a wrong description.**

A blind learner depends entirely on the AI.

A hallucinated description can be worse than saying nothing.

Therefore every description must satisfy three conditions.

1. It is grounded in the current video frame.

2. It contains information not already explained by narration.

3. It genuinely helps understanding.

Otherwise Shruti should remain silent.

---

# 5. Processing Pipeline

This is the complete lifecycle for every video.

```

User pastes YouTube URL

↓

Download video

↓

Extract transcript

↓

Detect narration timestamps

↓

Detect natural pauses

↓

Sample frames around each pause

↓

Send

• frame(s)

• nearby transcript

↓

Gemma 4

↓

Decision

Does the learner need visual information here?

YES

↓

Generate

{
timestamp,
description,
confidence
}

NO

↓

Return empty

↓

Cache results

↓

During playback

↓

Scheduler speaks descriptions
only at approved timestamps

↓

User may interrupt anytime

↓

"Read the code"

↓

Current frame

↓

Gemma

↓

Answer

↓

Resume playback

```

This pipeline should be implemented exactly as described.

---

# 6. Defining "Essential Visual Information"

Gemma should **NOT** describe everything.

Instead it should describe information that affects understanding.

Examples

✅ Code changes

✅ Mouse clicks

✅ Buttons pressed

✅ Terminal output

✅ Charts

✅ Graphs

✅ Flowcharts

✅ Mathematical formulas

✅ Highlighted text

✅ UI navigation

✅ Error messages

✅ Diagram changes

Do NOT describe

❌ Speaker appearance

❌ Room

❌ Decorations

❌ Camera movement

❌ Background objects

❌ Static screens already explained

❌ Cosmetic animations

The guiding question should always be

> **Can the learner understand the next part without seeing the screen?**

If yes

Return nothing.

If no

Generate one concise description.

# 7. System Architecture

The system consists of four major components.

1. Frontend
2. Backend
3. Gemma 4
4. Processing Services

```
Blind User
      │
      ▼
React Frontend
──────────────────────────────────
• Accessible YouTube Player
• Audio Description Scheduler
• Interactive Q&A
• Screen Reader Support
• Keyboard Navigation
• Web Speech API
──────────────────────────────────
      │ REST API
      ▼
Node / Express Backend
──────────────────────────────────
• Video Processing
• Transcript Extraction
• Gap Detection
• Frame Extraction
• Description Generation
• Timeline Cache
──────────────────────────────────
      │
      ▼
Gemma 4 Vision
──────────────────────────────────
• Description Decision
• Description Generation
• Interactive Q&A
──────────────────────────────────
```

---

# 8. Playback Model

The playback experience should feel completely natural.

The user should never feel like an AI is constantly interrupting the instructor.

Every generated description belongs to one timestamp.

```
{
    timestamp,
    description,
    confidence
}
```

The frontend continuously checks the video's current playback time.

Approximately every **100 milliseconds**, it checks whether a description should be spoken.

When a scheduled description is reached:

### Case 1 — Natural Pause Exists

If enough silence exists before narration resumes,

→ speak normally.

Example

```
Instructor:
"So now let's run the program."

(2 second silence)

Shruti:
"He clicks the green Run button."

Instructor continues...
```

---

### Case 2 — No Pause Exists

If narration never stops,

pause the video automatically.

Speak the description.

Resume playback immediately afterward.

This follows the standard technique of **Extended Audio Description (Extended AD)** used in accessible media.

The instructor's narration should **never** overlap with Shruti.

---

# 9. AI Decision Process

Gemma should never immediately generate a description.

Instead it follows a reasoning pipeline.

```
Step 1

Understand transcript.

↓

Step 2

Understand current frame.

↓

Step 3

Compare both.

↓

Step 4

Ask

"Is important information shown
that narration does not explain?"

↓

NO

↓

Return

{
needed:false
}

↓

YES

↓

Return

{
needed:true,
description:"Instructor highlights the loop.",
confidence:0.91
}
```

This separation between **deciding** and **describing** is the most important intelligence in Shruti.

---

# 10. Gemma Prompting Strategy

Gemma should receive

• Current frame

• Nearby transcript

• Previous transcript

• Following transcript (optional)

• Timestamp

Its job is **not** to summarize the scene.

Its job is to determine whether visual information is missing.

Prompt philosophy

> Only describe information that the listener cannot infer from narration.

If narration already says

> "Click the green Run button."

Gemma should return

```
needed:false
```

because the narration already explained it.

If narration says

> "Now let's execute it."

while the video shows the Run button being clicked,

Gemma should return

```
needed:true
description:
"The green Run button is clicked."
```

---

# 11. Confidence Rules

Every generated description should include confidence.

```
{
needed,
description,
confidence
}
```

Recommended behavior

Confidence ≥ 0.85

Speak normally.

---

0.60–0.85

Speak only if the visual information is critical.

---

Below 0.60

Discard.

Wrong descriptions are worse than silence.

---

# 12. Interactive Q&A

Shruti also functions as an AI assistant.

At any point the learner can interrupt playback.

Example interaction

```
User

"Read the code."

↓

Pause video.

↓

Extract current frame.

↓

Gemma analyzes frame.

↓

Gemma

"The code creates a for loop
that prints numbers one through ten."

↓

Speak answer.

↓

Resume playback.
```

Other supported questions

• What's on screen?

• What changed?

• Explain the diagram.

• Read the terminal.

• Describe the graph.

• Which button was clicked?

• Explain this formula.

Future versions may support free-form conversation.

---

# 13. Technical Constraints

## Frame Extraction

The browser cannot capture frames directly from the YouTube player because of browser security (CORS restrictions).

Therefore frame extraction **must happen on the backend.**

Workflow

```
YouTube Video

↓

yt-dlp

↓

Temporary Video

↓

ffmpeg

↓

JPEG Frame

↓

Gemma
```

Downloaded videos should be cached to avoid repeated downloads.

Frames should be resized before sending to Gemma to reduce processing cost.

Recommended

• JPEG

• 512–768 pixels

• Moderate quality

---

## Timeline Cache

Description generation is expensive.

Each processed video should generate a cached timeline.

Example

```
[
{
"time":13.5,
"description":"A flowchart appears.",
"confidence":0.94
},
{
"time":37.2,
"description":"The Run button is clicked.",
"confidence":0.91
}
]
```

If the same user watches again,

reuse the cached timeline instead of regenerating it.

---

# 14. Non-Negotiable Rules

These rules must never be violated.

1.

Gemma 4 is the only LLM.

No GPT.

No Claude.

No Gemini.

No additional generative model.

---

2.

Never hallucinate.

If uncertain,

return nothing.

---

3.

Never interrupt narration.

Use natural pauses.

Otherwise pause the video.

---

4.

Accessibility is the highest priority.

Everything must work using only

• Keyboard

• Screen reader

• Audio

No mouse should be required.

---

5.

Every AI response must be grounded in

• current frame

• transcript context

Never invent visual information.

---
# 15. Development Roadmap

Build the project in small, testable phases.

Each phase should be completed and verified before moving to the next.

---

## Phase 0 — Viability Check

Before building anything, verify the project's core assumptions.

Tasks

- Verify Gemma 4 Vision works with the provided API key.
- Send one image with a simple prompt.
- Confirm image understanding succeeds.
- Verify `yt-dlp` is installed.
- Verify `ffmpeg` is installed.
- Verify the backend can download a public YouTube video.

Do **not** continue until every requirement passes.

---

## Phase 1 — Backend Foundation

Create the Express backend.

Implement

- Project structure
- Environment configuration
- Logging
- Error handling
- Health endpoint
- `/api/config`
- Cache layer

Then implement

```
GET /api/video/info

GET /api/captions
```

Verify transcript extraction works.

---

## Phase 2 — Video Processing

Implement

Video Download

↓

Transcript Extraction

↓

Speech Timestamp Detection

↓

Gap Detection

↓

Frame Extraction

↓

Frame Cache

Each downloaded video should only be processed once.

All future requests should reuse cached data.

---

## Phase 3 — Description Generation

Create

```
POST /api/describe/batch
```

Workflow

For every candidate timestamp

↓

Extract nearby frame(s)

↓

Provide

• Frame

• Nearby transcript

↓

Gemma

↓

Return

```
{
needed,
description,
confidence
}
```

Store only descriptions where

```
needed == true
```

and

```
confidence >= threshold
```

Cache the generated timeline.

---

## Phase 4 — Accessible Player

Build the React interface.

Required features

- Paste YouTube URL
- Processing indicator
- Accessible player
- Keyboard shortcuts
- Screen-reader announcements
- Playback scheduler
- Automatic TTS

Verify descriptions occur at the correct timestamps.

---

## Phase 5 — Interactive AI

Implement

```
POST /api/describe/frame
```

Workflow

Pause

↓

Extract frame

↓

Gemma

↓

Answer

↓

Speak answer

↓

Resume playback

Supported questions

- Read the code
- What's on screen?
- Explain the graph
- Describe the diagram
- What changed?

---

## Phase 6 — Accessibility

Verify

- NVDA
- VoiceOver
- Keyboard-only navigation

Check

- Focus order
- ARIA labels
- Live regions
- Contrast
- Speech controls

Accessibility is part of the MVP,
not an optional enhancement.

---

## Phase 7 — Testing

Every major component should have automated tests.

---

# 16. Testing Strategy

## Unit Tests

Test

- Gap detection
- Timeline generation
- Scheduler ordering
- Cache logic
- Confidence filtering
- JSON parsing
- Configuration loading

---

## Integration Tests

Verify

```
YouTube URL

↓

Transcript

↓

Frame Extraction

↓

Gemma

↓

Description Timeline
```

works correctly.

Test

```
POST /api/describe/batch
```

and

```
POST /api/describe/frame
```

---

## Manual Tests

Play

- Coding tutorial
- UI tutorial
- Mathematics lecture
- Science lecture

Verify

- Descriptions are accurate.
- Descriptions occur only when necessary.
- Narration is never interrupted.
- Q&A answers match the current frame.

---

## Accessibility Tests

Use

- Screen reader
- Keyboard only

Attempt to complete every workflow without looking at the screen.

If anything requires vision,

it is considered a bug.

---

# 17. Demo Flow

The demo should immediately communicate the problem and solution.

---

### Scene 1 — Problem (20 seconds)

Open a coding tutorial.

Mute the monitor.

Play only the audio.

Show that the instructor says

> "Now click here."

without explaining anything.

Explain that blind learners experience this throughout educational videos.

---

### Scene 2 — Shruti (40 seconds)

Paste the same URL into Shruti.

Show

```
Processing Video...
```

After processing,

play the tutorial again.

Now Shruti says

> "The Run button is clicked."

> "A for loop is added."

> "The output displays numbers one through ten."

without interrupting the instructor.

---

### Scene 3 — Interactive AI

Pause.

Ask

> Read the code.

Gemma answers.

Resume playback.

Repeat with

> Describe the diagram.

---

### Scene 4 — Accessibility

Navigate the entire application using

- Keyboard
- Screen reader

No mouse.

---

### Scene 5 — Gemma Proof

Open

```
/api/config
```

Show

```
Gemma 4
```

Explain

Gemma is the only LLM used throughout the project.

---

# 18. Future Improvements

Possible future work

- Live stream support
- Browser extension
- Mobile application
- Offline processing
- Multiple languages
- Creator API
- Community-contributed descriptions
- Learning analytics
- Personalized description level

---

# 19. Risks

| Risk | Mitigation |
|------|------------|
| Gemma Vision unavailable | Verify in Phase 0 before development |
| Hallucinated descriptions | Confidence threshold + grounding prompt |
| Long processing time | Cache downloaded videos and timelines |
| High API usage | Downsample frames and process only candidate timestamps |
| Narration interruption | Speak only in gaps or use auto-pause |
| Accessibility issues | Continuous testing with screen readers |

---

# 20. Definition of Done

The project is complete when all of the following are true.

- User pastes a YouTube URL.
- Video is processed successfully.
- Transcript is extracted.
- Description timeline is generated.
- Descriptions play only when needed.
- Narration is never interrupted.
- Interactive questions work.
- Answers are grounded in the current frame.
- The application is fully keyboard accessible.
- Screen readers work correctly.
- Gemma 4 is the only LLM.
- `/api/config` proves the running model.
- Automated tests pass.

---

# 21. Build Instructions for Claude Code

You are building **Shruti**.

Follow this document exactly.

### General Rules

- Build incrementally.
- Complete one phase before moving to the next.
- Test every phase.
- Do not skip accessibility.
- Prefer reusable, modular code.
- Keep functions small and well documented.

### AI Rules

- Gemma 4 is the only LLM.
- Every AI response must be grounded in the provided frame.
- Never hallucinate.
- Return empty instead of guessing.
- Use structured JSON outputs whenever possible.

### Performance Rules

- Cache downloaded videos.
- Cache extracted frames.
- Cache generated description timelines.
- Minimize Gemma calls.
- Process only candidate timestamps.

### Accessibility Rules

The application must be usable by a blind user without assistance.

This means

- Complete keyboard support.
- Proper ARIA labels.
- Screen-reader announcements.
- Audio-first interaction.
- No visual-only controls.

### Final Goal

Build an accessibility companion that allows blind learners to independently understand visual educational videos.

The AI should behave like an intelligent teaching assistant—not a narrator—intervening only when visual information is essential for understanding.

Throughout the implementation, prioritize **accuracy over quantity**, **clarity over complexity**, and **accessibility above everything else**.