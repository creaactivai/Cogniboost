# CogniBoost — CogniMight Lesson Production Guide

**Version:** 2.0
**Effective:** February 17, 2026
**Owner:** CogniBoost Content Team
**Last reviewed:** February 17, 2026

---

## 1. Overview

This guide is the step-by-step protocol for producing **CogniMight interactive HTML lessons** with cloned-voice MP3 audio for CogniBoost. Every lesson follows the same format: a **scroll-through** HTML page with a sticky audio bar, per-slide play buttons, and clickable interactive elements — all powered by pre-generated MP3 files from your ElevenLabs cloned voice.

**Key principle:** Audio files are STATIC MP3s generated once. No API calls at runtime. No ElevenLabs credits used by students. Students hear the instructor's cloned voice directly from the MP3 files.

**The workflow:**

```
Plan Lesson → Generate HTML with Claude → Generate MP3s with ElevenLabs → Upload to CogniBoost
```

---

## 2. Before You Start — What You Need

| Item | Details |
|------|---------|
| **Claude** | For generating the HTML lesson file |
| **ElevenLabs account** | Pro plan (~$22/mo) with your cloned voice model set up |
| **ElevenLabs model** | `eleven_multilingual_v2` |
| **CogniBoost admin access** | `cogniboost.co/admin` |
| **This guide** | Open it and follow step by step |

---

## 3. File Structure (Per Lesson)

Every lesson produces these files:

```
a1w1l1/                                    <-- Level, Week, Lesson folder
  a1w1l1-slides.html                       <-- The lesson HTML
  audio/                                   <-- Audio folder (MUST be alongside HTML)
    slide-01-narration.mp3                 <-- Slide narrations (1 per slide)
    slide-02-narration.mp3
    slide-03-narration.mp3
    ...
    slide-14-narration.mp3
    letter-a.mp3                           <-- Individual letter audio (26 files)
    letter-b.mp3
    ...
    letter-z.mp3
    word-hello.mp3                         <-- Practice word audio
    word-name.mp3
    ...
    alphabet-song.mp3                      <-- Special audio
```

**Typical total:** ~46 audio files, ~5.5 MB per lesson.

---

## 4. Audio File Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Slide narration | `slide-NN-narration.mp3` | `slide-01-narration.mp3` |
| Individual letter | `letter-X.mp3` (lowercase) | `letter-a.mp3`, `letter-z.mp3` |
| Practice word | `word-WORD.mp3` (lowercase) | `word-hello.mp3` |
| Special phrase | `descriptive-name.mp3` | `alphabet-song.mp3` |

---

## 5. Step 1 — Plan the Lesson

Before opening Claude, define:

```
LESSON PLANNING CHECKLIST
─────────────────────────
Course:       ____________________  (e.g., English Fundamentals)
Level:        ____________________  (A1, A2, B1, B2, C1, C2)
Week:         ____________________  (1-52)
Lesson #:     ____________________  (1, 2, 3...)
Topic:        ____________________  (e.g., "The English Alphabet")
Duration:     ____________________  (in minutes, e.g., 15)
Slide count:  ____________________  (recommended: 10-20 slides)
```

---

## 6. Step 2 — Generate the HTML Lesson with Claude

### 6.1 The Prompt Template

Copy this prompt template, fill in the blanks, and paste it into Claude:

---

