# VaultChain

VaultChain is a full-stack digital asset ownership and verification platform.

It allows users to register digital images, generate cryptographic and perceptual fingerprints, search for duplicate or visually similar assets, protect sensitive assets inside password-protected Vaults, generate verification reports, and transfer registered ownership through a credit-based marketplace.

> VaultChain provides evidence about registered ownership, file fingerprints, and visual similarity. It does not independently prove copyright ownership, original authorship, or absolute authenticity.

---

## Core Workflow

```text
Register / Login
       ↓
Upload Digital Asset
       ↓
SHA-256 + pHash + Metadata
       ↓
Ownership / Duplicate Check
       ↓
Global Verification Search
       ↓
Password-Protected Vault
       ↓
Marketplace Listing
       ↓
Purchase with VaultChain Credits
       ↓
Atomic Ownership Transfer
       ↓
Ownership History
```

---

# Features

## Authentication

* User registration and login
* JWT-based authentication
* Protected frontend routes
* Protected backend API endpoints
* Password hashing with bcrypt
* JWT session identifiers
* Authenticated logout
* User-isolated private data

---

## Digital Asset Library

Users can register and manage digital image assets.

Supported functionality includes:

* Image upload
* Server-backed asset library
* Asset search and filtering
* Grid/list views
* Image preview
* Asset inspection
* Ownership information
* SHA-256 fingerprints
* Perceptual fingerprints
* EXIF/image metadata
* Ownership-transfer history

Supported upload formats include:

* JPG / JPEG
* PNG
* WEBP

Maximum upload size: **20 MB**

Registered assets remain the single source of truth. Adding an asset to a Vault or Marketplace does not create another copy.

---

# SHA-256 Fingerprinting

Every registered image receives a SHA-256 fingerprint.

SHA-256 is used for exact duplicate detection.

```text
Same SHA-256
      ↓
Exact Duplicate
```

An exact match means the two files are byte-for-byte identical.

The SHA-256 fingerprint is stored with the asset and remains unchanged when registered ownership is transferred.

---

# Perceptual Hashing

VaultChain also generates a perceptual image fingerprint using `image-hash`.

The current perceptual hash representation is:

```text
64 hexadecimal characters
=
256 bits
```

VaultChain compares perceptual hashes using bit-level Hamming distance.

Default thresholds:

```text
0 – 6 bits   → Strong Visual Match
7 – 12 bits  → Possible Visual Match
> 12 bits    → No Meaningful Match
```

The thresholds can be configured using:

```env
PHASH_STRONG_MATCH_MAX=6
PHASH_POSSIBLE_MATCH_MAX=12
```

These thresholds are application heuristics and are not proof of authenticity.

---

# Ownership Check

The Asset Library includes an ownership/duplicate checking tool.

A user can upload an image temporarily without registering it.

VaultChain then:

```text
Upload temporary image
        ↓
Generate SHA-256
        ↓
Check exact duplicates
        ↓
Generate pHash
        ↓
Compare registered fingerprints
        ↓
Return ownership/match result
```

Possible results include:

* Exact duplicate
* Strong visual match
* Possible visual match
* No meaningful match

If the match belongs to another account, VaultChain exposes only privacy-safe pseudonymous references such as:

```text
Owner: VC-8F21ABCD
Asset: VC-A000021
```

Private account details are not exposed.

Temporary comparison files are deleted after processing.

---

# Global Verification

Verification performs a deeper system-wide fingerprint search.

Unlike the earlier manual asset-to-image comparison workflow, users no longer need to select an Asset ID.

The user uploads one questioned image and VaultChain searches all eligible registered asset fingerprints.

The verification engine:

1. Generates SHA-256.
2. Generates the 256-bit perceptual fingerprint.
3. Loads registered fingerprint candidates.
4. Checks exact SHA-256 matches.
5. Calculates pHash Hamming distances.
6. Sorts candidates by match quality.
7. Returns up to **5 meaningful best matches**.
8. Saves a verification report.

Ranking prioritizes:

```text
Exact SHA-256 Match
        ↓
Lowest pHash distance
        ↓
Next closest matches
```

Possible classifications:

* Exact Match
* Strong Visual Match
* Possible Visual Match
* No Meaningful Match

Verification reports use references such as:

```text
VR-94BBEA
```

Reports preserve:

