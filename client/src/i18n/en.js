/**
 * English strings.
 *
 * This file is the source of truth for the interface: `bn.js` mirrors these
 * keys exactly, and any key missing there falls back to the English here, so a
 * partial translation degrades to readable rather than blank.
 *
 * `{name}` placeholders are filled by `t(key, { name })`.
 *
 * Much of this text is *spoken* — by a screen reader, or by Shruti itself.
 * Write it to be heard: no abbreviations a voice would mangle, no symbols
 * standing in for words, and full sentences where a fragment would be
 * ambiguous out of context.
 */
export default {
  // --- shell ---------------------------------------------------------------
  'app.tagline': "Hear what's on screen.",
  'app.skipToMain': 'Skip to main content',
  'app.home': 'Home',
  'app.findVideo': 'Find a video',
  'app.settingsLabel': 'Speech and display settings',
  'app.chooseDifferent': 'Choose a different video',
  'app.modelConfig': 'Model config',
  'app.keyboardShortcuts': 'Keyboard shortcuts',
  'app.footerModel': 'Every description and answer comes from {model}.',
  'app.languageLabel': 'Interface language',
  'app.languageEnglish': 'English',
  'app.languageBangla': 'Bangla',

  // --- choosing a video ----------------------------------------------------
  'url.heading': 'Choose a video',
  'url.label': 'YouTube video link',
  'url.help':
    'Shruti will download the video, read its captions, and prepare audio descriptions for the moments where the screen shows something the narration does not explain. Processing a ten minute tutorial usually takes a few minutes.',
  'url.submit': 'Process video',
  'url.submitBusy': 'Processing…',

  'examples.heading': 'Ready to play',
  'examples.helpOne':
    'One video has already been described on this server. It starts straight away, with no processing wait.',
  'examples.helpMany':
    '{count} videos have already been described on this server. They start straight away, with no processing wait.',
  'examples.itemLabel': '{title}{channel}{duration}{descriptions}. Ready to play now.',
  'examples.byChannel': ', by {channel}',
  'examples.descriptionCount': ', {count} audio descriptions',
  'examples.descriptionsShort': '{count} descriptions',

  // --- processing ----------------------------------------------------------
  'processing.heading': 'Processing video',
  'processing.cancel': 'Cancel and choose another video',
  'processing.working': 'Working',
  'processing.stage.queued': 'Getting ready',
  'processing.stage.metadata': 'Reading video details',
  'processing.stage.transcript': 'Extracting the transcript',
  'processing.stage.comprehension': 'Reading the whole video',
  'processing.stage.gaps': 'Finding natural pauses',
  'processing.stage.download': 'Downloading the video',
  'processing.stage.describe': 'Gemma is deciding where descriptions are needed',
  'processing.stage.cached': 'Loading the saved timeline',
  'processing.stage.done': 'Finished',
  'processing.stage.error': 'Something went wrong',

  // --- player --------------------------------------------------------------
  'player.video': 'Video',
  'player.controls': 'Playback controls',
  'player.play': 'Play',
  'player.pause': 'Pause',
  'player.back10': 'Back 10s',
  'player.forward10': 'Forward 10s',
  'player.mute': 'Mute',
  'player.unmute': 'Unmute',
  'player.descriptionsOn': 'Descriptions on',
  'player.descriptionsOff': 'Descriptions off',
  'player.skipSpeech': 'Skip speech',
  'player.replayLast': 'Replay last',
  'player.speakingBanner': 'Shruti is speaking — press {skip} to skip, {replay} to replay.',
  'player.seekLabel': 'Position in video',
  'player.positionOf': '{current} of {total}',
  'player.videoSpeed': 'Video speed',
  'player.videoSpeedNormal': 'Normal speed',
  'player.videoSpeedValue': '{rate} times speed',

  // --- ask about the screen ------------------------------------------------
  'questions.heading': 'Ask about the screen',
  'questions.help':
    'Shruti pauses the video, looks at the exact frame on screen, answers, and then resumes playback. Press the number key shown before a question to ask it instantly.',
  'questions.common': 'Common questions',
  'questions.ownLabel': 'Ask your own question about the current frame',
  'questions.placeholder': 'Type your question… (max 300 characters)',
  'questions.ask': 'Ask',
  'questions.asking': 'Asking…',
  'questions.answerRegion': 'Answer from Gemma',
  'questions.youAsked': 'You asked:',
  'questions.grounded': 'Grounded in the frame at {seconds} seconds.',
  'questions.notGrounded':
    'Gemma could not confirm this from the current frame — treat it with caution.',

  // Preset labels. The server supplies the English label and the question text
  // it sends to Gemma; these override the label so the buttons read in the
  // learner's language while the prompt itself stays unchanged.
  'preset.whats-on-screen': "What's on screen?",
  'preset.read-code': 'Read the code',
  'preset.read-terminal': 'Read the terminal',
  'preset.describe-diagram': 'Describe the diagram',
  'preset.explain-graph': 'Explain the graph',
  'preset.explain-formula': 'Explain this formula',
  'preset.which-button': 'Which button was clicked?',
  'preset.what-changed': 'What changed?',

  // --- description timeline ------------------------------------------------
  'timeline.heading': 'Audio descriptions',
  'timeline.headingCount': 'Audio descriptions ({count})',
  'timeline.empty':
    'Gemma reviewed this video and decided the narration already explains everything on screen, so there are no descriptions. Silence is the correct answer here — you can still ask questions about any frame at any time.',
  'timeline.stat': '{accepted} of {candidates} moments spoken',
  'timeline.statExplanations': ' · {count} full explanations',
  'timeline.tagExplain': 'full explanation',
  'timeline.tagPause': 'pauses video',
  'timeline.tagBrief': 'brief',
  'timeline.filterLabel': 'Find a description',
  'timeline.filterPlaceholder': 'A word, or a time like 4:20',
  'timeline.filterCount': '{count} descriptions match.',
  'timeline.filterNone': 'No description matches {query}.',
  'timeline.exportGroup': 'Download these descriptions',
  'timeline.exportText': 'Download as text',
  'timeline.exportVtt': 'Download as subtitles',
  'timeline.deliveryExplain': 'A full explanation — the video pauses so you hear all of it.',
  'timeline.deliveryPause': 'The video pauses for this description.',
  'timeline.deliveryNatural': 'Spoken during a natural pause.',
  'timeline.itemLabel':
    'At {time}: {description}. Confidence {confidence} percent. {delivery} Activate to jump here.',

  // --- settings ------------------------------------------------------------
  'settings.heading': 'Speech and display',
  'settings.speechSpeed': 'Speech speed',
  'settings.speechSpeedValue': '{rate} times normal speed',
  'settings.normal': 'Normal',
  'settings.volume': 'Description volume',
  'settings.volumeValue': '{percent} percent',
  'settings.voice': 'Description voice',
  'settings.voiceFor': 'Description voice ({language})',
  'settings.systemDefault': 'System default',
  'settings.testVoice': 'Test this voice',
  'settings.testVoiceSample': 'This is how Shruti will read descriptions to you.',
  'settings.noVoiceNote':
    'No {language} voice is installed on this device, so spoken descriptions may be unclear. Microsoft Edge offers {language} voices online, or you can add one in your operating system’s speech settings.',
  'settings.behaviour': 'Behaviour',
  'settings.autoSpeak': 'Speak audio descriptions automatically',
  'settings.duck': 'Lower the video volume while Shruti speaks',
  'settings.readStatus': 'Read status messages aloud',
  'settings.highContrast': 'High contrast mode',
  'settings.done': 'Done',
  'settings.descriptionLanguage': 'Description language',
  'settings.descriptionLanguageHelp':
    'The language Shruti writes and speaks descriptions and answers in. Changing it re-processes the video.',
  'settings.followVideo': 'Follow the video',

  // --- search --------------------------------------------------------------
  'search.heading': 'Find a video',
  'search.close': 'Close search',
  'search.help':
    'Search, paste a YouTube link, or press the {key} key (or the microphone), say what you are looking for, then press {key} again.',
  'search.label': 'Search YouTube',
  'search.placeholder': 'Search, or paste a YouTube link…',
  'search.speak': 'Speak',
  'search.stop': 'Stop',
  'search.submit': 'Search',
  'search.submitBusy': 'Searching…',
  'search.voiceOff':
    'Voice search is off — add OPENAI_API_KEY to the server’s .env to enable it. You can still type a search.',
  'search.results': 'Search results',
  'search.resultLabel': '{title}{channel}{duration}. Load and play this video.',

  // --- voice overlay -------------------------------------------------------
  'voice.title': 'Voice search',
  'voice.listening': 'Listening…',
  'voice.transcribing': 'Transcribing…',
  'voice.speakNow': 'Speak now — press {key} again to search',
  'voice.oneMoment': 'One moment',
  'voice.askingGemma': 'Asking Gemma…',
  'voice.answering': 'Answering…',

  // --- shortcuts dialog ----------------------------------------------------
  'shortcuts.heading': 'Keyboard shortcuts',
  'shortcuts.help':
    'Shortcuts work anywhere except while you are typing in a text box. Press Escape to close this dialog.',
  'shortcuts.close': 'Close',
  'shortcuts.or': 'or',
  'shortcuts.group.playback': 'Playback',
  'shortcuts.group.descriptions': 'Descriptions',
  'shortcuts.group.ask': 'Ask about the screen',
  'shortcuts.group.general': 'General',
  'shortcuts.playPause': 'Play or pause',
  'shortcuts.back5': 'Back 5 seconds',
  'shortcuts.forward5': 'Forward 5 seconds',
  'shortcuts.back10': 'Back 10 seconds',
  'shortcuts.forward10': 'Forward 10 seconds',
  'shortcuts.toStart': 'Back to the start',
  'shortcuts.videoSlower': 'Slow the video down',
  'shortcuts.videoFaster': 'Speed the video up',
  'shortcuts.mute': 'Mute or unmute the video',
  'shortcuts.sayPosition': 'Say the current position',
  'shortcuts.toggleDescriptions': 'Turn audio descriptions on or off',
  'shortcuts.skip': 'Skip the description being spoken',
  'shortcuts.replay': 'Replay the last description',
  'shortcuts.slower': 'Speak more slowly',
  'shortcuts.faster': 'Speak faster',
  'shortcuts.questionBox': 'Move to the question box',
  'shortcuts.question': 'Question {number}',
  'shortcuts.voiceSearch': 'Search by voice — press to record, press again to search',
  'shortcuts.stopSpeaking': 'Stop speaking',
  'shortcuts.showShortcuts': 'Show keyboard shortcuts',

  // --- spoken announcements ------------------------------------------------
  'announce.welcome':
    'Shruti. Paste a YouTube link and choose Process video. Press question mark at any time for keyboard shortcuts.',
  'announce.overlapStopped':
    'Playback resumed. Stopping the description so it does not overlap the narration.',
  'announce.readyOne': 'Ready. One audio description prepared. Starting playback.',
  'announce.readyMany': 'Ready. {count} audio descriptions prepared. Starting playback.',
  'announce.pressSpace': 'Press space to play.',
  'announce.spokenIn': 'Descriptions and answers will be spoken in {language}.',
  'announce.noVoice':
    'This video is in {language}, but no {language} speech voice is installed on this device, so spoken descriptions may be unclear. Microsoft Edge offers {language} voices online, or you can install one in your system settings.',
  'announce.lookingUp': 'Looking up the video.',
  'announce.found': 'Found {title}, {duration} long. Processing now. This can take a few minutes.',
  'announce.progress': '{percent} percent. {message}',
  'announce.processingFailed': 'Processing failed. {message}',
  'announce.returned': 'Returned to the video chooser.',
  'announce.paused': 'Paused.',
  'announce.playing': 'Playing.',
  'announce.videoRate': 'Video speed {rate} times.',
  'announce.resumed':
    'Continuing from {position}, where you stopped last time. Press Home to start from the beginning.',
  'announce.exported': 'The descriptions have been downloaded.',
  'announce.seekForward': 'Forward {seconds} seconds. {position}.',
  'announce.seekBack': 'Back {seconds} seconds. {position}.',
  'announce.muted': 'Video muted.',
  'announce.unmuted': 'Video unmuted.',
  'announce.descriptionsOn': 'Audio descriptions on.',
  'announce.descriptionsOff': 'Audio descriptions off.',
  'announce.skipped': 'Skipped.',
  'announce.nothingSpeaking': 'Nothing is being spoken right now.',
  'announce.speechRate': 'Speech speed {rate}.',
  'announce.questionBox': 'Question box. Type a question and press Enter.',
  'announce.asking': 'Asking Gemma: {question}',
  'announce.answerFailed': 'Sorry, I could not answer that. {message}',
  // Spoken before an answer Gemma could not ground in the frame. The on-screen
  // answer carries the same warning visually; this is how it reaches the ear.
  'announce.notCertain': 'I am not certain about this. {answer}',
  'announce.jumped': 'Jumped to {position}.',
  'announce.nothingDescribed': 'Nothing has been described yet.',
  'announce.description': 'Description: {text}',
  'announce.fullDescription': 'Full description: {text}',
  'announce.playingResult': 'Playing {title}.',
  'announce.position': '{current} of {total}.',
  'announce.languageChanged': 'Interface language set to English.',

  // --- spoken time ---------------------------------------------------------
  'time.minute': '{count} minute',
  'time.minutes': '{count} minutes',
  'time.second': '{count} second',
  'time.seconds': '{count} seconds',
};