```
Create an interactive HTML lesson for the CogniMight lesson system on CogniBoost.

LESSON INFO:
- Title: [LESSON TITLE]
- Level: [A1/A2/B1/B2/C1/C2]
- Week: [NUMBER]
- Lesson: [NUMBER]
- Topic: [TOPIC DESCRIPTION]
- Duration: [NUMBER] minutes
- Number of slides: [NUMBER]

REQUIREMENTS:

1. FILE FORMAT:
   - Single self-contained HTML file
   - All CSS inline in a <style> tag (no external stylesheets)
   - All JavaScript inline in a <script> tag (no external scripts)
   - Mobile-responsive design (mobile-first with 600px and 1024px breakpoints)
   - File size under 5MB
   - ONE external dependency allowed: Google Fonts Inter
     @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

2. METADATA (required — CogniBoost parses these automatically):
   - <title> tag must contain the lesson title
   - Include "Duration: [X] minutes" somewhere visible in the HTML
   - Filename will follow pattern: [level]w[week]l[lesson]-slides.html
     Example: a1w1l1-slides.html

3. LAYOUT — SCROLL-THROUGH STYLE (NOT slide navigation):
   - All slides are visible on a SINGLE page that the student scrolls through
   - NO Previous/Next buttons — the student just scrolls down
   - Each slide is a section with class="slide" and id="slide-1", "slide-2", etc.
   - Clear visual separation between slides (spacing, borders, or backgrounds)
   - Slide number shown on each slide (e.g., "Slide 3 of 14")

4. CSS DESIGN SYSTEM (use these exact colors and fonts):

   :root {
     --color-teal: #0F4C75;       /* Primary - headers, borders */
     --color-blue: #1B6DA8;       /* Secondary - gradients, accents */
     --color-coral: #FF6B6B;      /* Accent - play buttons, examples */
     --color-orange: #FFB347;     /* Accent - tips, warnings */
     --color-green: #10B981;      /* Success - playing state, practice */
     --color-dark: #1A1A2E;       /* Text */
     --color-gray: #495057;       /* Secondary text */
     --color-light-gray: #F8F9FA; /* Backgrounds */
   }

   Font family: 'Inter', sans-serif
   Responsive breakpoints:
   - Default (mobile): 4-column grids, stacked layout
   - 600px+: 6-column grids, side-by-side columns, larger text
   - 1024px+: 7-column grids, max content width 1200px

5. AUDIO SYSTEM (CRITICAL — follow this EXACT structure):

   a) Audio configuration at the top of the <script> section:

   // ═══════════════════════════════════════════════════════════
   // AUDIO CONFIGURATION — DO NOT MODIFY THIS BLOCK
   // ═══════════════════════════════════════════════════════════
   var AUDIO_BASE_URL = './audio/';

   // Slide narration files
   const slideAudioFiles = {
       1: 'slide-01-narration.mp3',
       2: 'slide-02-narration.mp3',
       // ... one entry per slide
   };

   // Letter audio files (generated dynamically for alphabet lessons)
   const letterAudioFiles = {};
   'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
       letterAudioFiles[letter] = 'letter-' + letter.toLowerCase() + '.mp3';
   });

   // Word audio files
   const wordAudioFiles = {
       'HELLO': 'word-hello.mp3',
       'NAME': 'word-name.mp3',
       // ... one entry per practice word
   };

   // Special audio files
   const specialAudioFiles = {
       'alphabet_song': 'alphabet-song.mp3',
       // ... any special audio for this lesson
   };
   // ═══════════════════════════════════════════════════════════

   b) IMPORTANT: Use FOUR separate audio objects (slideAudioFiles,
      letterAudioFiles, wordAudioFiles, specialAudioFiles) — NOT a single
      nested object. This is the CogniMight standard.

   c) Audio playback functions:

   var currentAudio = null;

   function playSlideAudio(slideNum) {
       stopAudio();
       var file = slideAudioFiles[slideNum];
       if (!file) return;
       currentAudio = new Audio(AUDIO_BASE_URL + file);
       currentAudio.playbackRate = currentSpeed;
       currentAudio.play().catch(function(err) {
           // Fallback to Web Speech API if MP3 not found
           speakText(slideNarrationText[slideNum]);
       });
   }

   function playLetterAudio(letter) {
       stopAudio();
       var file = letterAudioFiles[letter.toUpperCase()];
       if (!file) return;
       currentAudio = new Audio(AUDIO_BASE_URL + file);
       currentAudio.play().catch(function(err) {
           speakText(letter);
       });
   }

   function playWordAudio(word) {
       stopAudio();
       var file = wordAudioFiles[word.toUpperCase()];
       if (!file) return;
       currentAudio = new Audio(AUDIO_BASE_URL + file);
       currentAudio.play().catch(function(err) {
           speakText(word);
       });
   }

   function playSpecialAudio(key) {
       stopAudio();
       var file = specialAudioFiles[key];
       if (!file) return;
       currentAudio = new Audio(AUDIO_BASE_URL + file);
       currentAudio.play().catch(function(err) {
           speakText(key);
       });
   }

   function stopAudio() {
       if (currentAudio) {
           currentAudio.pause();
           currentAudio.currentTime = 0;
           currentAudio = null;
       }
   }

   d) Web Speech API fallback function (used ONLY when MP3s fail to load):

   function speakText(text) {
       if ('speechSynthesis' in window) {
           window.speechSynthesis.cancel();
           var utterance = new SpeechSynthesisUtterance(text);
           utterance.lang = 'en-US';
           utterance.rate = currentSpeed;
           window.speechSynthesis.speak(utterance);
       }
   }

   e) Speed control variable:
   var currentSpeed = 1.0;  // 0.75 = Slow, 1.0 = Normal, 1.25 = Fast

6. STICKY AUDIO CONTROLS BAR:
   - Fixed at the TOP of the page (always visible as student scrolls)
   - "Play Lesson" button: plays ALL slide narrations sequentially, auto-scrolls
   - "Stop" button: stops all audio
   - Speed control: Slow (0.75x) / Normal (1.0x) / Fast (1.25x)
   - Status indicator showing current slide during sequential playback

7. PER-SLIDE PLAY BUTTONS:
   - Each slide has a round play button (top-right corner)
   - Plays only that slide's narration
   - Toggles between play/pause states
   - Shows green pulsing animation while playing (use --color-green)

8. INTERACTIVE ELEMENTS:
   - Letter cards: Clickable grid cards, onclick="playLetterAudio('A')"
   - Vowel cards: Special gradient-styled cards for A, E, I, O, U
   - Practice words: Clickable, onclick="playWordAudio('HELLO')"
   - Special audio: Clickable boxes, onclick="playSpecialAudio('alphabet_song')"
   - All clickable elements show clear hover states and cursor:pointer

9. NARRATION TEXT:
   Include the FULL narration text for every slide:

   const slideNarrationText = {
       1: "Welcome to today's lesson about [topic]. Let's get started!",
       2: "In this slide, we will learn about...",
       // ... one entry per slide with COMPLETE text to be narrated
   };

   This text serves TWO purposes:
   - Used to generate the MP3 files in ElevenLabs
   - Used as Web Speech API fallback if MP3s are not loaded yet

   Make narration text:
   - Clear and educational
   - Natural speaking pace
   - Appropriate for the level (simpler for A1, more complex for B2+)

10. DO NOT INCLUDE:
    - External dependencies (except Google Fonts Inter)
    - References to external images (use CSS/SVG/emoji only)
    - Any fetch() or API calls
    - Any connection to ElevenLabs API
```