* ranked matches
* thresholds used
* perceptual distances
* comparison image information
* timestamps
* safe ownership references

The temporary verification image is deleted after processing.

---

# Verification Privacy

Global fingerprint comparison can internally compare protected/private assets without exposing their contents.

For another user's asset or a protected asset, Verification does **not** expose:

* image preview
* private filename
* raw hashes
* EXIF metadata
* filesystem paths
* Vault information
* email address
* profile information

Only privacy-safe matching evidence and pseudonymous references are returned.

---

# Password-Protected Vaults

Vaults provide an additional application-level access-control layer for sensitive registered assets.

A Vault can contain existing registered assets without duplicating them.

Users can:

* Create multiple Vaults
* Add/remove existing assets
* Set a Vault password
* Unlock Vaults
* Manually lock Vaults
* Change Vault passwords
* Reset Vault passwords using account authentication
* Configure automatic locking
* Delete Vaults without deleting their assets

Vault references use the form:

```text
VT-XXXXXX
```

---

## Vault Security

Vault passwords are never stored in plaintext.

Passwords are hashed using bcrypt.

Unlock access is maintained through temporary server-side grants tied to the authenticated JWT session.

Supported auto-lock durations:

```text
5 minutes
10 minutes
30 minutes
```

Default:

```text
10 minutes
```

When a Vault is locked, protected asset access is blocked at the backend.

This includes:

* Image preview
* Asset content
* Hash details
* Metadata
* Verification access where protected content authorization is required

Direct API requests cannot bypass the frontend lock.

If an asset belongs to multiple protected Vaults, all protecting Vaults must be unlocked before protected content can be accessed.

---

## Vault Unlock Protection

Failed unlock attempts are rate-limited.

Default configuration:

```text
Maximum attempts: 5
Attempt window:   15 minutes
Block duration:   15 minutes
```

Configuration:

```env
VAULT_UNLOCK_MAX_ATTEMPTS=5
VAULT_UNLOCK_WINDOW_SECONDS=900
VAULT_UNLOCK_BLOCK_SECONDS=900
```

Password changes and password resets revoke all active unlock grants for that Vault.

### Important

Vault files are currently **password access-controlled but not encrypted at rest**.

VaultChain therefore uses the terminology:

> Password Protected

and does not claim that Vault files are encrypted.

---

# Marketplace

VaultChain includes an authenticated digital asset marketplace.

Users can:

* Create listings
* Browse listings
* Search listings
* Filter by listing status
* View listing details
* Edit their active listings
* Cancel their listings
* Purchase assets
* View sold/cancelled states

Listings use references such as:

```text
ML-83FA21
```

Marketplace prices use:

```text
VaultChain Credits
```

VaultChain Credits are an internal demonstration credit system and are not cryptocurrency or real-world money.

---

# Marketplace Ownership Transfer

When a Marketplace purchase succeeds, the registered asset itself is transferred rather than duplicated.

The system preserves:

```text
Asset record
File
Asset reference
SHA-256
Perceptual hash
Metadata
```

while changing the registered owner.

A successful purchase performs the important ownership and wallet operations as one database transaction.

Conceptually:

```text
Validate listing
      ↓
Validate seller ownership
      ↓
Validate buyer balance
      ↓
Debit buyer
      ↓
Credit seller
      ↓
Transfer asset ownership
      ↓
Mark listing sold
      ↓
Remove seller Vault memberships
      ↓
Create ownership history
      ↓
Create wallet records
```

If a required transaction step fails, the purchase is rolled back.

---

# Ownership History

Marketplace transfers generate persistent ownership records.

Example:

```text
TX-83B91A
```

Ownership history can include:

* transaction reference
* listing reference
* previous registered owner
* new registered owner
* transfer price
* transfer timestamp

Private account information is replaced by pseudonymous references.

After a successful transfer:

* the asset disappears from the seller's Asset Library
* the asset appears in the buyer's Asset Library
* the original fingerprints remain unchanged
* Ownership Check reports the new registered owner
* previous verification reports remain historical records

Seller Vault memberships are removed and are never transferred to the buyer.

---

# Password-Protected Assets and Marketplace

Assets protected by locked Vaults cannot simply bypass Vault restrictions through Marketplace.

The system applies Vault authorization when appropriate before allowing protected asset content to be exposed.

