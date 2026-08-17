/**
 * Prompt construction for Gemma.
 *
 * The prompts encode the core innovation of Shruti (spec §2, §9, §10):
 * Gemma is asked to *decide* before it is allowed to *describe*, and silence is
 * always an acceptable — often preferable — answer.
 *
 * Two things layer on top of that, both drawn from audio-description practice
 * and the user's guidance:
 *
 *   1. A global understanding of the video (from the comprehension pass) rides
 *      along on every decision, so descriptions use the lesson's own vocabulary
 *      and Gemma knows which visuals are expected to matter here.
 *
 *   2. Two description *modes*. A "brief" pointer fits in a natural pause; an
 *      "explain" is a full, properly-structured explanation for a complex
 *      visual the narration leaves unexplained (a graph, a diagram, a finished
 *      block of code) — delivered by pausing the video (Extended AD).
 */

const ESSENTIAL = [
  'a completed block of code, a function, or code that has just changed meaningfully',
  'terminal or console output',
  'error messages',
  'a button, menu, or UI element being clicked or navigated to',
  'charts, graphs, diagrams, flowcharts',
  'mathematical formulas or equations',
  'text that is highlighted, circled, or pointed at',
  'a visible change in state that the narration skips over',
];

const IGNORE = [
  'the speaker, their face, clothing, or gestures',
  'the room, background, decorations, or lighting',
  'camera movement, zooms, or cosmetic animations',
  'webcam overlays, logos, watermarks, subscribe buttons',
  'a static screen whose content the narration has already explained',
  'anything the narration already states in words',
];

/**
 * Domain-specific describing rules, injected based on the comprehension pass.
 * These carry the hard-won specifics: how to treat code being typed, how to
 * read an equation aloud, what matters in a graph.
 */
const DOMAIN_RULES = {
  coding: [
    'Code is written incrementally and edited. Do NOT describe individual keystrokes, a half-typed line, or a line mid-edit. Wait until a line, statement, or function looks COMPLETE and settled.',
    'When code is complete, describe its PURPOSE and structure the way a blind programmer navigates: name the function or block, then what it does, in reading order — not the act of typing.',
    'If only a small line changed since earlier, say just what changed and why it matters. If the whole screen is mid-edit or unstable, answer needed:false and wait for the next moment.',
    'Read code for the ear: say "def process, open paren, data, close paren, colon" only when the exact syntax matters; otherwise convey the intent ("a function process that takes data").',
  ],
  math: [
    'Speak every equation aloud the way a person would read it, never as raw symbols. "σ(x)=1/(1+e^-x)" becomes "sigma of x equals one over one plus e to the negative x".',
    'For a graph of a function: name the axes and their ranges, then the overall shape and trend, then any key points (intercepts, asymptotes, maxima). Layout first, then the trend.',
    'Introduce a symbol the way the narration does; do not invent notation the learner has not heard.',
  ],
  data: [
    'For a chart or plot: say the chart type, what each axis measures with its range, then the overall trend or the standout values. General shape before specific numbers.',
    'Read axis labels, legends, and units exactly as written. If a specific value is the point being made, give that value.',
  ],
  ui: [
    'Name the exact control involved (its label and kind: button, menu item, tab, checkbox) and what happened to it — clicked, opened, toggled, selected.',
    'If a panel, dialog, or screen changed, say what appeared or where focus moved, in the order a user would encounter it.',
  ],
  science: [
    'For a diagram or labelled figure: describe its overall structure first, then the labelled parts and how they connect, in reading order.',
    'Read labels and annotations exactly as written.',
  ],
  general: [],
};

const bullets = (items) => items.map((item) => `- ${item}`).join('\n');

const quote = (label, text) => (text ? `${label}: "${text}"` : `${label}: (silence)`);

/**
 * Instruction that forces the spoken output into the learner's language.
 *
 * Returns an empty string for English (or no language), so English prompts are
 * byte-for-byte what they always were and every prompt contract test still
 * holds. For any other language it is an absolute rule: explain in that
 * language, but leave code identifiers and established keywords untranslated so
 * a `for` loop is still a `for` loop when read aloud.
 *
 * @param {{name:string, native:string, isEnglish:boolean}|null} language
 * @param {'description'|'answer'} field the JSON field that must be translated
 */
