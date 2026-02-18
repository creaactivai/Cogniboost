# CogniMight Lesson Factory — Claude Code Instructions

You are helping produce interactive HTML lessons for the CogniMight lesson system on CogniBoost (an LMS for Spanish-speaking adults learning English).

## Your Role

The admin will ask you to generate HTML lesson files. Your job is to:
1. Generate complete, self-contained HTML lessons following the CogniMight format
2. Help run the audio generation script
3. Help organize files for upload

## Key Rules

### HTML Lesson Format
- **Layout:** Scroll-through (all slides visible on one page, student scrolls). NEVER use Previous/Next slide navigation.
- **CSS:** Use the CogniMight design system (Inter font, teal/blue/coral/orange/green color palette)
- **Audio:** Use FOUR separate audio JavaScript objects: `slideAudioFiles`, `letterAudioFiles`, `wordAudioFiles`, `specialAudioFiles`
- **Narration:** Always include `slideNarrationText` with full text for every slide
- **Fallback:** Include Web Speech API fallback when MP3s fail to load
- **Metadata:** `<title>` tag with lesson title, "Duration: X minutes" visible on slide 1
- **Brand:** "CogniMight" on first and last slide
- **Self-contained:** All CSS and JS inline. No external dependencies except Google Fonts Inter.
- **Responsive:** Mobile-first with 600px and 1024px breakpoints

### File Naming
- HTML: `[level]w[week]l[lesson]-slides.html` (e.g., `a1w1l1-slides.html`)
- Audio folder: `audio/` next to the HTML file
- Narration: `slide-NN-narration.mp3`
- Letters: `letter-x.mp3` (lowercase)
- Words: `word-xxx.mp3` (lowercase)
- Special: `descriptive-name.mp3`

### Audio Generation
- The `generate_audio.py` script in this folder handles all audio generation automatically
- To run it: `python3 generate_audio.py [path-to-html-files]`
- It reads the HTML, extracts text, calls ElevenLabs API, downloads MP3s
- Environment variables ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID must be set (see setup.sh)

### Prompt Template
- `MODULE_PROMPT_TEMPLATE.md` contains the standard prompt for generating a full module (4-5 lessons)
- The admin fills in the module info and you generate the HTML files

## Common Tasks

### "Generate lessons for module X"
1. Ask what course, level, week numbers, and lesson topics
2. Generate each HTML file following the CogniMight format exactly
3. Save each file with the correct filename

### "Generate audio for these lessons"
1. Run: `python3 generate_audio.py [folder-with-html-files]/`
2. The script handles everything automatically

### "Check my lesson files"
1. Read the HTML file
2. Verify: slideAudioFiles, letterAudioFiles, wordAudioFiles, specialAudioFiles, slideNarrationText
3. Count expected audio files vs what exists in audio/ folder
4. Report any mismatches

## ElevenLabs Settings (for reference)
- Model: `eleven_multilingual_v2`
- Stability: 0.75
- Similarity Boost: 0.85
- Style: 0.20
- Speaker Boost: ON
- Z pronunciation: "zee" (not "Z")
- Word spelling: "H, E, L, L, O. Hello!" (comma-separated)