Vault unlock access is session-bound and is never transferred to a buyer.

---

# Wallet

Each registered account has a VaultChain wallet.

The wallet supports:

* Current VaultChain Credit balance
* Transaction history
* Marketplace purchase records
* Marketplace sale records

Marketplace purchase and sale records share transaction references such as:

```text
TX-83B91A
```

Dashboard wallet statistics use the same persisted wallet balance.

---

# Dashboard

The authenticated dashboard displays real application data, including:

* Registered asset count
* Verification activity
* Vault statistics
* Organized asset count
* Wallet balance
* Recent assets
* Protection status

---

# Privacy & Security

VaultChain currently implements:

* bcrypt password hashing
* JWT authentication
* JWT-specific Vault unlock sessions
* authenticated API routes
* asset ownership authorization
* Vault ownership authorization
* verification-history isolation
* Marketplace ownership checks
* privacy-preserving `404` responses for unauthorized private resources
* pseudonymous public identifiers
* temporary-file cleanup
* Vault unlock rate limiting
* backend-enforced locked content
* transaction-based Marketplace ownership transfer
* cross-account isolation

The API avoids intentionally exposing:

* password hashes
* Vault passwords
* JWTs
* server filesystem paths
* private email addresses through Marketplace/verification results
* raw protected metadata to unauthorized users

---

# Public References

VaultChain uses readable/pseudonymous references instead of exposing every internal database identifier.

Examples:

```text
Owner         VC-8F21ABCD
Asset         VC-A000021
Vault         VT-A83F21
Verification  VR-94BBEA
Listing       ML-83FA21
Transaction   TX-83B91A
```

---

# Tech Stack

## Frontend

* React 19
* Vite
* React Router
* Axios
* Lucide React
* Custom responsive CSS design system

## Backend

* Node.js
* Express
* bcrypt
* JSON Web Tokens
* Multer
* Helmet
* Morgan
* CORS

## Image Processing

* `image-hash`
* `exifr`
* Node.js crypto

## Database

* SQLite

---

# Application Routes

Public:

```text
/
 /login
 /register
```

Authenticated:

```text
/dashboard
/assets
/verification
/vault
/vault/:reference
/wallet
/marketplace
/marketplace/:id
/profile
```

---

# Main API Routes

## Authentication

```http
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

## Assets

```http
POST /api/assets/upload
POST /api/assets/check
GET  /api/assets
GET  /api/assets/:id
GET  /api/assets/:id/content
GET  /api/assets/:id/hash
GET  /api/assets/:id/metadata
GET  /api/assets/:id/ownership-history
```

## Verification

```http
POST /api/verifications
GET  /api/verifications
GET  /api/verifications/:reference
```

## Vaults

```http
POST   /api/vaults
GET    /api/vaults
GET    /api/vaults/:reference
PATCH  /api/vaults/:reference
DELETE /api/vaults/:reference

POST   /api/vaults/:reference/unlock
POST   /api/vaults/:reference/lock

POST   /api/vaults/:reference/change-password
POST   /api/vaults/:reference/reset-password

POST   /api/vaults/:reference/assets
DELETE /api/vaults/:reference/assets/:assetId
```

## Marketplace

```http
POST   /api/marketplace/listings
GET    /api/marketplace/listings
GET    /api/marketplace/listings/:reference
GET    /api/marketplace/listings/:reference/content
PATCH  /api/marketplace/listings/:reference
DELETE /api/marketplace/listings/:reference

