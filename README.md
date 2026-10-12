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

## Install in StreamElements

1. StreamElements dashboard → **Streaming tools → Overlays**. Open your overlay or make a new one.
2. **+ → Static/Custom → Custom widget**, then **Open editor**.
3. Paste the files from `widget/` into the matching tabs: `widget.html` → HTML, `widget.css` → CSS, `widget.js` → JS, `fields.json` → FIELDS. Click **Done**.
4. In the widget settings, under **Art**, upload the four PNGs from `art/`:
   - Riding pose → `rat-ride.png`
   - Chilling pose → `rat-idle.png`
   - Air pose → `rat-air.png`
   - Board → `board.png`

   If you skip this, the widget uses a simple built-in cartoon rat.
5. Size the widget to about **1080 × 720** and place it over the bottom of the camera.
6. Use the **Test** buttons in the settings to try each trick.

The overlay is already a browser source in OBS if he uses StreamElements overlays. A new overlay goes in OBS as a Browser Source using its overlay URL.

## Repo layout

```
widget/   the StreamElements widget (HTML, CSS, JS, fields)
art/      rat poses + board, transparent PNGs
preview/  standalone demo page (generated)
tools/    build_preview.py, cutout.py
```

## Development

- Edit the files in `widget/`, then rebuild the demo with `python tools/build_preview.py`.
- New art: make each pose a side view **facing right** with feet at the bottom. Generate the board separately so it can flip on its own.
- AI image tools often paint a fake checkerboard instead of real transparency. `python tools/cutout.py in.jpg art/rat-ride.png` removes it; add `--fill-holes` for solid shapes like the board. Needs `numpy`, `scipy` and `Pillow`.

## How it works

The halfpipe is two quarter-circle ramps joined by a flat. The rat's position is a single distance along that path, and gravity speeds him up or slows him down depending on the slope. He gets "pumped" on the flat to whatever energy the next trick needs. When he passes a coping with speed left over, he launches straight up, does the trick animation for exactly his air time, turns around at the peak and drops back in.
