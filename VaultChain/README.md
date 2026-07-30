# VaultChain

VaultChain is a full-stack web app for managing digital assets, user vaults, and related account activity. The current build now covers authentication, the first protected user experience, and authenticated asset uploads.

## What is implemented now

- React client with routed pages for login, registration, dashboard, assets, and profile.
- Protected routing based on a stored JWT token.
- Express API with health, authentication, and dashboard endpoints:
  - `/api/health`
  - `/api/auth/register`
  - `/api/auth/login`
  - `/api/auth/me`
  - `/api/assets/upload`
  - `/api/dashboard/summary`
- SQLite database initialization with tables for users, wallets, assets, documents, verification reports, marketplace listings, vault items, and notifications.
- Registration creates a user and wallet together, and login returns a JWT plus basic user data.
- The authenticated user endpoint returns the signed-in user's profile without exposing the password hash.
- The dashboard summary endpoint returns real counts from SQLite for assets, verification reports, vault items, and wallet balance.
- The asset upload endpoint is protected by the existing JWT middleware, accepts jpg/jpeg/png/webp files up to 20 MB, stores uploads in `server/src/uploads/`, and persists asset metadata in SQLite.

## Current progress

The app is beyond the initial skeleton stage, and the core authentication, dashboard, and asset upload foundation are now working. Most of the broader product features are still planned, but the backend and routing layers are in place for continued expansion.

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

- Expand the dashboard with richer analytics and recent activity views.
- Replace placeholder profile pages with working features.
- Add authenticated API routes for verification, vault management, and wallet activity.