---

### 6.2 After Claude Generates the HTML

**Checklist — verify before proceeding:**

- [ ] Open the HTML file in a browser — all slides visible on scroll
- [ ] Sticky audio bar stays at top while scrolling
- [ ] Per-slide play buttons are present on every slide
- [ ] `slideAudioFiles` lists one entry per slide
- [ ] `letterAudioFiles` is generated correctly (if alphabet lesson)
- [ ] `wordAudioFiles` lists all practice words
- [ ] `specialAudioFiles` lists any special audio
- [ ] `slideNarrationText` contains narration for EVERY slide
- [ ] `<title>` tag has the correct lesson title
- [ ] "Duration: X minutes" is present in the HTML
- [ ] CSS uses the CogniMight color variables
- [ ] Font is Inter (Google Fonts import present)
- [ ] Mobile responsive (resize browser to test 3 breakpoints)
- [ ] File size is under 5MB

### 6.3 Filename Convention

```
[level]w[week]l[lesson]-slides.html

Examples:
  a1w1l1-slides.html    → Level A1, Week 1, Lesson 1
  a1w3l2-slides.html    → Level A1, Week 3, Lesson 2
  b1w10l1-slides.html   → Level B1, Week 10, Lesson 1
```

The CogniBoost upload system automatically parses level, week, and lesson number from this filename.

---

## 7. Step 3 — Generate MP3 Audio Files with ElevenLabs

### 7.1 Extract All Text to Generate

Open your HTML file and extract text from these sources:

| Source | What to extract | Generates |
|--------|----------------|-----------|
| `slideNarrationText` | Full narration text per slide | `slide-NN-narration.mp3` |
| `letterAudioFiles` | Each letter (A-Z) | `letter-a.mp3` through `letter-z.mp3` |
| `wordAudioFiles` | Each practice word | `word-hello.mp3`, etc. |
| `specialAudioFiles` | Special phrases/songs | `alphabet-song.mp3`, etc. |

### 7.2 ElevenLabs Settings

Use these EXACT settings for consistent audio across all lessons:

| Setting | Value |
|---------|-------|
| **Model** | `eleven_multilingual_v2` |
| **Voice** | Your cloned voice model |
| **Stability** | 0.75 |
| **Similarity Boost** | 0.85 |
| **Style** | 0.20 |
| **Speaker Boost** | ON |

### 7.3 Pronunciation Rules (Important!)

Follow these rules to get correct English pronunciation:

