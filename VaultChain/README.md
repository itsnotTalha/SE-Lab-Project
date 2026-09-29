# VaultChain

## Admin control center

VaultChain includes a role-protected admin workspace at `/admin/dashboard` with revenue, marketplace, transaction, user, asset, verification, growth, security, audit-log, and platform-settings views.

To grant an existing account access, run this from the repository root:

```bash
npm run promote-admin --workspace=server -- admin@example.com SUPER_ADMIN
```

Supported admin roles are `SUPER_ADMIN`, `MODERATOR`, `FINANCE_ADMIN`, and `VERIFICATION_ADMIN`. The default marketplace commission is 5% and is stored in `platform_settings` under `marketplace_commission_rate`.

VaultChain is a full-stack web app for registering digital assets, organizing them in private Vaults, and comparing image fingerprints. The current build covers authentication, protected asset uploads and previews, SHA-256 and perceptual hashing, image metadata extraction, verification reports, and private organizational collections.

## What is implemented now

- React client with routed pages for login, registration, dashboard, assets, verification, Vaults, and profile.
- Protected routing based on a stored JWT token.
- Express API with health, authentication, and dashboard endpoints:
  - `/api/health`
  - `/api/auth/register`
  - `/api/auth/login`
  - `/api/auth/me`
  - `/api/auth/logout`
  - `/api/assets/upload`
  - `/api/assets/check`
  - `/api/assets`
  - `/api/assets/:id`
  - `/api/assets/:id/content`
  - `/api/assets/:id/metadata`
  - `/api/assets/:id/hash`
  - `/api/verifications`
  - `/api/verifications/:reference`
  - `/api/vaults`
  - `/api/vaults/:reference`
  - `/api/vaults/:reference/assets`
  - `/api/vaults/:reference/assets/:assetId`
  - `/api/dashboard/summary`
- SQLite database initialization includes owner-scoped Vault collections and an asset-membership join table; the registered asset record and stored file remain the single source of truth.
- Registration creates a user and wallet together, and login returns a JWT plus basic user data.
- The authenticated user endpoint returns the signed-in user's profile without exposing the password hash.
- The dashboard summary endpoint returns real counts from SQLite for assets, verification reports, Vaults, organized assets, and wallet balance.
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
- Vault routes require JWT authentication, expose only the signed-in user's collections, use privacy-safe `VT-XXXXXX` references, and reject attempts to add another user's assets.
- Adding to or removing from a Vault only changes collection membership. Deleting a Vault does not delete registered assets, their stored files, hashes, metadata, or verification history.
- New Vaults require a password stored only as a bcrypt hash. Unlock grants are stored server-side against a SHA-256 fingerprint of the exact JWT and expire using the Vault's 5, 10, or 30 minute setting (`VAULT_UNLOCK_TTL_SECONDS` can provide a server override).
- Protected asset content, hashes, metadata, and new Verification comparisons require every password-protected Vault containing the asset to be unlocked for the current JWT. Manual lock, timeout, and authenticated logout revoke access without claiming file encryption.
- Vaults support 5, 10, or 30 minute auto-lock settings. Unlock failures are rate-limited per user and Vault using `VAULT_UNLOCK_MAX_ATTEMPTS`, `VAULT_UNLOCK_WINDOW_SECONDS`, and `VAULT_UNLOCK_BLOCK_SECONDS`.
- Password changes require the current Vault password; password resets require the authenticated user's account password. Both replace the bcrypt hash and revoke every active unlock grant for that Vault.

## Current progress

The core authentication, dashboard, asset library, hashing, duplicate protection, metadata, verification, and organizational Vault workflows are working. Document upload, OCR, metadata fingerprints, and integrity/comparison reports are implemented; see Documents below.

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
- Add richer wallet activity.

## Documents

The document workflow integrates metadata and comparison reporting from the `document` branch. Upload PDF, PNG, or JPEG files (20 MB maximum) from **Documents**. Images remain in the document library and receive OCR (automatic local-first selection, with Gemini for unclear images when configured). The **Text** action displays the original alongside extracted, page-separated text; **Verify** checks storage integrity or compares another document in your library. Reports are saved per owner.

Install Poppler on the API host (`sudo apt-get install poppler-utils` on Ubuntu/Debian) for `pdfinfo`, `pdftotext`, and `pdftoppm`. English Tesseract data is bundled through the existing npm dependency; local processing requires no external OCR API. Embedded PDF text is extracted directly with layout spacing. Image-only pages, including those inside mixed PDFs, use local OCR. PDFs support up to 200 pages, with at most 10 image-only/blank pages per OCR run. OCR failures retain the original file and expose a retry action.