POST   /api/marketplace/listings/:reference/purchase
```

## Wallet

```http
GET  /api/wallet
GET  /api/wallet/transactions
POST /api/wallet/transactions
```

## Dashboard

```http
GET /api/dashboard/summary
```

## Health

```http
GET /api/health
```

---

# Project Structure

```text
VaultChain/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── assets/
│   │   │   ├── marketplace/
│   │   │   ├── ui/
│   │   │   ├── vault/
│   │   │   └── verification/
│   │   ├── context/
│   │   ├── layouts/
│   │   ├── pages/
│   │   │   ├── assets/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── landing/
│   │   │   ├── marketplace/
│   │   │   ├── vault/
│   │   │   ├── verification/
│   │   │   └── wallet/
│   │   ├── services/
│   │   └── styles/
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── database/
│   │   ├── middleware/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── services/
│   │   └── uploads/
│   ├── tests/
│   └── package.json
│
└── package.json
```

---

# Run Locally

## 1. Clone the repository

```bash
git clone https://github.com/itsnotTalha/SE-Lab-Project.git
cd SE-Lab-Project/VaultChain
```

## 2. Install dependencies

The project uses npm workspaces.

```bash
npm install
```

## 3. Configure environment

Create the appropriate `.env` configuration for local development.

At minimum, use a strong JWT secret outside of source control:

```env
JWT_SECRET=replace-with-a-strong-secret
```

Optional matching configuration:

```env
PHASH_STRONG_MATCH_MAX=6
PHASH_POSSIBLE_MATCH_MAX=12
```

Optional Vault security configuration:

```env
VAULT_UNLOCK_MAX_ATTEMPTS=5
VAULT_UNLOCK_WINDOW_SECONDS=900
VAULT_UNLOCK_BLOCK_SECONDS=900
```

Optional API port:

```env
PORT=3000
```

Do not commit production secrets.

## 4. Start frontend and backend

From the `VaultChain` directory:

```bash
npm run dev
```

Default development addresses:

```text
Frontend: http://localhost:5173
API:      http://localhost:3000/api
```

---

# Testing

Run server tests:

```bash
npm test --workspace=server
```

Build the frontend:

```bash
npm run build --workspace=client
```

Preview the production frontend build:

```bash
npm run preview --workspace=client
```

---

# Current Limitations

VaultChain is currently designed for a university/software-engineering project and small-scale deployment.

Known limitations include:

* SQLite is suitable for the current project scale but is not intended for large distributed deployments.
* Global perceptual matching currently performs a linear fingerprint scan.
* pHash thresholds are heuristics rather than scientific authenticity guarantees.
* Vault files are password access-controlled but are **not encrypted at rest**.
* Verification does not prove authorship, copyright ownership, or absolute authenticity.
* Metadata extraction depends on information retained in the uploaded file.
* Verification comparison images are intentionally temporary and are not persisted.
* Vault password recovery depends on existing account-password authentication.
* Vault unlock rate limiting is account/Vault based rather than IP based.
* VaultChain Credits are demonstration credits, not cryptocurrency or real-world currency.
* Wallet balances currently use the existing SQLite numeric representation rather than integer minor units.
* SQLite transaction coordination is intended for the current single-instance architecture.
* Documents/OCR, notifications, richer profile management, and advanced activity analytics are not yet complete.

---

# Planned Improvements

Potential future work:

* Notifications and unified activity feed
* Richer dashboard analytics
* Documents and OCR workflows
* Improved profile/settings functionality
* Pagination for large asset/Vault/Marketplace collections
* Indexed or approximate perceptual-hash search
* Stronger production database architecture
* Integer-based wallet accounting
* Optional encryption-at-rest for Vault content
* Advanced forensic image analysis
* Improved audit/activity logs
* Report export

---

# Important Disclaimer

VaultChain should not be interpreted as a legal copyright registry or a system that mathematically proves image authenticity.

It records and compares technical evidence such as:

* registration history
* SHA-256 fingerprints
* perceptual fingerprints
* metadata
* registered ownership
* ownership transfers

Results should therefore be described using evidence-based terminology such as:

```text
Exact Match
Strong Visual Match
Possible Visual Match
No Meaningful Match
Registered Owner
```

rather than unsupported claims such as:

```text
Authentic
Fake
Original Creator
Copyright Proven
```

---

# Project Status

The main VaultChain workflow is currently functional:

```text
Authentication                    ✅
Asset registration                ✅
SHA-256 fingerprinting            ✅
Perceptual hashing                ✅
Metadata extraction               ✅
Duplicate / ownership checking    ✅
Global best-match Verification    ✅
Verification history              ✅
Password-protected Vaults         ✅
Vault unlock rate limiting        ✅
Vault password management         ✅
Wallet                            ✅
Marketplace listings              ✅
Marketplace purchases             ✅
Atomic ownership transfer         ✅
Ownership history                 ✅
Responsive frontend               ✅

Documents / OCR                    🚧
Notifications / activity feed     🚧
Advanced profile/settings         🚧
Production-scale infrastructure   🚧
```

---

**VaultChain — Own it. Verify it. Protect it.**
