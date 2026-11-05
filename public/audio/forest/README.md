# Forest dialogue audio

15 Mandarin speech clips, generated offline from this project's original dialogue by eSpeak NG 1.51 and encoded with FFmpeg. Speaker/pitch varies between the protagonist and six animal species. No voice cloning, paid API, browser TTS dependency, microphone, or runtime network service is used.

These are intelligible synthetic prototype voices, not professional actor recordings. Child/parent listening UAT and real iPhone Safari HTTPS playback remain required; replace these files with licensed studio voices if the synthetic timbre is unsuitable.

Scripts, subtitles, durations and paths: `src/data/dialogue.json`. Reproduce with `python3 scripts/generate-forest-voices.py` after installing eSpeak NG (Mandarin data) and FFmpeg. App builds do not need either tool. eSpeak NG is GPL-3.0-or-later software, https://github.com/espeak-ng/espeak-ng. Its executable/data are not shipped in this application; only synthesized audio from original scripts is distributed. The project grants use and redistribution of these generated original dialogue recordings with this game.
