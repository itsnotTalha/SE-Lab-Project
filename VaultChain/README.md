# VaultChain

VaultChain is a full-stack web app for managing digital assets, user vaults, and related account activity. The current build focuses on authentication and the first protected user experience.

## What is implemented now

- React client with routed pages for login, registration, dashboard, assets, and profile.
- Protected routing based on a stored JWT token.
- Express API with `/api/health` and `/api/auth/register` and `/api/auth/login`.
- SQLite database initialization with tables for users, wallets, assets, documents, verification, marketplace, vault items, and notifications.
- Registration creates a user and wallet together, and login returns a JWT plus basic user data.

## Current progress

The app is beyond the initial skeleton stage, but most product areas are still placeholders. Authentication is working end to end, the database schema is in place, and the remaining pages are ready to be expanded into real dashboard, asset, and profile flows.

## Tech Stack

- Frontend: React, Vite, React Router
- Backend: Node.js, Express
- Database: SQLite
- Auth: bcrypt, JSON Web Tokens

## Run Locally

Install dependencies in the root, client, and server workspaces, then start the frontend and backend separately.

```bash
npm install
cd client && npm install
cd ../server && npm install
```

```bash
cd server && npm run dev
cd client && npm run dev
```

## Project Structure

- `client/` contains the React app and page routes.
- `server/` contains the API, auth service, middleware, and database setup.
- `docs/` contains supporting project material.

## Next Steps

- Build out the dashboard with real user data.
- Replace placeholder assets and profile pages with working features.
- Add authenticated API routes for assets, wallet activity, and vault management.
