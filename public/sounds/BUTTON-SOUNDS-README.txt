Button sound files
==================

Upload your .mp3 files into this folder:

public/sounds/

Fast mobile loading update
--------------------------

The website now preloads the known button and event sound files when the page starts and uses normal /sounds/*.mp3 URLs instead of blob/object URLs.

That means:
- Each custom button/event MP3 is downloaded into the browser cache early instead of waiting for the first press.
- Buttons that appear later on the page are also preloaded automatically.
- If a custom MP3 is missing or cannot load, the site remembers that and uses SOUND.mp3 instead.
- SOUND.mp3 is also preloaded as the universal fallback.
- Mobile taps are handled with touchstart/pointerdown so iPhone and Android browsers can play inside the real tap event.

Important: the included SOUND.mp3 may be only a tiny placeholder. Replace it with a real MP3.

Fallback sound
--------------

SOUND.mp3 is the universal fallback sound for button and event sounds.

That means:
- If a button or event has its own MP3 and the file loads, that unique sound plays.
- If a button has no custom sound assigned, SOUND.mp3 plays.
- If a custom button/event MP3 is missing or cannot load, SOUND.mp3 plays instead.
- Game music does not fall back to SOUND.mp3, because a short click sound should not loop as music. Upload runner-game-music.mp3 to enable the game music loop.

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
intro-language-th.mp3
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
main-language-th.mp3
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

Current custom event filenames used by the site
-----------------------------------------------

floating-ring-press.mp3
cat-to-boat-loading.mp3
runner-jump.mp3
runner-game-over.mp3
runner-game-music.mp3

Event timing
------------

- floating-ring-press.mp3 plays when the 3D floating ring is pressed.
- cat-to-boat-loading.mp3 plays when the alien cat is dropped on the boat and the Loading... popup starts.
- runner-jump.mp3 plays when the alien cat jumps in the mini-game.
- runner-game-over.mp3 plays when the cat falls/crashes and the try-again window appears.
- runner-game-music.mp3 loops while the mini-game is playing and stops when the game-over window appears or the game closes.

You do not need every file immediately. Missing button/event files fall back to SOUND.mp3. Missing runner-game-music.mp3 simply means no game music.
