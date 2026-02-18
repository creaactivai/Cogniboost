#!/usr/bin/env python3
"""
CogniMight Lesson Audio Generator
==================================
Reads HTML lesson files, extracts all audio text, and generates MP3 files
using the ElevenLabs API with your cloned voice.

Usage:
    python3 generate_audio.py                     # Process all HTML files in current dir
    python3 generate_audio.py a1w1l1-slides.html  # Process a single file
    python3 generate_audio.py lessons/             # Process all HTML files in a folder

Requirements:
    pip3 install requests

Environment variables (set these before running):
    ELEVENLABS_API_KEY=your_api_key_here
    ELEVENLABS_VOICE_ID=your_voice_id_here
"""

import os
import sys
import re
import json
import time
import glob
import requests

# ─── Configuration ───────────────────────────────────────────────────────────

API_KEY = os.environ.get("ELEVENLABS_API_KEY", "")
VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID", "")
MODEL_ID = "eleven_multilingual_v2"

# Voice settings (CogniMight standard)
VOICE_SETTINGS = {
    "stability": 0.75,
    "similarity_boost": 0.85,
    "style": 0.20,
    "use_speaker_boost": True,
}

# API rate limiting
DELAY_BETWEEN_REQUESTS = 1.5  # seconds between API calls (avoid rate limits)

# ─── Audio Text Extraction ───────────────────────────────────────────────────


def extract_slide_narrations(html_content):
    """Extract slideNarrationText object from HTML."""
    # Match: const slideNarrationText = { ... };
    # or: var slideNarrationText = { ... };
    pattern = r'(?:const|var|let)\s+slideNarrationText\s*=\s*\{(.*?)\};'
    match = re.search(pattern, html_content, re.DOTALL)
    if not match:
        return {}

    block = match.group(1)
    narrations = {}
    # Match entries like: 1: "text here", or 1: 'text here',
    entry_pattern = r'(\d+)\s*:\s*["\'](.+?)["\']'
    for m in re.finditer(entry_pattern, block, re.DOTALL):
        slide_num = int(m.group(1))
        text = m.group(2).replace("\\n", " ").replace("\\'", "'").replace('\\"', '"').strip()
        narrations[slide_num] = text

    return narrations


def extract_slide_audio_files(html_content):
    """Extract slideAudioFiles object from HTML."""
    pattern = r'(?:const|var|let)\s+slideAudioFiles\s*=\s*\{(.*?)\};'
    match = re.search(pattern, html_content, re.DOTALL)
    if not match:
        return {}

    block = match.group(1)
    files = {}
    entry_pattern = r'(\d+)\s*:\s*["\'](.+?)["\']'
    for m in re.finditer(entry_pattern, block):
        files[int(m.group(1))] = m.group(2)

    return files


def extract_word_audio_files(html_content):
    """Extract wordAudioFiles object from HTML."""
    pattern = r'(?:const|var|let)\s+wordAudioFiles\s*=\s*\{(.*?)\};'
    match = re.search(pattern, html_content, re.DOTALL)
    if not match:
        return {}

    block = match.group(1)
    words = {}
    entry_pattern = r'["\'](\w+)["\']\s*:\s*["\'](.+?)["\']'
    for m in re.finditer(entry_pattern, block):
        words[m.group(1)] = m.group(2)

    return words


def extract_special_audio_files(html_content):
    """Extract specialAudioFiles object from HTML."""
    pattern = r'(?:const|var|let)\s+specialAudioFiles\s*=\s*\{(.*?)\};'
    match = re.search(pattern, html_content, re.DOTALL)
    if not match:
        return {}

    block = match.group(1)
    specials = {}
    entry_pattern = r'["\'](.+?)["\']\s*:\s*["\'](.+?)["\']'
    for m in re.finditer(entry_pattern, block):
        specials[m.group(1)] = m.group(2)

    return specials


def has_letter_audio(html_content):
    """Check if the lesson uses letterAudioFiles."""
    return bool(re.search(r'letterAudioFiles', html_content))


