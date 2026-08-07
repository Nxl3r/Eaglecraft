# Eaglecraft

Browser-based voxel client (Eaglecraft) — minimal scaffold with pointer lock, mobile controls, username & PNG skin support, and a simple WebSocket-based multiplayer relay server.

Quickstart

1. Install dependencies:

   npm install

2. Run the dev server:

   npm start

3. Open http://localhost:3000 in your browser.

What is included

- public/: client files (index.html, styles, main.js)
- server/server.js: simple express static server + WebSocket relay

Notes

- This scaffold implements a custom multiplayer protocol (WebSocket relay). To join multiplayer servers, use ws:// or wss:// addresses of Eaglecraft-compatible servers.
- Skins are uploaded as PNG and applied to the local player; skin data is sent to other clients so peers can render each other.
- Pointer Lock API is used on desktop. iOS Safari does not support pointer lock; touch controls are provided as a fallback.

Next steps I can take

- Improve world rendering with greedy meshing and chunking.
- Add collision, block placing/breaking, and better mobile UI.
- Add interpolation/prediction and bandwidth optimization for multiplayer.

