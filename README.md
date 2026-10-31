# NEXUS — one combined website

This deploy folder contains the cinematic intro at `/` and the main website at `/nexus-vr/`.

## Visitor flow
1. Open the domain: the NEXUS intro animation plays.
2. Click **Portfolio**: opens `/nexus-vr/index.html?entered=1`.
3. The main site recognizes `entered=1` and does not replay its internal intro gate.

## Deploy
Deploy the contents of this folder as the project root on a static host such as Vercel.
Do not deploy the parent workspace ZIP or the `archive`, `review`, `uploads`, or `tools` folders.

The intro is the editable source version (`index.html`, `app.js`, `styles.css` plus local assets and GSAP).
