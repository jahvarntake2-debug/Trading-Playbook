# Trading-Playbook

A private/local trading journal and performance dashboard built with React, Vite, Tailwind CSS, and a simple local API for auth and per-user persistence.

## Features

- Trading journal entry form with P&L tracking
- Dashboard analytics and charts
- Position sizing calculator
- Tradovate-style sandbox flow
- Per-user authentication and local persistence
- Ready for deployment as a single Node service

## Local development

```bash
npm install
npm run dev
```

The app runs on http://localhost:5173 and the API runs on http://localhost:3001.

## Production deploy

```bash
npm install
npm run build
npm start
```

This project is set up to serve the built frontend and API from one Express app for deployment on Render or similar hosting platforms.
