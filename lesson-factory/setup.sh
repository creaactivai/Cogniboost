#!/bin/bash
# CogniMight Lesson Factory — One-Time Setup
# Run this once: bash setup.sh

echo "==================================="
echo "CogniMight Lesson Factory Setup"
echo "==================================="
echo ""

# 1. Install Python dependency
echo "Installing Python requests library..."
pip3 install requests
echo ""

# 2. Set ElevenLabs credentials
# These get added to your shell profile so they persist across terminal sessions
SHELL_PROFILE="$HOME/.zshrc"
if [ ! -f "$SHELL_PROFILE" ]; then
    SHELL_PROFILE="$HOME/.bashrc"
fi

# Check if already configured
if grep -q "ELEVENLABS_API_KEY" "$SHELL_PROFILE" 2>/dev/null; then
    echo "ElevenLabs credentials already configured in $SHELL_PROFILE"
else
    echo "" >> "$SHELL_PROFILE"
    echo "# CogniMight Lesson Factory — ElevenLabs credentials" >> "$SHELL_PROFILE"
    echo "export ELEVENLABS_API_KEY=\"sk_d3bd0c5ac3b1d4988ca9b8886a55b192983e93c37eb45900\"" >> "$SHELL_PROFILE"
    echo "export ELEVENLABS_VOICE_ID=\"tzMJUc4MeU1twUFd0n0V\"" >> "$SHELL_PROFILE"
    echo "Credentials added to $SHELL_PROFILE"
fi

# Load them for current session
export ELEVENLABS_API_KEY="sk_d3bd0c5ac3b1d4988ca9b8886a55b192983e93c37eb45900"
export ELEVENLABS_VOICE_ID="tzMJUc4MeU1twUFd0n0V"

echo ""
echo "==================================="
echo "Setup Complete!"
echo "==================================="
echo ""
echo "IMPORTANT: Close and reopen Terminal (or run: source $SHELL_PROFILE)"
echo ""
echo "Then you can generate audio like this:"
echo "  python3 generate_audio.py a1w1l1-slides.html"
echo "  python3 generate_audio.py my-lessons-folder/"
echo ""
