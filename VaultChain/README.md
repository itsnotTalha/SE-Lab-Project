# VaultChain

VaultChain is a full-stack web app for managing digital assets, user vaults, and related account activity. The current build now covers authentication, the first protected user experience, authenticated asset uploads, SHA-256 hashing for uploaded assets, pHash generation for uploaded images, and image metadata extraction.

## What is implemented now

- React client with routed pages for login, registration, dashboard, assets, and profile.
- Protected routing based on a stored JWT token.
- Express API with health, authentication, and dashboard endpoints:
  - `/api/health`
  - `/api/auth/register`
  - `/api/auth/login`
  - `/api/auth/me`
  - `/api/assets/upload`
  - `/api/assets/check`
  - `/api/assets`
  - `/api/assets/:id`
  - `/api/assets/:id/content`
  - `/api/assets/:id/metadata`
  - `/api/assets/:id/hash`
  - `/api/verifications`
  - `/api/verifications/:reference`
  - `/api/dashboard/summary`
- SQLite database initialization with tables for users, wallets, assets, documents, verification reports, marketplace listings, vault items, and notifications.
- Registration creates a user and wallet together, and login returns a JWT plus basic user data.
- The authenticated user endpoint returns the signed-in user's profile without exposing the password hash.
- The dashboard summary endpoint returns real counts from SQLite for assets, verification reports, vault items, and wallet balance.
- The asset upload endpoint is protected by the existing JWT middleware, accepts jpg/jpeg/png/webp files up to 20 MB, stores uploads in `server/src/uploads/`, persists asset metadata in SQLite, and generates a SHA-256 hash for each uploaded file.
- The generated SHA-256 hash is stored in the `asset_hashes` table and returned in the upload response.
- The upload flow also generates a perceptual hash with `image-hash`, stores it in the existing `asset_hashes` row, blocks duplicate image uploads before persistence, and exposes both hashes through `GET /api/assets/:id/hash`.
- The upload flow also extracts available EXIF metadata with `exifr`, stores width, height, camera, location, created date, and the raw metadata JSON in `asset_metadata`, and exposes it through `GET /api/assets/:id/metadata`.
- The authenticated asset library lists only the signed-in user's assets, and asset detail, content, hash, and metadata lookups all enforce the same ownership boundary.
- The authenticated ownership check temporarily processes an image without creating an asset, checks SHA-256 first and then compares the existing perceptual-hash signature by bit-level Hamming distance, deletes the temporary file, and returns only a pseudonymous owner reference for cross-account matches.
- Perceptual matching defaults to a strong-match maximum of 6 bits and a possible-match maximum of 12 bits. These can be tuned with `PHASH_STRONG_MATCH_MAX` and `PHASH_POSSIBLE_MATCH_MAX`; they are application heuristics, not authenticity guarantees.
- The current closest-match scan is intentionally linear for the small SQLite dataset and should be replaced with an indexed or approximate search strategy if asset volume grows substantially.
- Asset cards and the inspector offer authenticated image previews through the existing owner-protected content endpoint.
- Verification compares one temporarily uploaded image against one selected asset owned by the authenticated user, saves fingerprint thresholds and privacy-safe metadata evidence in the existing `verification_reports` table, and exposes owner-isolated report history through pseudonymous `VR-XXXXXX` references.

## Current progress

The app is beyond the initial skeleton stage, and the core authentication, dashboard, asset upload, hashing, duplicate protection, and image metadata foundation are now working. Most of the broader product features are still planned, but the backend and routing layers are in place for continued expansion.

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
- Add authenticated API routes for vault management and richer wallet activity.