def extract_lesson_id(html_content, filename):
    """Extract lesson ID from filename or HTML."""
    # Try filename first: a1w1l1-slides.html
    match = re.match(r'([abc]\d+w\d+l\d+)', filename, re.IGNORECASE)
    if match:
        return match.group(1).lower()
    # Try HTML title
    title_match = re.search(r'<title[^>]*>([^<]+)</title>', html_content, re.IGNORECASE)
    if title_match:
        t = title_match.group(1)
        id_match = re.search(r'([ABC]\d)\s*W(\d+)\s*L(\d+)', t, re.IGNORECASE)
        if id_match:
            return f"{id_match.group(1).lower()}w{id_match.group(2)}l{id_match.group(3)}"
    return os.path.splitext(filename)[0]


# ─── Audio Generation ────────────────────────────────────────────────────────


def generate_audio(text, output_path):
    """Generate MP3 from text using ElevenLabs API."""
    if os.path.exists(output_path):
        print(f"  [SKIP] Already exists: {os.path.basename(output_path)}")
        return True

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": API_KEY,
    }
    payload = {
        "text": text,
        "model_id": MODEL_ID,
        "voice_settings": VOICE_SETTINGS,
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=60)
        if response.status_code == 200:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, "wb") as f:
                f.write(response.content)
            size_kb = len(response.content) / 1024
            print(f"  [OK]   {os.path.basename(output_path)} ({size_kb:.0f} KB)")
            return True
        else:
            print(f"  [FAIL] {os.path.basename(output_path)} — HTTP {response.status_code}: {response.text[:200]}")
            return False
    except requests.exceptions.Timeout:
        print(f"  [FAIL] {os.path.basename(output_path)} — Request timed out")
        return False
    except Exception as e:
        print(f"  [FAIL] {os.path.basename(output_path)} — {str(e)}")
        return False


# ─── Pronunciation Helpers ───────────────────────────────────────────────────

# How to speak each letter for correct pronunciation
LETTER_PRONUNCIATIONS = {
    "A": "A",
    "B": "B",
    "C": "C",
    "D": "D",
    "E": "E",
    "F": "F",
    "G": "G",
    "H": "H",
    "I": "I",
    "J": "J",
    "K": "K",
    "L": "L",
    "M": "M",
    "N": "N",
    "O": "O",
    "P": "P",
    "Q": "Q",
    "R": "R",
    "S": "S",
    "T": "T",
    "U": "U",
    "V": "V",
    "W": "W",
    "X": "X",
    "Y": "Y",
    "Z": "zee",  # IMPORTANT: "zee" not "Z" to avoid British "zed"
}


def get_word_spelling_text(word):
    """Generate spelling text for a word. E.g., HELLO → 'H, E, L, L, O. Hello!'"""
    letters = ", ".join(list(word.upper()))
    return f"{letters}. {word.capitalize()}!"


# ─── Main Processing ─────────────────────────────────────────────────────────


