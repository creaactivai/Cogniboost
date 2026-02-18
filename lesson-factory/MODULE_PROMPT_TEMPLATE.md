# Module Prompt Template

Copy everything below the line and paste it into Claude. Fill in the [BRACKETS].

---

```
I need you to generate [4 or 5] complete HTML lesson files for a module in the CogniMight lesson system.

MODULE INFO:
- Course: [COURSE NAME, e.g., "English Fundamentals"]
- Level: [A1/A2/B1/B2/C1/C2]
- Module: [MODULE NUMBER, e.g., 1]
- Module Title: [MODULE TITLE, e.g., "Building Blocks of English"]
- Target audience: Spanish-speaking adults learning English

LESSONS IN THIS MODULE:

Lesson 1:
- Week: [NUMBER]
- Lesson: [NUMBER]
- Title: [LESSON TITLE]
- Topic: [BRIEF TOPIC DESCRIPTION]
- Duration: [NUMBER] minutes
- Slides: [NUMBER, recommended 10-14]
- Interactive elements: [LIST what should be clickable — e.g., "vocabulary words", "letter cards", "example sentences"]

Lesson 2:
- Week: [NUMBER]
- Lesson: [NUMBER]
- Title: [LESSON TITLE]
- Topic: [BRIEF TOPIC DESCRIPTION]
- Duration: [NUMBER] minutes
- Slides: [NUMBER]
- Interactive elements: [LIST]

Lesson 3:
- Week: [NUMBER]
- Lesson: [NUMBER]
- Title: [LESSON TITLE]
- Topic: [BRIEF TOPIC DESCRIPTION]
- Duration: [NUMBER] minutes
- Slides: [NUMBER]
- Interactive elements: [LIST]

Lesson 4:
- Week: [NUMBER]
- Lesson: [NUMBER]
- Title: [LESSON TITLE]
- Topic: [BRIEF TOPIC DESCRIPTION]
- Duration: [NUMBER] minutes
- Slides: [NUMBER]
- Interactive elements: [LIST]

[ADD Lesson 5 if this module has 5 lessons]

FOR EACH LESSON, generate a COMPLETE, SELF-CONTAINED HTML file following ALL of these rules:

1. LAYOUT: Scroll-through style (all slides on one page, student scrolls). NO Previous/Next buttons.

2. FILENAME: [level]w[week]l[lesson]-slides.html (e.g., a1w1l1-slides.html)

3. CSS DESIGN SYSTEM (use in every file):
   @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
   :root {
     --color-teal: #0F4C75;
     --color-blue: #1B6DA8;
     --color-coral: #FF6B6B;
     --color-orange: #FFB347;
     --color-green: #10B981;
     --color-dark: #1A1A2E;
     --color-gray: #495057;
     --color-light-gray: #F8F9FA;
   }
   Font: 'Inter', sans-serif
   Max width: 1200px
   Responsive: mobile-first with 600px and 1024px breakpoints

4. AUDIO SYSTEM (CRITICAL — use this EXACT JavaScript structure in every file):

   var AUDIO_BASE_URL = './audio/';
   var currentAudio = null;
   var currentSpeed = 1.0;

   const slideAudioFiles = {
       1: 'slide-01-narration.mp3',
       2: 'slide-02-narration.mp3',
       // ... one per slide
   };

   // Only include letterAudioFiles if the lesson has clickable letter cards:
   const letterAudioFiles = {};
   'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(function(letter) {
       letterAudioFiles[letter] = 'letter-' + letter.toLowerCase() + '.mp3';
   });

   // Only include wordAudioFiles if the lesson has clickable vocabulary/practice words:
   const wordAudioFiles = {
       'WORD': 'word-word.mp3',
       // ... one per clickable word
   };

   // Only include specialAudioFiles if the lesson has special audio (songs, dialogues, etc):
   const specialAudioFiles = {
       'key_name': 'key-name.mp3',
   };

   const slideNarrationText = {
       1: "Full narration text for slide 1...",
       2: "Full narration text for slide 2...",
       // ... COMPLETE text for EVERY slide
   };

   function playSlideAudio(slideNum) {
       stopAudio();
       var file = slideAudioFiles[slideNum];
       if (!file) return;
       currentAudio = new Audio(AUDIO_BASE_URL + file);
       currentAudio.playbackRate = currentSpeed;
       currentAudio.play().catch(function() {
           speakText(slideNarrationText[slideNum]);
       });
   }

   function playLetterAudio(letter) {
       stopAudio();
       var file = letterAudioFiles[letter.toUpperCase()];
       if (!file) return;
       currentAudio = new Audio(AUDIO_BASE_URL + file);
       currentAudio.play().catch(function() { speakText(letter); });
   }

   function playWordAudio(word) {
       stopAudio();
       var file = wordAudioFiles[word.toUpperCase()];
       if (!file) return;
       currentAudio = new Audio(AUDIO_BASE_URL + file);
       currentAudio.play().catch(function() { speakText(word); });
   }

   function playSpecialAudio(key) {
       stopAudio();
       var file = specialAudioFiles[key];
       if (!file) return;
       currentAudio = new Audio(AUDIO_BASE_URL + file);
       currentAudio.play().catch(function() { speakText(key); });
   }

   function stopAudio() {
       if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; currentAudio = null; }
       if ('speechSynthesis' in window) window.speechSynthesis.cancel();
   }

   function speakText(text) {
       if ('speechSynthesis' in window) {
           var u = new SpeechSynthesisUtterance(text);
           u.lang = 'en-US'; u.rate = currentSpeed;
           window.speechSynthesis.speak(u);
       }
   }

5. STICKY AUDIO BAR: Fixed at top with "Play Lesson" (plays all narrations sequentially with auto-scroll), "Stop", and Speed (Slow 0.75x / Normal 1.0x / Fast 1.25x).

6. PER-SLIDE PLAY BUTTONS: Round button top-right of each slide, plays that slide's narration.

7. CLICKABLE INTERACTIVE ELEMENTS: Use onclick with the correct function:
   - Letters: onclick="playLetterAudio('A')"
   - Words: onclick="playWordAudio('HELLO')"
   - Special: onclick="playSpecialAudio('key_name')"
   All clickable elements must have cursor:pointer and visible hover states.

8. METADATA:
   - <title> must contain the lesson title
   - "Duration: X minutes" must be visible on slide 1
   - Brand name "CogniMight" on first and last slide

9. SLIDE STRUCTURE (adapt based on topic):
   - Slide 1: Title + topic intro
   - Slide 2: Learning objectives
   - Slide 3: Why this matters / real-world context
   - Slides 4-8: Core content with interactive elements
   - Slide 9-10: Practice exercises
   - Slide 11: Homework
   - Slide 12: Key takeaways
   - Slide 13: Next lesson preview
   - Slide 14: Closing / encouragement

10. DO NOT include external dependencies except Google Fonts Inter. No fetch(), no API calls. Everything self-contained.

OUTPUT: Generate each lesson as a COMPLETE HTML file. Provide them one at a time, clearly labeled with the filename. Start with Lesson 1.
```
