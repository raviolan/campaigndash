Enemy Generator - Local & Optional Backend

Overview

This site includes an Enemy/Boss generator tool under `05_Tools & Tables/Enemy Generator.html`.

Two usage modes are supported:

1) No-backend (default, no terminal commands required)
   - When you "Save as Page", the site will download the generated enemy as an HTML file to your browser.
   - The generator also stores a lightweight index in your browser's `localStorage` so the left navigation shows a "Saved Enemies" list for quick access on that machine and browser.
   - To make a saved enemy permanently available to the site (accessible to all machines), move the downloaded HTML file into the repository folder:
     `05_Tools & Tables/Enemy Generator/`
   - After you move the file, the saved page will be accessible within the site UI. If your static server caches directory listings you may need to restart or refresh the static server to pick up new files.

2) Optional backend (recommended for seamless saving)
   - A small Express backend is included at `server/index.js`. Run it only if you want the site to write files directly into the repository from the browser.
   - When the backend is running, the "Save as Page" flow will POST the page to the backend which writes an HTML file into `05_Tools & Tables/Enemy Generator/` automatically and the UI will show the saved file in the left nav.

Running the backend (optional)

If you want automatic saving from the browser, start the backend. You only need to do this if you want in-browser writes; manual download + move still works without running anything.

From the site root, run:

```bash
npm run backend
```

This starts the backend on port 4000 and exposes two endpoints:
- `POST /api/save-enemy` — accepts `{ pageName, html }` and writes an HTML file into the `Enemy Generator` folder.
- `GET /api/enemies` — returns a list of saved HTML pages in that folder.

Security & Notes
- The simple backend provided is intended for local personal use only. It enables CORS for convenience and writes files into the repository folder — do not expose it publicly.
- For multi-user or hosted setups, secure the endpoint with authentication and stricter CORS, or implement a proper CMS/commit workflow.
- LocalStorage only persists on the browser where you save the enemy. If you clear site data, that local list will be lost — moving the downloaded HTML into the folder is the persistent option.

If you'd like, I can:
- Add delete / rename endpoints and UI controls.
- Add overwrite confirmation and filename validation on the backend.
- Help you set up a small systemd / launchd service to run the backend automatically on boot (if you do want the backend running all the time).

What I implemented
- Express server at `server/index.js` (optional).
- Frontend fallback: if backend is unavailable, save downloads and the item gets listed in the left nav via `localStorage`.
- `npm run backend` script to start the server.

