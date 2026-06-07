# Cosmic Voyage Next.js + Three.js

A mobile-first 9:16 Cosmic Voyage drag-and-drop scene built with Next.js, React, and Three.js.

## Features

- 9:16 mobile-friendly layout
- Alien cat starts on the right side
- 3D-style arrow points at the alien cat
- Drag alien cat into the cosmic boat
- Cat lands at the front of the boat
- Retro pastel loading popup inspired by your reference image
- 3 second loading sequence with progress bar and percentage
- Terminal-style mission popup with a Close button
- Close button resets the whole scene back to the start
- Antialiasing, high pixel ratio, tone mapping, and higher-detail geometries for smoother Three.js visuals

## Run locally

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Adding `.glb` models

Place `.glb` files in:

```text
public/models
```

For sharp models, keep renderer antialiasing enabled, use high-quality GLB meshes/textures, and avoid exporting models with overly reduced polygon counts.