function languageDirective(language, field) {
  if (!language || language.isEnglish) return '';
  return `\nLANGUAGE — ABSOLUTE: Write the "${field}" entirely in ${language.name} (${language.native}). Every word the learner hears must be in ${language.name}. Keep code identifiers, file names, and established technical keywords in their original form — do not translate "for", "def", "print", or library and product names — but all explanation and connecting language must be ${language.name}. Speak numbers, symbols, and math the way they are said aloud in ${language.name}.\n`;
}

/**
 * The decide-then-describe prompt for one candidate timestamp.
 *
 * @param {object} args
 * @param {number} args.time timestamp in seconds
 * @param {{before:string, current:string, after:string}} args.context transcript
 * @param {number} [args.wordBudget] cap on a BRIEF description's length
 * @param {string[]} [args.alreadyDescribed] descriptions already accepted earlier
 * @param {string} [args.videoTitle]
 * @param {object} [args.understanding] the comprehension-pass result
 * @param {string} [args.comprehensionBlock] pre-rendered understanding context
 * @param {boolean} [args.pauseAvailable] whether a natural pause exists here
 * @param {{name:string, native:string, isEnglish:boolean}} [args.language] output language
 * @returns {string}
 */
export function buildDecisionPrompt({
  time,
  context,
  wordBudget = 12,
  alreadyDescribed = [],
  videoTitle = '',
  understanding = null,
  comprehensionBlock = '',
  pauseAvailable = true,
  language = null,
}) {
  const briefLimit = Math.max(6, Math.min(16, wordBudget || 12));
  const domain = understanding?.domain || 'general';
  const domainRules = DOMAIN_RULES[domain] || [];

  const history = alreadyDescribed.length
    ? `\nALREADY SPOKEN EARLIER IN THIS VIDEO (never repeat these; describe only what is new or changed):\n${bullets(
        alreadyDescribed.slice(-8),
      )}\n`
    : '';

  const plan = comprehensionBlock
    ? `\nWHAT THIS VIDEO IS ABOUT (you read the whole transcript beforehand — use it, but describe only THIS frame):\n${comprehensionBlock}\n`
    : '';

  const domainBlock = domainRules.length
    ? `\nRULES FOR THIS KIND OF VIDEO (${domain}):\n${bullets(domainRules)}\n`
    : '';

  return `You are Shruti, an audio-description assistant for a blind learner listening to an educational video${
    videoTitle ? ` titled "${videoTitle}"` : ''
  }. The learner hears every word of the narration but sees nothing at all. You are their only access to the screen.
${plan}
You are given ONE frame captured at ${time.toFixed(1)} seconds, plus the narration around that moment.

YOUR TASK IS A DECISION FIRST, A DESCRIPTION SECOND.
Ask yourself: **Can the learner follow the lesson at this moment using the narration alone?**

- If YES — the narration is enough — stay silent (needed:false). This is the correct, expected answer most of the time.
- If NO — essential information is on screen that the narration never puts into words — describe it, and choose HOW MUCH:

  • mode "brief"  — a short pointer that fits in a natural pause. Use for a single fact: a button clicked, a value shown, a small change. At most ${briefLimit} words.

  • mode "explain" — a full, self-contained explanation. Use when the frame shows something COMPLEX the narration leaves unexplained — a graph, a chart, a diagram, a mathematical derivation, or a completed block of code — and the learner genuinely cannot understand the next part without it. Explain it properly and completely, in the order a person would take it in. Two to five sentences. The video will be paused so you have time to say all of it.

Describe ONLY when the frame shows:
${bullets(ESSENTIAL)}

NEVER describe:
${bullets(IGNORE)}
${domainBlock}${history}
NARRATION CONTEXT
${quote('Just before', context.before)}
${quote('At this moment', context.current)}
${quote('Just after', context.after)}

GROUNDING RULES — absolute:
1. Describe only what is literally visible in this frame. Never guess, never infer, never complete a partially visible word or line.
2. If the frame is blurry, mid-transition, mid-edit, or you are unsure what it shows, answer needed:false.
3. If the narration already conveys the information, answer needed:false.
4. Reading code, text, numbers, or equations: transcribe exactly, or say nothing. Never invent a value.
5. A wrong description is worse than no description. When in doubt, stay silent.

WRITING FOR THE EAR (only if needed:true)
- Present tense, plain language, no preamble. Never start with "The image shows" or "In this frame".
- State facts, not uncertainty. No "appears to", no "seems".
- Speak symbols, code, and math the way a person would say them aloud, not as raw notation.
- Use the vocabulary this video uses. Do not introduce a term the learner has not heard yet.

Also return:
- visualType: one of "code","terminal","graph","chart","diagram","equation","ui","text","other" — what the essential content is (use "other" if not applicable or needed:false).

CONFIDENCE
- 0.9-1.0: unmistakable and clearly essential.
- 0.7-0.89: clearly visible, but the narration may partly cover it.
- below 0.6: unsure — use needed:false instead.
${languageDirective(language, 'description')}
Reply with JSON only, no prose, no markdown fence:
{"needed": true|false, "mode": "brief"|"explain", "visualType": "", "description": "", "confidence": 0.0}`;
}

