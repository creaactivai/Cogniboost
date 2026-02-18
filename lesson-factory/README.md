# CogniMight Lesson Factory

This toolkit lets you produce complete lessons (HTML + audio) in bulk.

## What's Inside

```
lesson-factory/
  README.md                    ← You are here
  MODULE_PROMPT_TEMPLATE.md    ← Prompt template for Claude (copy-paste)
  generate_audio.py            ← Script that auto-generates all MP3s
  setup.sh                     ← One-time setup (installs what you need)
```

## One-Time Setup

Open Terminal and run:

```bash
cd /path/to/lesson-factory
bash setup.sh
```

This installs Python's `requests` library (needed for ElevenLabs API).

## How to Produce a Module (4-5 Lessons)

### Step 1: Generate the HTML Lessons

1. Open `MODULE_PROMPT_TEMPLATE.md`
2. Copy the prompt template
3. Fill in your module info (course, level, lessons, topics)
4. Paste into Claude
5. Claude generates each HTML file — save each one with the correct filename:
   - `a1w1l1-slides.html`
   - `a1w1l2-slides.html`
   - etc.
6. Put all HTML files in one folder (e.g., `module-1/`)

### Step 2: Generate All Audio (Automatic!)

Run ONE command and the script does everything:

```bash
cd /path/to/module-1/
python3 /path/to/lesson-factory/generate_audio.py .
```

That's it. The script:
- Reads each HTML file
- Finds all narration text, words, letters, special audio
- Calls ElevenLabs API with your cloned voice
- Downloads every MP3 with the correct filename
- Puts them in an `audio/` folder next to each HTML file

**It takes ~2-3 minutes per lesson** (depends on how many audio files).

**If it fails halfway** — just run it again. It skips files that already exist.

### Step 3: Upload to CogniBoost

1. Go to `cogniboost.co/admin` → **Subir Lecciones**
2. Select course and module
3. Upload each HTML file
4. Upload the audio files (when audio upload feature is ready)

## Quick Commands

```bash
# Generate audio for one lesson:
python3 generate_audio.py a1w1l1-slides.html

# Generate audio for all lessons in a folder:
python3 generate_audio.py module-1/

# Generate audio for all HTML files in current directory:
python3 generate_audio.py
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "ELEVENLABS_API_KEY not set" | Run `setup.sh` again, or set it manually (see setup.sh) |
| "HTTP 401" | API key is wrong or expired — check ElevenLabs dashboard |
| "HTTP 429" | Rate limited — wait a minute and run again (it skips completed files) |
| Script hangs | Check your internet connection. Press Ctrl+C to cancel, then re-run |
| Wrong voice | Check ELEVENLABS_VOICE_ID in setup.sh matches your cloned voice |
| MP3 sounds weird | Re-generate in ElevenLabs dashboard manually for that one file |

## Cost Estimate

With ElevenLabs Pro ($22/month):
- ~46 audio files per lesson
- ~160 lessons total
- Each lesson uses ~2,000-5,000 characters
- Total: ~500,000-800,000 characters
- Pro plan includes 500,000 chars/month
- **Estimate: 1-2 months of Pro plan to generate all 160 lessons**

Tip: Do one course at a time (32 lessons = ~1 week of generation).
