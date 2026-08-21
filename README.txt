HANDCAPTION V6 + V7 + V8 — COMPLETE SECURITY BUILD

This package combines:
V6: security/privacy foundation
V7: professional photo editing
V8: advanced caption layers + local video export where browser support exists

Replace only:
- index.html
- style.css
- app.js

V6 SECURITY
- CSP meta policy
- no external scripts/dependencies
- safe DOM rendering for pack names
- defensive local storage migration
- media MIME allowlist
- image limit 15 MB
- video limit 100 MB
- caption/pack name limits
- object URL cleanup
- local-only processing

V7 PHOTO EDITOR
- multiple caption layers
- drag positioning
- size
- color
- opacity
- rotation
- letter spacing
- shadow
- duplicate layer
- undo/redo
- layer selector

V8 VIDEO
- local video preview
- handwriting overlays
- local browser recording via MediaRecorder when supported
- WebM export when supported
- no server upload

IMPORTANT LIMITATIONS
- localStorage is not encrypted.
- GitHub Pages cannot give this app arbitrary server response security headers, so the CSP meta policy is not equivalent to a server-delivered CSP.
- Browser support for MediaRecorder/captureStream differs by Android browser.
- Video export currently targets WebM where supported; MP4/H.264 export is not guaranteed in a normal browser.
- Do not claim 100% security.
- Keep a backup of V5/V6 before deploying.

TEST AFTER DEPLOYMENT
1. Create a 62-character pack.
2. Save it.
3. Refresh and confirm it remains.
4. Edit/delete/use packs.
5. Upload a small photo.
6. Add multiple captions.
7. Test drag/resize/rotation/opacity/shadow/undo/redo.
8. Upload a small video.
9. Test local preview and export on the Android browser.
10. Confirm media is not being sent to any server.
