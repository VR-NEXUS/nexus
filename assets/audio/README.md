# Music

The site plays one track, and it lives in this folder:

    assets/audio/paper-boat.mp3

`js/music.js` reads `paper-boat.json` beside it on every page. While
`"installed"` is `false` nothing is fetched and no player is drawn, so the
site simply stays quiet and the console stays clean.

To switch the music on:

1. put the licensed MP3 here as `paper-boat.mp3`;
2. set `"installed": true` in `paper-boat.json`;
3. fill in the licence record below.

That is the whole switch. Every page picks it up on the next load.

## Before the file goes in

"Paper Boat" is by Otomusu. The track may only be served from this folder once
its licence has been checked and cleared for website use, and once any credit
the licence requires has been added. Record the answer here:

- Licence checked by: (name, date)
- Licence type: (for example: direct permission from the rights holder, or a
  production-library licence)
- Credit line the licence requires, if any: (paste it here)

Do not place a different recording or a substitute track in this folder. The
player names Paper Boat by Otomusu on every page.

## Format

- MP3, 44.1 kHz, stereo, 96 to 160 kbps is plenty for background music.
- Keep it under about 8 MB so the page stays quick on a phone.
- The file loops, so a clean loop point at the end helps.

## How the player behaves

The moment a page loads, `js/music.js` asks the browser to play the track.
There is no prompt, no overlay and nothing to dismiss.

- If the browser allows sound, it plays at once, at the volume last used.
- If the browser refuses, nothing is shown about it: the controller stays in
  the corner, paused, and its own play button starts the track.
- The position, mute state and volume are kept in `sessionStorage`, so moving
  between pages picks the track up where it left off.
- One player per page, one `<audio>` element, no duplicates.

## How the browser treats this

Chrome, Safari and Firefox may refuse to start audio until a visitor has
interacted with the site. That refusal is respected, never worked around:
the player simply waits. The first press on its play button is enough, and
from then on the position carries across every page.
