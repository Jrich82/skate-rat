# Skate Rat

A halfpipe alert widget for StreamElements. A rat chills on a deck at the edge of the stream. When someone superchats, becomes a member or subscribes, he drops in, carves the pipe and airs out of the far wall with a trick. The more money, the higher the air and the bigger the trick. Back-to-back events chain into a combo.

Built as a gift for [KillEatRatz](https://www.youtube.com/@killeatratz).

## Tricks

Bigger money gets a higher air and a harder trick. Each tier picks at random from its pool, so it doesn't repeat the same thing all stream.

| Event | Trick pool |
|---|---|
| Subscriber / follower | Grab airs: Indy, Melon, Stalefish, Mute, Japan |
| New member, or superchat under tier 1 | Kickflip, Heelflip, Varial, Method Air |
| Tier 1 (default A$5+) | 360 Flip, 360 Indy, 360 Mute, 360 Flip Indy |
| Tier 2 (default A$20+) | 540 Melon, 540 McTwist, 360 Kickflip, Rocket Air |
| Tier 3 (default A$50+) | 720 Stalefish, 720 Kickflip, 540 360 Flip, in slow motion |
| Tier 4 (default A$100+) or a raid | THE 900, in slow motion with confetti |
| `!kickflip` in chat | A random low-tier trick, with a chance he bails |

At the peak of each air he rotates upright, so spins and flips read clearly. The 360s and 720s land fakie (riding backwards), and he switches around on the flat. A **Hang time** setting makes everything slower and floatier.

## Try it

Open `preview/index.html` in a browser and click the fake event buttons.

## Install

### Easiest: one link (for the streamer)

1. Sign in at [streamelements.com](https://streamelements.com) with your **YouTube** account.
2. Click the Skate Rat install link you were sent. StreamElements imports the overlay into **My Overlays**.
3. Open it, click **Launch overlay** (or copy its URL) and add that URL to OBS as a **Browser Source**: width 1080, height 1920 for a vertical stream.

The art, tricks and settings are already set up. To try it, open the overlay, click the widget and use the **Test** buttons.

### Making the install link (one-time, for whoever sets it up)

1. Sign in to StreamElements with a YouTube account. Install links are tied to a platform, so make it on the same platform the streamer uses.
2. **Overlays → New overlay**, sized to match the stream (1080 × 1920 vertical).
3. **+ → Static/Custom → Custom widget → Open editor**. Paste `widget/widget.html`, `widget.css`, `widget.js` and `fields.json` into the matching tabs, then click **Done**.
4. Stretch the widget across the bottom of the canvas and test it.
5. Save. Then, from the overlay's menu in **My Overlays**, use **Share** to get the install link.

### Manual install (no link)

Do steps 2–4 above in the streamer's own StreamElements account. The art loads automatically from this repo, so nothing needs uploading.

## Repo layout

```
widget/   the StreamElements widget (HTML, CSS, JS, fields)
art/      rat poses + board, transparent PNGs
preview/  standalone demo page (generated)
tools/    build_preview.py, cutout.py
```

## Development

- Edit the files in `widget/`, then rebuild the demo with `python tools/build_preview.py`.
- The widget loads its art from `art/` on this repo's `main` branch. Changing those PNGs and pushing updates every installed copy. Renaming or deleting them breaks it.
- New art: make each pose a side view **facing right** with feet at the bottom. Generate the board separately so it can flip on its own.
- AI image tools often paint a fake checkerboard instead of real transparency. `python tools/cutout.py in.jpg art/rat-ride.png` removes it; add `--fill-holes` for solid shapes like the board. Needs `numpy`, `scipy` and `Pillow`.

## How it works

The halfpipe is two quarter-circle ramps joined by a flat. The rat's position is a single distance along that path, and gravity speeds him up or slows him down depending on the slope. He gets "pumped" on the flat to whatever energy the next trick needs. When he passes a coping with speed left over, he launches straight up, does the trick animation for exactly his air time, turns around at the peak and drops back in.