| Situation | Wrong | Correct | Why |
|-----------|-------|---------|-----|
| Single letters | Just type "A" | Type uppercase `"A"` | Model reads single uppercase letters correctly |
| Letter Z | Type "Z" | Type `"zee"` | Avoids British "zed" pronunciation |
| Spelling words | "HELLO" | `"H, E, L, L, O. Hello!"` | Commas force letter-by-letter pronunciation |
| Pauses | No punctuation | Use commas and periods | Creates natural speaking rhythm |

### 7.4 Generation Process

**For slide narrations:**

1. Go to **ElevenLabs → Speech Synthesis**
2. Select your **cloned voice model**
3. Set the parameters from section 7.2
4. Paste the narration text from `slideNarrationText[N]`
5. Click **Generate**
6. Listen to verify — re-generate if needed
7. Download as **MP3**
8. Rename to `slide-NN-narration.mp3` (match `slideAudioFiles` exactly)

**For individual letters (A-Z):**

1. Generate each letter as a single uppercase character: `"A"`, `"B"`, etc.
2. Exception: Letter Z → type `"zee"`
3. Download and rename to `letter-a.mp3`, `letter-b.mp3`, etc.

**For practice words:**

1. Generate using the spelling format: `"H, E, L, L, O. Hello!"`
2. Download and rename to `word-hello.mp3`, etc.

**For special audio (songs, phrases):**

1. Type the full text naturally
2. Download and rename to match `specialAudioFiles` key

### 7.5 Audio Quality Checklist

For each generated MP3:

