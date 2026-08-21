HANDCAPTION V9 — PROPER BUILD

This V9 is rebuilt from the working V8 page structure rather than replacing the whole application with a different layout.

V9 HANDWRITING
- One character at a time: A-Z, a-z, 0-9.
- Large Android-friendly writing board.
- Faint/translucent guide character.
- Guide is never stored in the glyph image.
- Redraw current character.
- Back / Next navigation.
- 1/62 progress.
- Character checklist for direct correction.
- Save is enabled only after all 62 characters are written.
- Existing complete packs from older localStorage versions are migrated.

V9 EDITOR
- Add/delete uploaded media.
- Current media can be removed and another file added.
- Multiple caption layers.
- Caption color.
- Caption rotation.
- Caption size.
- Caption animations: none, fade, slide, pop, write-on.
- Animation duration.
- Drag captions on photos.
- Local photo PNG export.
- Local video preview and WebM export where Android browser APIs support it.

SECURITY
- Local-only media processing.
- File MIME allowlist.
- Image 15 MB limit.
- Video 100 MB limit.
- Caption and pack-name limits.
- Safe DOM rendering for pack names.
- CSP meta policy.
- No external JavaScript dependencies.
- Temporary object URL cleanup.
- localStorage is not encrypted.
- GitHub Pages cannot provide arbitrary custom server response headers, so the meta CSP is not equivalent to a server-delivered CSP.
- Do not claim 100% security.

DEPLOY
Replace only:
index.html
style.css
app.js

Keep your working V8 backup.

TEST
1. Create a new pack.
2. Write A, then B, then navigate back to A and rewrite it.
3. Complete all 62.
4. Save.
5. Refresh and confirm pack remains.
6. Upload a photo.
7. Add, rotate, recolor and animate a caption.
8. Delete the file and add another.
9. Upload a short video and test preview/export.


V9.1 FIX
The Android code editor was displaying TypeScript ts(7044) and ts(6133)
diagnostics for ordinary JavaScript callback parameters/unused helper functions.
These are editor diagnostics, not browser runtime errors.

V9.1 adds `// @ts-nocheck` to app.js so JavaScript is not incorrectly blocked by
the editor's TypeScript checker. Browser execution is unchanged.

Node syntax check: PASS


V9.2 WRITING FIX
- A character is no longer considered finished when the finger is lifted.
- Multiple strokes are allowed on the same character.
- Lifting and touching again keeps all previous strokes.
- The character is captured/saved only when the user presses Next.
- Pointer capture is released safely after each stroke.
- Android touch-action is explicitly disabled on the writing canvas to reduce scrolling/gesture interruptions.
