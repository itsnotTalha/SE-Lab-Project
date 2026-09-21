# VaultChain

VaultChain is a full-stack web app for managing digital assets, user vaults, and related account activity. The current build covers authentication, the first protected user experience, authenticated asset uploads, SHA-256 hashing for uploaded assets, pHash generation for uploaded images, image metadata extraction, and the complete Marketplace with Fractional Ownership module: listing, purchasing, transferring and auctioning assets with verified provenance, plus splitting assets into shares for transparent co-ownership.

## What is implemented now

- React client with routed pages for login, registration, dashboard, assets, and profile.
- Protected routing based on a stored JWT token.
- Express API with health, authentication, and dashboard endpoints:
  - `/api/health`
  - `/api/auth/register`
  - `/api/auth/login`
  - `/api/auth/me`
  - `/api/assets/upload`
  - `/api/assets/:id/metadata`
  - `/api/assets/:id/hash`
  - `/api/dashboard/summary`
  - `/api/wallet`, `/api/wallet/transactions`
  - `/api/marketplace/listings` (browse, create, detail, edit, remove, buy)
  - `/api/marketplace/listings/mine`, `/api/marketplace/listable-assets`, `/api/marketplace/trades`
  - `/api/marketplace/listings/:id/bids` (place a bid, bid history), `/api/marketplace/listings/:id/cancel`
  - `/api/marketplace/assets/:assetId/fractionalize`, `/api/marketplace/assets/:assetId/shares`
  - `/api/ownership/history/:assetId`
  - `/api/blockchain/blocks`, `/api/blockchain/assets/:assetId`, `/api/blockchain/verify`
- SQLite database initialization with tables for users, wallets, assets, documents, verification reports, marketplace listings, vault items, and notifications.
- Registration creates a user and wallet together, and login returns a JWT plus basic user data.
- The authenticated user endpoint returns the signed-in user's profile without exposing the password hash.
- The dashboard summary endpoint returns real counts from SQLite for assets, verification reports, vault items, and wallet balance.
- The asset upload endpoint is protected by the existing JWT middleware, accepts jpg/jpeg/png/webp files up to 20 MB, stores uploads in `server/src/uploads/`, persists asset metadata in SQLite, and generates a SHA-256 hash for each uploaded file.
- The generated SHA-256 hash is stored in the `asset_hashes` table and returned in the upload response.
- The upload flow also generates a perceptual hash with `image-hash`, stores it in the existing `asset_hashes` row, blocks duplicate image uploads before persistence, and exposes both hashes through `GET /api/assets/:id/hash`.
- The upload flow also extracts available EXIF metadata with `exifr`, stores width, height, camera, location, created date, and the raw metadata JSON in `asset_metadata`, and exposes it through `GET /api/assets/:id/metadata`.
- The marketplace lets an owner list an asset at a fixed price, and lets any other signed-in user buy it with their wallet balance. Browse supports search, price and category filters, sorting, and paging, and the listing page shows the asset's verification result, hashes, metadata, ownership timeline, and ledger blocks.
- A purchase is settled in one database transaction: both wallet balances, both wallet ledger rows, the asset's owner, the ownership history entry, the blockchain block, and the listing status are written together or not at all. Two buyers racing for the same listing produce exactly one sale, and the other buyer is never charged.
- Ownership changes are recorded in `ownership_history` and appended to a hash-chained ledger in `blockchain_blocks`, which `GET /api/blockchain/verify` re-checks block by block.
- Assets can be auctioned with a starting price, an optional reserve, a bid increment and an end time. Placing a bid commits the money: the amount is held from the bidder's wallet and returned the moment they are outbid, so an auction can never close on a winner who can no longer pay. When the time is up, the auction settles to the highest bid that meets the reserve; if none does, every held bid is returned and the listing closes unsold.
- An asset can be split into shares for transparent co-ownership. Shareholders offer blocks of shares at a price per share, several co-owners can be selling at once, and the share register shows who holds what percentage. While anyone else holds shares the asset cannot be sold whole, and a holder who acquires every share becomes its owner of record again.
- `purchase`, `sale`, `bid_hold` and `bid_release` wallet entries can only be created by the marketplace, so a user cannot credit themselves a sale or a refund that never happened.

## Current progress

The app is beyond the initial skeleton stage. Authentication, the dashboard, asset upload with hashing, duplicate protection and metadata, the wallet, and the full Marketplace with Fractional Ownership module (list, browse, buy, auction, split into shares, transfer ownership, ledger) are working. Verification reports, documents and OCR, and the encrypted vault are still planned.

## Tests

```bash
npm test
```

Runs `tests/marketplace.test.js` and `tests/auctions-fractional.test.js` with Node's built-in test runner against a temporary SQLite file, so they need no extra dependencies and never touch the development database. 53 tests cover the listing rules, the verification gate, browse and paging, the full purchase settlement, the concurrent-buyer race, rollback when a mid-settlement step fails, the wallet restrictions, ledger tamper detection, bidding and fund holds, auction settlement with and without a reserve, splitting assets, share trading, and the co-ownership rules.

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

- Build the Verification module so verification reports exist; the marketplace already reads them and can be switched to require a passing report by setting `REQUIRE_VERIFIED_LISTINGS=true`.
- Serve asset image previews so marketplace listings are not text-only.
- Close auctions on a schedule rather than when the marketplace is next read.
- Expand the dashboard with richer analytics and recent activity views.
- Replace placeholder profile pages with working features.
- Add authenticated API routes for document verification and vault management.