- [ ] Voice sounds natural and clear (instructor's cloned voice)
- [ ] Pronunciation is correct (especially tricky letters)
- [ ] Pace is appropriate for the level (slower for A1, natural for B2+)
- [ ] No background noise or artifacts
- [ ] Filename matches EXACTLY what the HTML expects (case-sensitive)
- [ ] File is in MP3 format

### 7.6 Organize Your Files

```
a1w1l1/
  a1w1l1-slides.html
  audio/
    slide-01-narration.mp3
    slide-02-narration.mp3
    ...
    slide-14-narration.mp3
    letter-a.mp3
    letter-b.mp3
    ...
    letter-z.mp3
    word-hello.mp3
    word-name.mp3
    ...
    alphabet-song.mp3
```

### 7.7 Cross-Reference Verification

Before uploading, verify EVERY file:

1. Open the HTML file in a text editor
2. Count files in `slideAudioFiles` → _____ files
3. Count files in `letterAudioFiles` → _____ files
4. Count files in `wordAudioFiles` → _____ files
5. Count files in `specialAudioFiles` → _____ files
6. **Total expected:** _____ files
7. Count MP3s in your `audio/` folder: _____ files
8. **Numbers must match exactly**

### 7.8 Batch Generation Tracking

Use this spreadsheet format to track generation progress:

```
| # | Type      | Key/Slide | Text to Speak          | Filename               | Generated? | Verified? |
|---|-----------|-----------|------------------------|------------------------|------------|-----------|
| 1 | narration | slide 1   | "Welcome to..."       | slide-01-narration.mp3 | Yes        | Yes       |
| 2 | narration | slide 2   | "In this lesson..."   | slide-02-narration.mp3 | Yes        | Yes       |
| 3 | letter    | A         | "A"                    | letter-a.mp3           | Yes        | Yes       |
| 4 | letter    | Z         | "zee"                  | letter-z.mp3           | Yes        | Yes       |
| 5 | word      | HELLO     | "H, E, L, L, O. Hello"| word-hello.mp3         | Yes        | Yes       |
```

---

## 8. Step 4 — Upload to CogniBoost

### 8.1 Upload the HTML Lesson

1. Go to `cogniboost.co/admin`
2. Navigate to **Subir Lecciones** (Lesson Upload)
3. Select the **target course** from the dropdown
4. Select the **module** (if applicable)
5. Drag and drop your `.html` file (or click to browse)
6. Verify the auto-detected metadata:
   - Title (from `<title>` tag)
   - Level, Week, Lesson (from filename)
   - Duration (from "Duration: X minutes")
7. Click **Subir** (Upload)
8. Confirm green checkmark (success)

### 8.2 Upload the Audio Files

> **Note:** The audio upload feature is being built as part of the platform update.
> Until then, coordinate with the engineering team to upload audio files.

**When the audio upload feature is ready:**

1. Go to the lesson you just uploaded in the admin panel
2. Click the **Audio** tab/section
3. Drag and drop all MP3 files from your `audio/` folder
4. The system will:
   - Validate filenames against the HTML's audio objects
   - Show a checklist of expected vs. uploaded files
   - Flag any missing or extra files
5. Confirm all files are matched (green checkmarks)
6. Click **Upload Audio**

### 8.3 Test the Lesson

After uploading both HTML and audio:

1. Open the lesson as a student would (use a test student account)
2. **Scroll through all slides** — verify layout and content
3. **Test sticky audio bar:** "Play Lesson" should narrate and auto-scroll
4. **Test per-slide play buttons:** click each slide's play button
5. **Test interactive elements:** click every letter, word, and special audio
6. **Test speed controls:** Slow (0.75x), Normal (1.0x), Fast (1.25x)
7. **Test Stop button:** verify it halts all audio
8. **Verify voice:** you should hear the instructor's cloned voice, NOT a robotic voice
9. **Test on mobile:** open on a phone or use browser responsive mode

**If you hear a robotic voice:** The MP3 files are not being found. The system is falling back to Web Speech API. Check that audio files were uploaded correctly and `AUDIO_BASE_URL` is correct.

---

## 9. Local Testing (Before Uploading)

You can test lessons locally before uploading to CogniBoost:

```bash
cd /path/to/a1w1l1/
python3 -m http.server 8000
```

Then open `http://localhost:8000/a1w1l1-slides.html` in your browser.

**Important:** Opening HTML by double-clicking (file:// protocol) will NOT play MP3s in most browsers. You MUST use an HTTP server.

---

## 10. Reusable Audio Library

Some audio files are identical across lessons. Save generation time and ElevenLabs credits by reusing them:

**Letters (A-Z):** Generate once, reuse in every lesson that has letter cards.

**Common words:** If "hello" appears in multiple lessons, generate `word-hello.mp3` once and copy it.

**Organize a shared library:**

```
shared-audio/
  letters/
    letter-a.mp3 through letter-z.mp3
  common-words/
    word-hello.mp3
    word-goodbye.mp3
    word-thank-you.mp3
    ...
```

When creating a new lesson, copy the relevant files from `shared-audio/` into the lesson's `audio/` folder instead of regenerating them.

---

## 11. Lesson Production Checklist

Print this and check off each item for every lesson:

```
COGNIMIGHT LESSON PRODUCTION CHECKLIST
════════════════════════════════════════════════

LESSON: ________________  DATE: ________________
LEVEL: _____  WEEK: _____  LESSON #: _____

PLANNING
  [ ] Lesson info defined (course, level, week, lesson, topic, duration)
  [ ] Slide count planned (recommended 10-20)
  [ ] Interactive elements planned (letters, words, special audio)

HTML GENERATION (Claude)
  [ ] Prompt filled with all lesson details and sent to Claude
  [ ] HTML uses scroll-through layout (NOT slide navigation)
  [ ] Sticky audio bar at top of page
  [ ] Per-slide play buttons on every slide
  [ ] CSS uses CogniMight color variables
  [ ] Font is Inter (Google Fonts)
  [ ] Four separate audio objects: slideAudioFiles, letterAudioFiles,
      wordAudioFiles, specialAudioFiles
  [ ] slideNarrationText has text for EVERY slide
  [ ] <title> tag is correct
  [ ] "Duration: X minutes" is visible
  [ ] Mobile responsive (tested at 3 breakpoints)
  [ ] File size under 5MB
  [ ] Filename: [level]w[week]l[lesson]-slides.html

AUDIO GENERATION (ElevenLabs)
  [ ] ElevenLabs model: eleven_multilingual_v2
  [ ] Voice settings: Stability 0.75, Similarity 0.85, Style 0.20, Boost ON
  [ ] All slide narrations generated from slideNarrationText
  [ ] All letter audio generated (if applicable)
  [ ] All word audio generated (Z pronounced as "zee")
  [ ] All special audio generated
  [ ] Each MP3 verified for quality
  [ ] Each MP3 renamed to match audio objects exactly
  [ ] File count:  _____ expected  _____ generated  (must match)
  [ ] Files organized in audio/ folder

UPLOAD TO COGNIBOOST
  [ ] HTML uploaded (correct course + module selected)
  [ ] Auto-detected metadata verified (title, level, week, duration)
  [ ] Audio files uploaded
  [ ] All audio files matched (no missing/extra)

TESTING
  [ ] Scroll through all slides — layout correct
  [ ] "Play Lesson" plays narrations sequentially with auto-scroll
  [ ] Per-slide play buttons work on every slide
  [ ] All interactive elements produce sound (letters, words, etc.)
  [ ] Speed controls work (Slow/Normal/Fast)
  [ ] Stop button halts all audio
  [ ] Voice is instructor's cloned voice (NOT robotic)
  [ ] Tested on desktop
  [ ] Tested on mobile

SIGN-OFF
  [ ] Lesson approved for students
  [ ] Date published: ________________
```

---

## 12. Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Robotic/different voice | MP3 files not found, fell back to Web Speech API | Check that `audio/` folder is uploaded and `AUDIO_BASE_URL` is correct |
| No sound at all | Browser blocking audio or iframe sandbox | Must be served over http:// or https://, not file://. Check iframe sandbox includes `allow-same-origin` |
| Letters sound Spanish | ElevenLabs pronunciation issue | Use comma-separated letters. Z must be written as "zee" |
| Audio cuts off mid-sentence | Chrome Web Speech API bug | Only affects fallback mode. MP3 files don't have this issue |
| Slides look broken on mobile | Missing responsive breakpoints | Check CSS breakpoints at 600px and 1024px |
| HTML won't upload | File too large or invalid | Must be under 5MB. Must be valid `.html` file |
| Metadata not detected | Wrong filename or missing tags | Filename must follow `a1w1l1-slides.html` pattern. Check `<title>` tag |
| Clickable elements no sound | Wrong function call or missing audio file | Check `onclick` uses correct function (`playLetterAudio`, `playWordAudio`, etc.) and the key exists in the corresponding audio object |
| Audio plays wrong file | Mismatched keys | Cross-reference: the key in the audio object must match the `onclick` call AND the actual filename |

---

## 13. Quick Reference Card

```
┌──────────────────────────────────────────────────────┐
│        COGNIMIGHT LESSON PRODUCTION — QUICK REF      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1. PLAN     → Level, week, topic, slide count       │
│  2. CLAUDE   → Generate HTML with prompt template    │
│  3. VERIFY   → Test HTML locally (python3 -m http..) │
│  4. AUDIO    → Generate MP3s in ElevenLabs           │
│  5. CHECK    → Cross-reference filenames to HTML     │
│  6. UPLOAD   → HTML first, then audio files          │
│  7. TEST     → Every slide, every sound, mobile too  │
│                                                      │
│  Layout:     Scroll-through (NOT slide navigation)   │
│  Filename:   a1w1l1-slides.html                      │
│  Audio dir:  a1w1l1/audio/                           │
│  Max size:   5MB (HTML), ~5.5MB (audio total)        │
│  Font:       Inter (Google Fonts)                    │
│  EL Model:   eleven_multilingual_v2                  │
│  EL Voice:   Stability 0.75 / Similarity 0.85       │
│  Z letter:   Always type "zee" (not "Z")             │
│                                                      │
│  Robotic voice? → MP3s not found. Check audio path.  │
│  No sound?      → Check iframe sandbox settings.     │
│  Questions?     → Submit a ticket.                   │
└──────────────────────────────────────────────────────┘
```

---

## 14. Slide Template Reference

A typical 14-slide lesson structure (adapt as needed for your topic):

| Slide | Content | Audio | Interactive |
|-------|---------|-------|-------------|
| 1 | Title + topic introduction | Narration | Play button |
| 2 | Learning Objectives (3-5 items) | Narration | Play button |
| 3 | Why this matters + real-world context | Narration | Play button |
| 4-6 | Core content (main teaching slides) | Narration + element sounds | Clickable cards/elements |
| 7 | Common mistakes / tricky points | Narration + example sounds | Clickable examples |
| 8 | Fun/engaging element (song, game, challenge) | Narration + special audio | Clickable activity |
| 9 | Real-life application examples | Narration | Play button |
| 10 | Practice exercise | Narration + interactive sounds | Clickable practice |
| 11 | Homework / assignment | Narration | Play button |
| 12 | Key takeaways summary | Narration | Play button |
| 13 | Next lesson preview | Narration | Play button |
| 14 | Closing / encouragement | Narration | Play button |

---

## Protocol Versioning

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-17 | Initial guide |
| 2.0 | 2026-02-17 | Rewritten to match CogniMight standard: scroll-through layout, four separate audio objects, ElevenLabs `eleven_multilingual_v2` settings (0.75/0.85/0.20), pronunciation rules, CogniMight CSS design system, Web Speech API fallback, slide template reference, local testing instructions, reusable audio library |

---

*This guide is a living document. Update it as the workflow improves or the platform adds new features.*
