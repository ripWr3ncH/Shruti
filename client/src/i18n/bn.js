/**
 * বাংলা strings.
 *
 * Mirrors every key in `en.js`. A missing key falls back to English rather than
 * rendering blank, so this file can be extended safely.
 *
 * Translation notes:
 *  - Most of this text is heard, not read. Phrasing is chosen for how a Bangla
 *    speech voice reads it aloud, not for written compactness.
 *  - Product, key and technical names stay in their original form — YouTube,
 *    Gemma, Shruti, Microsoft Edge, OPENAI_API_KEY, and the shortcut letters —
 *    because that is how they are said in Bangla speech, and a transliterated
 *    keycap would not match the key the learner presses.
 *  - Digits stay Latin. Bangla voices read them correctly, and timestamps stay
 *    legible next to the player's own numerals.
 */
export default {
  // --- shell ---------------------------------------------------------------
  'app.tagline': 'পর্দায় যা আছে, তা শুনুন।',
  'app.skipToMain': 'মূল অংশে যান',
  'app.home': 'হোম',
  'app.findVideo': 'ভিডিও খুঁজুন',
  'app.settingsLabel': 'কণ্ঠ ও প্রদর্শন সেটিংস',
  'app.chooseDifferent': 'অন্য একটি ভিডিও বেছে নিন',
  'app.modelConfig': 'মডেল কনফিগ',
  'app.keyboardShortcuts': 'কীবোর্ড শর্টকাট',
  'app.footerModel': 'প্রতিটি বর্ণনা ও উত্তর {model} থেকে আসে।',
  'app.languageLabel': 'ইন্টারফেসের ভাষা',
  'app.languageEnglish': 'English',
  'app.languageBangla': 'বাংলা',

  // --- choosing a video ----------------------------------------------------
  'url.heading': 'একটি ভিডিও বেছে নিন',
  'url.label': 'YouTube ভিডিও লিংক',
  'url.help':
    'Shruti ভিডিওটি ডাউনলোড করবে, তার ক্যাপশন পড়বে, এবং যেসব মুহূর্তে পর্দায় এমন কিছু দেখা যায় যা বর্ণনাকারী মুখে বলেন না, সেসব মুহূর্তের জন্য অডিও বর্ণনা তৈরি করবে। দশ মিনিটের একটি টিউটোরিয়াল প্রস্তুত হতে সাধারণত কয়েক মিনিট সময় লাগে।',
  'url.submit': 'ভিডিও প্রস্তুত করুন',
  'url.submitBusy': 'প্রস্তুত করা হচ্ছে…',

  'examples.heading': 'এখনই চালানোর জন্য প্রস্তুত',
  'examples.helpOne':
    'এই সার্ভারে একটি ভিডিওর বর্ণনা আগেই তৈরি করা আছে। এটি কোনো অপেক্ষা ছাড়াই সঙ্গে সঙ্গে চালু হবে।',
  'examples.helpMany':
    'এই সার্ভারে {count}টি ভিডিওর বর্ণনা আগেই তৈরি করা আছে। এগুলো কোনো অপেক্ষা ছাড়াই সঙ্গে সঙ্গে চালু হবে।',
  'examples.itemLabel': '{title}{channel}{duration}{descriptions}। এখনই চালানো যাবে।',
  'examples.byChannel': ', চ্যানেল {channel}',
  'examples.descriptionCount': ', {count}টি অডিও বর্ণনা',
  'examples.descriptionsShort': '{count}টি বর্ণনা',

  // --- processing ----------------------------------------------------------
  'processing.heading': 'ভিডিও প্রস্তুত করা হচ্ছে',
  'processing.cancel': 'বাতিল করে অন্য ভিডিও বেছে নিন',
  'processing.working': 'কাজ চলছে',
  'processing.stage.queued': 'শুরু করার প্রস্তুতি চলছে',
  'processing.stage.metadata': 'ভিডিওর তথ্য পড়া হচ্ছে',
  'processing.stage.transcript': 'ট্রান্সক্রিপ্ট বের করা হচ্ছে',
  'processing.stage.comprehension': 'পুরো ভিডিওটি বোঝা হচ্ছে',
  'processing.stage.gaps': 'বর্ণনার স্বাভাবিক বিরতিগুলো খোঁজা হচ্ছে',
  'processing.stage.download': 'ভিডিও ডাউনলোড করা হচ্ছে',
  'processing.stage.describe': 'কোথায় বর্ণনা দরকার, Gemma তা ঠিক করছে',
  'processing.stage.cached': 'সংরক্ষিত বর্ণনাগুলো আনা হচ্ছে',
  'processing.stage.done': 'সম্পন্ন',
  'processing.stage.error': 'কিছু একটা ভুল হয়েছে',

  // --- player --------------------------------------------------------------
  'player.video': 'ভিডিও',
  'player.controls': 'চালানোর নিয়ন্ত্রণ',
  'player.play': 'চালান',
  'player.pause': 'থামান',
  'player.back10': '১০ সেকেন্ড পিছনে',
  'player.forward10': '১০ সেকেন্ড সামনে',
  'player.mute': 'শব্দ বন্ধ',
  'player.unmute': 'শব্দ চালু',
  'player.descriptionsOn': 'বর্ণনা চালু',
  'player.descriptionsOff': 'বর্ণনা বন্ধ',
  'player.skipSpeech': 'বর্ণনা এড়িয়ে যান',
  'player.replayLast': 'শেষটি আবার শুনুন',
  'player.speakingBanner':
    'Shruti বলছে — এড়িয়ে যেতে {skip} চাপুন, আবার শুনতে {replay} চাপুন।',
  'player.seekLabel': 'ভিডিওর অবস্থান',
  'player.positionOf': '{total} এর মধ্যে {current}',

  // --- ask about the screen ------------------------------------------------
  'questions.heading': 'পর্দা সম্পর্কে জিজ্ঞাসা করুন',
  'questions.help':
    'Shruti ভিডিওটি থামাবে, পর্দায় ঠিক এই মুহূর্তে যা আছে তা দেখবে, উত্তর দেবে, তারপর আবার চালু করবে। কোনো প্রশ্নের আগে দেখানো সংখ্যার কী চাপলেই সঙ্গে সঙ্গে সেটি জিজ্ঞাসা করা হবে।',
  'questions.common': 'সাধারণ প্রশ্ন',
  'questions.ownLabel': 'এই মুহূর্তের পর্দা নিয়ে নিজের প্রশ্ন লিখুন',
  'questions.placeholder': 'আপনার প্রশ্ন লিখুন… (সর্বোচ্চ ৩০০ অক্ষর)',
  'questions.ask': 'জিজ্ঞাসা করুন',
  'questions.asking': 'জিজ্ঞাসা করা হচ্ছে…',
  'questions.answerRegion': 'Gemma-র উত্তর',
  'questions.youAsked': 'আপনি জিজ্ঞাসা করেছেন:',
  'questions.grounded': '{seconds} সেকেন্ডের দৃশ্য থেকে নেওয়া।',
  'questions.notGrounded':
    'Gemma এই মুহূর্তের দৃশ্য থেকে এটি নিশ্চিত করতে পারেনি — সতর্কতার সঙ্গে নিন।',

  'preset.whats-on-screen': 'পর্দায় কী আছে?',
  'preset.read-code': 'কোডটি পড়ুন',
  'preset.read-terminal': 'টার্মিনালটি পড়ুন',
  'preset.describe-diagram': 'চিত্রটি বর্ণনা করুন',
  'preset.explain-graph': 'গ্রাফটি ব্যাখ্যা করুন',
  'preset.explain-formula': 'এই সূত্রটি ব্যাখ্যা করুন',
  'preset.which-button': 'কোন বোতামে ক্লিক করা হলো?',
  'preset.what-changed': 'কী পরিবর্তন হলো?',

  // --- description timeline ------------------------------------------------
  'timeline.heading': 'অডিও বর্ণনা',
  'timeline.headingCount': 'অডিও বর্ণনা ({count})',
  'timeline.empty':
    'Gemma এই ভিডিওটি দেখে সিদ্ধান্ত নিয়েছে যে পর্দায় যা আছে তার সবই বর্ণনাকারী মুখে বলেছেন, তাই আলাদা কোনো বর্ণনা নেই। এখানে চুপ থাকাই সঠিক উত্তর — তবু আপনি যেকোনো সময় যেকোনো দৃশ্য নিয়ে প্রশ্ন করতে পারেন।',
  'timeline.stat': '{candidates}টি মুহূর্তের মধ্যে {accepted}টিতে বলা হয়েছে',
  'timeline.statExplanations': ' · {count}টি পূর্ণ ব্যাখ্যা',
  'timeline.tagExplain': 'পূর্ণ ব্যাখ্যা',
  'timeline.tagPause': 'ভিডিও থামে',
  'timeline.tagBrief': 'সংক্ষিপ্ত',
  'timeline.deliveryExplain': 'একটি পূর্ণ ব্যাখ্যা — পুরোটা শোনানোর জন্য ভিডিও থামে।',
  'timeline.deliveryPause': 'এই বর্ণনাটির জন্য ভিডিও থামে।',
  'timeline.deliveryNatural': 'একটি স্বাভাবিক বিরতিতে বলা হয়।',
  'timeline.itemLabel':
    '{time} সময়ে: {description}। নিশ্চয়তা {confidence} শতাংশ। {delivery} এখানে যেতে চাপুন।',

  // --- settings ------------------------------------------------------------
  'settings.heading': 'কণ্ঠ ও প্রদর্শন',
  'settings.speechSpeed': 'বলার গতি',
  'settings.speechSpeedValue': 'স্বাভাবিকের {rate} গুণ',
  'settings.normal': 'স্বাভাবিক',
  'settings.volume': 'বর্ণনার শব্দমাত্রা',
  'settings.volumeValue': '{percent} শতাংশ',
  'settings.voice': 'বর্ণনার কণ্ঠ',
  'settings.voiceFor': 'বর্ণনার কণ্ঠ ({language})',
  'settings.systemDefault': 'সিস্টেমের নিজস্ব',
  'settings.testVoice': 'এই কণ্ঠটি শুনে দেখুন',
  'settings.testVoiceSample': 'Shruti এভাবেই আপনাকে বর্ণনা পড়ে শোনাবে।',
  'settings.noVoiceNote':
    'এই যন্ত্রে {language} ভাষার কোনো কণ্ঠ নেই, তাই বলা বর্ণনা অস্পষ্ট শোনাতে পারে। Microsoft Edge অনলাইনে {language} কণ্ঠ দেয়, অথবা আপনি আপনার অপারেটিং সিস্টেমের স্পিচ সেটিংসে একটি যোগ করতে পারেন।',
  'settings.behaviour': 'আচরণ',
  'settings.autoSpeak': 'অডিও বর্ণনা নিজে থেকেই বলা হোক',
  'settings.duck': 'Shruti বলার সময় ভিডিওর শব্দ কমানো হোক',
  'settings.readStatus': 'অবস্থার বার্তাগুলো পড়ে শোনানো হোক',
  'settings.highContrast': 'উচ্চ কনট্রাস্ট মোড',
  'settings.done': 'সম্পন্ন',
  'settings.descriptionLanguage': 'বর্ণনার ভাষা',
  'settings.descriptionLanguageHelp':
    'Shruti যে ভাষায় বর্ণনা ও উত্তর লিখবে ও বলবে। এটি বদলালে ভিডিওটি আবার প্রস্তুত করা হবে।',
  'settings.followVideo': 'ভিডিওর ভাষা অনুসরণ করুন',

  // --- search --------------------------------------------------------------
  'search.heading': 'ভিডিও খুঁজুন',
  'search.close': 'অনুসন্ধান বন্ধ করুন',
  'search.help':
    'খুঁজুন, একটি YouTube লিংক পেস্ট করুন, অথবা {key} কী চাপুন (কিংবা মাইক্রোফোনে চাপুন), যা খুঁজছেন তা বলুন, তারপর আবার {key} চাপুন।',
  'search.label': 'YouTube-এ খুঁজুন',
  'search.placeholder': 'খুঁজুন, বা একটি YouTube লিংক পেস্ট করুন…',
  'search.speak': 'বলুন',
  'search.stop': 'থামান',
  'search.submit': 'খুঁজুন',
  'search.submitBusy': 'খোঁজা হচ্ছে…',
  'search.voiceOff':
    'কণ্ঠে অনুসন্ধান বন্ধ আছে — চালু করতে সার্ভারের .env ফাইলে OPENAI_API_KEY যোগ করুন। আপনি লিখে খুঁজতে পারেন।',
  'search.results': 'অনুসন্ধানের ফলাফল',
  'search.resultLabel': '{title}{channel}{duration}। এই ভিডিওটি চালু করুন।',

  // --- voice overlay -------------------------------------------------------
  'voice.title': 'কণ্ঠে অনুসন্ধান',
  'voice.listening': 'শোনা হচ্ছে…',
  'voice.transcribing': 'লেখা হচ্ছে…',
  'voice.speakNow': 'এখন বলুন — খুঁজতে আবার {key} চাপুন',
  'voice.oneMoment': 'এক মুহূর্ত',
  'voice.askingGemma': 'Gemma-কে জিজ্ঞাসা করা হচ্ছে…',
  'voice.answering': 'উত্তর দেওয়া হচ্ছে…',

  // --- shortcuts dialog ----------------------------------------------------
  'shortcuts.heading': 'কীবোর্ড শর্টকাট',
  'shortcuts.help':
    'কোনো লেখার ঘরে টাইপ করার সময় ছাড়া শর্টকাটগুলো সব জায়গায় কাজ করে। এই উইন্ডোটি বন্ধ করতে Escape চাপুন।',
  'shortcuts.close': 'বন্ধ করুন',
  'shortcuts.or': 'অথবা',
  'shortcuts.group.playback': 'চালানো',
  'shortcuts.group.descriptions': 'বর্ণনা',
  'shortcuts.group.ask': 'পর্দা সম্পর্কে জিজ্ঞাসা',
  'shortcuts.group.general': 'সাধারণ',
  'shortcuts.playPause': 'চালান বা থামান',
  'shortcuts.back5': '৫ সেকেন্ড পিছনে',
  'shortcuts.forward5': '৫ সেকেন্ড সামনে',
  'shortcuts.back10': '১০ সেকেন্ড পিছনে',
  'shortcuts.forward10': '১০ সেকেন্ড সামনে',
  'shortcuts.toStart': 'শুরুতে ফিরে যান',
  'shortcuts.mute': 'ভিডিওর শব্দ বন্ধ বা চালু করুন',
  'shortcuts.sayPosition': 'এখন কোথায় আছি তা বলুন',
  'shortcuts.toggleDescriptions': 'অডিও বর্ণনা চালু বা বন্ধ করুন',
  'shortcuts.skip': 'যে বর্ণনাটি বলা হচ্ছে তা এড়িয়ে যান',
  'shortcuts.replay': 'শেষ বর্ণনাটি আবার শুনুন',
  'shortcuts.slower': 'আরও ধীরে বলুন',
  'shortcuts.faster': 'আরও দ্রুত বলুন',
  'shortcuts.questionBox': 'প্রশ্নের ঘরে যান',
  'shortcuts.question': 'প্রশ্ন {number}',
  'shortcuts.voiceSearch': 'কণ্ঠে খুঁজুন — রেকর্ড করতে চাপুন, খুঁজতে আবার চাপুন',
  'shortcuts.stopSpeaking': 'বলা বন্ধ করুন',
  'shortcuts.showShortcuts': 'কীবোর্ড শর্টকাট দেখুন',

  // --- spoken announcements ------------------------------------------------
  'announce.welcome':
    'Shruti। একটি YouTube লিংক পেস্ট করে ভিডিও প্রস্তুত করুন বেছে নিন। কীবোর্ড শর্টকাট দেখতে যেকোনো সময় প্রশ্নবোধক চিহ্ন চাপুন।',
  'announce.overlapStopped':
    'ভিডিও আবার চালু হয়েছে। বর্ণনাকারীর কথার উপর যাতে না পড়ে, তাই বর্ণনাটি থামানো হচ্ছে।',
  'announce.readyOne': 'প্রস্তুত। একটি অডিও বর্ণনা তৈরি হয়েছে। চালু করা হচ্ছে।',
  'announce.readyMany': 'প্রস্তুত। {count}টি অডিও বর্ণনা তৈরি হয়েছে। চালু করা হচ্ছে।',
  'announce.pressSpace': 'চালাতে স্পেস চাপুন।',
  'announce.spokenIn': 'বর্ণনা ও উত্তর {language} ভাষায় বলা হবে।',
  'announce.noVoice':
    'এই ভিডিওটি {language} ভাষার, কিন্তু এই যন্ত্রে {language} ভাষার কোনো কণ্ঠ নেই, তাই বলা বর্ণনা অস্পষ্ট শোনাতে পারে। Microsoft Edge অনলাইনে {language} কণ্ঠ দেয়, অথবা আপনি সিস্টেম সেটিংসে একটি ইনস্টল করতে পারেন।',
  'announce.lookingUp': 'ভিডিওটি খোঁজা হচ্ছে।',
  'announce.found':
    '{title} পাওয়া গেছে, দৈর্ঘ্য {duration}। এখন প্রস্তুত করা হচ্ছে। এতে কয়েক মিনিট লাগতে পারে।',
  'announce.progress': '{percent} শতাংশ। {message}',
  'announce.processingFailed': 'প্রস্তুত করা যায়নি। {message}',
  'announce.returned': 'ভিডিও বাছাইয়ের পাতায় ফেরা হয়েছে।',
  'announce.paused': 'থামানো হয়েছে।',
  'announce.playing': 'চলছে।',
  'announce.seekForward': '{seconds} সেকেন্ড সামনে। {position}।',
  'announce.seekBack': '{seconds} সেকেন্ড পিছনে। {position}।',
  'announce.muted': 'ভিডিওর শব্দ বন্ধ।',
  'announce.unmuted': 'ভিডিওর শব্দ চালু।',
  'announce.descriptionsOn': 'অডিও বর্ণনা চালু।',
  'announce.descriptionsOff': 'অডিও বর্ণনা বন্ধ।',
  'announce.skipped': 'এড়িয়ে যাওয়া হয়েছে।',
  'announce.nothingSpeaking': 'এই মুহূর্তে কিছু বলা হচ্ছে না।',
  'announce.speechRate': 'বলার গতি {rate}।',
  'announce.questionBox': 'প্রশ্নের ঘর। প্রশ্ন লিখে Enter চাপুন।',
  'announce.asking': 'Gemma-কে জিজ্ঞাসা করা হচ্ছে: {question}',
  'announce.answerFailed': 'দুঃখিত, এর উত্তর দেওয়া গেল না। {message}',
  'announce.notCertain': 'এই বিষয়ে আমি নিশ্চিত নই। {answer}',
  'announce.jumped': '{position} সময়ে যাওয়া হয়েছে।',
  'announce.nothingDescribed': 'এখনো কোনো বর্ণনা দেওয়া হয়নি।',
  'announce.description': 'বর্ণনা: {text}',
  'announce.fullDescription': 'পূর্ণ বর্ণনা: {text}',
  'announce.playingResult': '{title} চালু করা হচ্ছে।',
  'announce.position': '{total} এর মধ্যে {current}।',
  'announce.languageChanged': 'ইন্টারফেসের ভাষা বাংলা করা হয়েছে।',

  // --- spoken time ---------------------------------------------------------
  'time.minute': '{count} মিনিট',
  'time.minutes': '{count} মিনিট',
  'time.second': '{count} সেকেন্ড',
  'time.seconds': '{count} সেকেন্ড',
};