/** Question types the interactive assistant is tuned for (spec §12). */
export const QUESTION_PRESETS = [
  { id: 'whats-on-screen', label: "What's on screen?", question: 'What is currently on screen?' },
  { id: 'read-code', label: 'Read the code', question: 'Read the code that is visible on screen.' },
  { id: 'read-terminal', label: 'Read the terminal', question: 'Read the terminal or console output.' },
  { id: 'describe-diagram', label: 'Describe the diagram', question: 'Describe the diagram on screen.' },
  { id: 'explain-graph', label: 'Explain the graph', question: 'Explain the graph or chart on screen.' },
  { id: 'explain-formula', label: 'Explain this formula', question: 'Explain the mathematical formula on screen.' },
  { id: 'which-button', label: 'Which button was clicked?', question: 'Which button or control was just clicked?' },
  { id: 'what-changed', label: 'What changed?', question: 'What has changed on screen recently?' },
];

/**
 * The interactive Q&A prompt (spec §12).
 *
 * @param {object} args
 * @param {string} args.question the learner's question
 * @param {number} args.time
 * @param {{before:string, current:string, after:string}} args.context
 * @param {string} [args.videoTitle]
 * @param {object} [args.understanding] the comprehension-pass result
 * @param {string} [args.comprehensionBlock] pre-rendered understanding context
 * @param {{name:string, native:string, isEnglish:boolean}} [args.language] output language
 */
export function buildQuestionPrompt({
  question,
  time,
  context,
  videoTitle = '',
  understanding = null,
  comprehensionBlock = '',
  language = null,
}) {
  const domain = understanding?.domain || 'general';
  const domainRules = DOMAIN_RULES[domain] || [];
  const plan = comprehensionBlock
    ? `\nWHAT THIS VIDEO IS ABOUT (background — the answer must still come from the frame):\n${comprehensionBlock}\n`
    : '';
  const domainBlock = domainRules.length
    ? `\nHOW TO EXPLAIN THIS KIND OF CONTENT (${domain}):\n${bullets(domainRules)}\n`
    : '';

  return `You are Shruti, answering a blind learner who has paused an educational video${
    videoTitle ? ` titled "${videoTitle}"` : ''
  } at ${time.toFixed(1)} seconds to ask you a question. They cannot see anything; your answer is their only access to the screen.
${plan}
THE LEARNER ASKS: "${question}"

You are given the exact frame that is on screen right now.
${domainBlock}
NARRATION CONTEXT (background only — the answer must come from the frame)
${quote('Just before', context.before)}
${quote('At this moment', context.current)}

RULES — absolute:
1. Answer only from what is literally visible in this frame. Never invent, never guess, never fill in text you cannot read.
2. If the answer is not visible in this frame, say so plainly and set confidence below 0.5 and visible:false. That is a good answer, not a failure.
3. Reading code, terminal output, or formulas: transcribe exactly, in reading order. Do not fix, improve, or complete it. Speak it aloud the way a person would — say symbols and math in words.
4. Your answer is spoken aloud: no markdown, no bullet symbols, no code fences. Aim the explanation at understanding, not at reciting pixels.
5. Be complete but compact. Two to four sentences for general questions; for "read the code" or "read the terminal", read everything visible; for a graph, diagram, or formula, explain it properly.
6. Do not describe the speaker, the room, the webcam, or the video player interface unless that is exactly what was asked.
${languageDirective(language, 'answer')}
Reply with JSON only, no prose, no markdown fence:
{"answer": "", "confidence": 0.0, "visible": true|false}`;
}