def process_lesson(html_path):
    """Process a single HTML lesson file and generate all its audio."""
    filename = os.path.basename(html_path)
    print(f"\n{'='*60}")
    print(f"Processing: {filename}")
    print(f"{'='*60}")

    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    lesson_id = extract_lesson_id(html, filename)
    audio_dir = os.path.join(os.path.dirname(html_path), "audio")
    os.makedirs(audio_dir, exist_ok=True)

    total = 0
    success = 0
    skipped = 0

    # 1. Slide narrations
    narrations = extract_slide_narrations(html)
    slide_files = extract_slide_audio_files(html)

    if narrations:
        print(f"\n--- Slide Narrations ({len(narrations)} slides) ---")
        for slide_num in sorted(narrations.keys()):
            text = narrations[slide_num]
            fname = slide_files.get(slide_num, f"slide-{slide_num:02d}-narration.mp3")
            output = os.path.join(audio_dir, fname)
            total += 1

            if os.path.exists(output):
                print(f"  [SKIP] Already exists: {fname}")
                skipped += 1
                success += 1
                continue

            if generate_audio(text, output):
                success += 1
            time.sleep(DELAY_BETWEEN_REQUESTS)
    else:
        print("\n  [WARN] No slideNarrationText found in HTML")

    # 2. Letter audio (A-Z)
    if has_letter_audio(html):
        print(f"\n--- Letter Audio (26 letters) ---")
        for letter, pronunciation in LETTER_PRONUNCIATIONS.items():
            fname = f"letter-{letter.lower()}.mp3"
            output = os.path.join(audio_dir, fname)
            total += 1

            if os.path.exists(output):
                print(f"  [SKIP] Already exists: {fname}")
                skipped += 1
                success += 1
                continue

            if generate_audio(pronunciation, output):
                success += 1
            time.sleep(DELAY_BETWEEN_REQUESTS)

    # 3. Word audio
    word_files = extract_word_audio_files(html)
    if word_files:
        print(f"\n--- Word Audio ({len(word_files)} words) ---")
        for word, fname in word_files.items():
            output = os.path.join(audio_dir, fname)
            total += 1

            if os.path.exists(output):
                print(f"  [SKIP] Already exists: {fname}")
                skipped += 1
                success += 1
                continue

            text = get_word_spelling_text(word)
            if generate_audio(text, output):
                success += 1
            time.sleep(DELAY_BETWEEN_REQUESTS)

    # 4. Special audio
    special_files = extract_special_audio_files(html)
    if special_files:
        print(f"\n--- Special Audio ({len(special_files)} files) ---")
        for key, fname in special_files.items():
            output = os.path.join(audio_dir, fname)
            total += 1

            if os.path.exists(output):
                print(f"  [SKIP] Already exists: {fname}")
                skipped += 1
                success += 1
                continue

            # For special audio, use the key as descriptive text
            text = key.replace("_", " ").replace("-", " ").title()
            if generate_audio(text, output):
                success += 1
            time.sleep(DELAY_BETWEEN_REQUESTS)

    # Summary
    failed = total - success
    print(f"\n--- Summary for {lesson_id} ---")
    print(f"  Total files:  {total}")
    print(f"  Generated:    {success - skipped}")
    print(f"  Skipped:      {skipped} (already existed)")
    print(f"  Failed:       {failed}")
    print(f"  Audio folder: {audio_dir}")

    return total, success, failed


def main():
    # Check environment
    if not API_KEY:
        print("ERROR: ELEVENLABS_API_KEY environment variable not set.")
        print("Run: export ELEVENLABS_API_KEY=your_key_here")
        sys.exit(1)
    if not VOICE_ID:
        print("ERROR: ELEVENLABS_VOICE_ID environment variable not set.")
        print("Run: export ELEVENLABS_VOICE_ID=your_voice_id_here")
        sys.exit(1)

    # Determine what to process
    targets = sys.argv[1:] if len(sys.argv) > 1 else ["."]
    html_files = []

    for target in targets:
        if os.path.isfile(target) and target.endswith(".html"):
            html_files.append(target)
        elif os.path.isdir(target):
            # Find all HTML files in directory (not recursive)
            found = sorted(glob.glob(os.path.join(target, "*-slides.html")))
            if not found:
                found = sorted(glob.glob(os.path.join(target, "*.html")))
            html_files.extend(found)
        else:
            print(f"WARNING: Skipping '{target}' (not an HTML file or directory)")

    if not html_files:
        print("No HTML lesson files found.")
        print("Usage:")
        print("  python3 generate_audio.py                     # All HTML files in current dir")
        print("  python3 generate_audio.py lesson.html          # Single file")
        print("  python3 generate_audio.py lessons/             # All files in folder")
        sys.exit(1)

    print(f"CogniMight Audio Generator")
    print(f"==========================")
    print(f"Voice ID: {VOICE_ID[:8]}...")
    print(f"Model: {MODEL_ID}")
    print(f"Files to process: {len(html_files)}")

    grand_total = 0
    grand_success = 0
    grand_failed = 0

    for html_file in html_files:
        total, success, failed = process_lesson(html_file)
        grand_total += total
        grand_success += success
        grand_failed += failed

    print(f"\n{'='*60}")
    print(f"ALL DONE")
    print(f"{'='*60}")
    print(f"  Lessons processed:  {len(html_files)}")
    print(f"  Total audio files:  {grand_total}")
    print(f"  Successful:         {grand_success}")
    print(f"  Failed:             {grand_failed}")

    if grand_failed > 0:
        print(f"\n  ⚠ {grand_failed} files failed. Re-run the script to retry (existing files will be skipped).")
        sys.exit(1)


if __name__ == "__main__":
    main()
