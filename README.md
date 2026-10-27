# MA Collection — Structured Source Package

This ZIP contains the current saved MA Collection shop-management frontend (version 16) separated into maintainable files. It is a frontend/local-browser app, not a production full-stack deployment.

## Folder structure

```text
MA-Collection-Structured-Source/
├── frontend/                  # Code-only folder: no preview HTML
│   ├── css/styles.css         # Extracted stylesheet
│   └── js/app.js              # Extracted application JavaScript
├── index.html                # Main app entry point (outside frontend/)
├── preview-standalone.html   # Original single-file preview snapshot
├── server.js                 # Tiny Node static server, no dependencies
├── package.json              # start/test scripts
├── tests/syntax-check.cjs    # Syntax and package smoke checks
├── docs/
│   ├── FEATURES.md
│   ├── ARCHITECTURE.md
│   └── BACKEND-ROADMAP.md
├── CHANGELOG.md
└── .gitignore
```

## Run locally

Requirements: Node.js 18 or newer. No npm packages are required.

```bash
npm test
npm start
```

Open `http://127.0.0.1:4173` in a browser. To review the old single-file snapshot, open `preview-standalone.html` directly in the browser.

## Code organization

- `index.html` contains the app shell and references `frontend/css/styles.css` and `frontend/js/app.js`.
- `frontend/css/styles.css` is the stylesheet extracted from the saved HTML.
- `frontend/js/app.js` is the JavaScript extracted from the saved HTML, including render functions, actions, local storage, current-bill controls, receipt/PDF/share logic and local Khata ledger.
- `preview-standalone.html` preserves the complete single-file saved preview for reference; it is deliberately outside `frontend/`.

## Important limitations

- Data is stored in this browser using `localStorage`; it is not shared across devices or users.
- Supabase/PostgreSQL connection, authentication, server-side checkout, and row-level security are not implemented/connected in this package.
- No card payment is charged or processed. Card is just a recorded method in the frontend.
- WhatsApp cannot silently attach a local PDF from a browser. The app downloads the PDF and uses the available share sheet / WhatsApp chat fallback.
- The source retains the UI's existing functionality. The smoke test checks JavaScript syntax and key feature code, not every interactive workflow in a real browser.

Do not use real customer/payment data until a secure backend and access controls are implemented and tested.