The original viewer preserves exact appearance. Extracted text cannot guarantee identical typography, diagrams, tables, or perfect recognition. Local scanned OCR currently supports English; other embedded PDF text can still be extracted.

Verification records separate SHA-256 fingerprints:

- File: all original bytes, including embedded PDF/image metadata.
- Text: Unicode-normalized text with whitespace collapsed, preserving case and punctuation. Text similarity is a word-overlap heuristic, not proof of authenticity.
- Upload metadata: a versioned JSON representation of name, description, category, MIME type, and size in fixed key order. OCR results and server storage paths are excluded.

Verification re-reads stored bytes and compares metadata against the upload baseline. Existing documents without a metadata baseline show that check as unavailable. An identical text hash with different file bytes is reported as a changed file, and both versions can be retained for comparison. Exact duplicate files are blocked within the same owner's library; other users' records are not exposed. These database-held baselines detect changes relative to registration, not independent proof of authorship.

Authenticated API additions: `POST /api/documents/:id/verify` with optional JSON `{ "targetDocumentId": 123 }`, and `GET /api/documents/:id/report` for the latest report. Database additions migrate automatically at server startup. Vault encryption and document marketplace behavior from the source branch are outside this integration.

## Marketplace seller identity and preview requests

New listings show the seller's account name on cards, listing details, and purchase confirmation. Select **Post anonymously (hide my name)** when creating or editing a listing to replace the name with **Anonymous seller**. Anonymous marketplace responses omit both the name and the seller reference. Existing listings remain anonymous after migration until their seller changes this setting.

Assets listed while in a Vault require buyer-specific preview approval. Buyers open the listing and choose **Request preview**. Sellers open **My Listings → Manage listing → Preview requests** to approve, decline, or revoke access. Pending request counts appear on the seller's listing cards. Use **Refresh status** to retrieve the latest decision or incoming requests.

The seller must unlock every protecting Vault before approving a request. Approval shares only that listing's preview with that buyer; it does not unlock the Vault or grant asset ownership. Approved previews remain available if the seller locks the Vault again, until revoked or the listing is cancelled/sold. Removing a Vault does not make previews public for a listing originally created from it. New listings require new approvals. Marketplace preview responses use `Cache-Control: private, no-store`.

Migrations run automatically on backend startup. The authenticated preview API uses `POST /api/marketplace/listings/:reference/preview-requests` for requests, seller-only `GET` on that path for the inbox, and seller-only `PATCH .../preview-requests/:requestId` with `{ "status": "approved" }`, `"denied"`, or `"revoked"` for decisions.


### Handwritten image transcription with Gemini

Set `GEMINI_API_KEY` in `server/.env` and restart the API. A blank-key file is provided locally; `server/.env.example` is the shareable template. Existing environment variables take precedence, followed by `server/.env`, then the project `.env`.

Upload a PNG/JPEG from **Upload → Document** or **Documents**. When local image recognition is unclear or fails and a key is configured, `geminiOcrService` sends the image to Google's Gemini API solely for Bengali/English transcription. Review the result under **Text**; existing documents can use **Rerun OCR**. File and metadata fingerprints remain separate; the text fingerprint is regenerated from the transcription.

- `GEMINI_MODEL`: primary model, default `gemini-3.5-flash`.
- `GEMINI_FALLBACK_MODELS`: comma-separated fallback models (default `gemini-flash-latest`; empty disables fallback). Up to three unique models are attempted for 404/429/500/503 responses.
- `GEMINI_OCR_TIMEOUT_MS`: shared request deadline, default 45000 ms, allowed range 1000–120000.
- `ENABLE_GEMINI_TESTS`: live calls are disabled in tests unless explicitly set to `true` or `1`. Service tests mock requests and never send files to Google.

Gemini images are limited to 14 MB to leave room for base64 encoding in the inline request. PDFs, including scanned pages, retain the local Poppler/Tesseract flow. Without a key, image OCR also stays local. If online OCR fails, available local text is kept with a visible review warning; if no local text is available, OCR is marked failed for retry. No numeric Gemini confidence is reported because the API does not provide an OCR confidence measurement. Transcription can contain errors; review unclear handwriting against the original.

Request format reference: [Google Gemini image understanding](https://ai.google.dev/gemini-api/docs/generate-content/image-understanding).


Auto OCR first runs local Tesseract on uploaded images. Text with confidence of at least 80/100 and sufficient letters/numbers stays local. Empty, low-confidence, or punctuation-heavy results trigger Gemini when configured. This is a recognition-quality heuristic, not a definitive handwriting detector; clear handwriting can stay local and difficult printed text can go online. PDF processing remains local. The selected method, selection reason, and any fallback warning are saved with the OCR result and displayed under **Text**. Existing results acquire this information on **Rerun OCR**.
