Button sound files
==================

Upload your .mp3 files into this folder:

public/sounds/

Fast loading update
-------------------

The website now preloads the known button sound files when the page starts.

That means:
- Each custom button MP3 is fetched early instead of waiting for the first button press.
- Buttons that appear later on the page are also preloaded automatically.
- If a custom MP3 is missing or cannot load, the site remembers that and uses SOUND.mp3 instead.
- SOUND.mp3 is also preloaded as the universal fallback.

Important: the included SOUND.mp3 may be only a tiny placeholder. Replace it with a real MP3.

Fallback sound
--------------

SOUND.mp3 is the universal fallback sound.

That means:
- If a button has its own MP3 and the file loads, that unique sound plays.
- If a button has no custom sound assigned, SOUND.mp3 plays.
- If a custom button MP3 is missing or cannot load, SOUND.mp3 plays instead.

Current custom filenames used by the site
-----------------------------------------

intro-logo.mp3
intro-translate-open.mp3
intro-translate-close.mp3
intro-enter.mp3
intro-language-sv.mp3
intro-language-en.mp3
intro-language-ja.mp3
intro-language-ko.mp3
intro-language-zh.mp3
intro-language-fr.mp3
intro-language-de.mp3
intro-language-es.mp3
intro-language-it.mp3
intro-language-pt.mp3
main-logo.mp3
main-translate-open.mp3
main-translate-close.mp3
main-language-sv.mp3
main-language-en.mp3
main-language-ja.mp3
main-language-ko.mp3
main-language-zh.mp3
main-language-fr.mp3
main-language-de.mp3
main-language-es.mp3
main-language-it.mp3
main-language-pt.mp3
mission-close.mp3
start-alien-cat-game.mp3
collection-dreamy.mp3
collection-emo.mp3
collection-nature.mp3
collection-cyber.mp3
social-tiktok.mp3
social-instagram.mp3
social-email.mp3
social-share.mp3
model-error-close.mp3
runner-close.mp3
runner-play-again.mp3

You do not need every file immediately. Missing files fall back to SOUND.mp3.
