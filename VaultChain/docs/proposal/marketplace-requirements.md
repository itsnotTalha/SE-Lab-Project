# VaultChain — Marketplace Module Requirements

| | |
|---|---|
| **Module** | Marketplace (with the Wallet and Ownership Transfer hooks it depends on) |
| **Project** | VaultChain — digital asset authentication, ownership, and trading |
| **Document type** | Software Requirements Specification (module scope) |
| **Status** | v2 — updated after the module was implemented |
| **Sources** | Project proposal slide 7/13, "Marketplace with Fractional Ownership"; repository state on branch `login_signup` |

> **Traceability note.** The proposal defines this module as **Marketplace with Fractional
> Ownership**, covering: *List Asset, Purchase Asset, Transfer Asset, Verified Provenance* under
> Asset Management, and *Asset Auction* (create auctions, set rules, enable fair bidding) plus
> *Fractional Ownership* (split an asset into shares, manage co-ownership transparently) under
> Advanced Features. All six are implemented.
>
> This corrects an earlier draft of this document. `api.txt` listed auctions, bidding and
> fractional ownership under "Future Enhancements", so v1 of this spec treated them as
> out of scope. The proposal puts them **inside** the module, so they are in scope and built.

---

## 1. Introduction

### 1.1 Purpose
Define what the VaultChain Marketplace must do: let verified asset owners list digital
assets for sale, let other users discover and buy them, and settle the trade with money
(wallet) and ownership (ledger) moving together or not at all.

### 1.2 Why the marketplace exists
VaultChain proves a digital asset is authentic (SHA-256, pHash, metadata, verification
reports) and records who owns it (blockchain ledger, ownership history). Authenticity and
ownership only become valuable when the asset can be traded with confidence. The
marketplace is where the other modules pay off: a buyer sees proof of originality before
paying, and the sale leaves a tamper-evident ownership trail.

### 1.3 Scope

**In scope** (the six capabilities named on proposal slide 7)
- **List Asset** — creating, browsing, viewing, editing, and removing listings
- **Purchase Asset** — buying with in-app wallet balance
- **Transfer Asset** — atomic settlement: wallet debit/credit, ownership change, ownership
  history, ledger block
- **Verified Provenance** — authenticity evidence and the ownership timeline on every listing
- **Asset Auction** — creating auctions with a starting price, optional reserve, bid increment
  and end time; fair bidding with committed funds; automatic settlement to the highest
  qualifying bid
- **Fractional Ownership** — splitting an asset into shares, trading blocks of shares, and a
  transparent share register

Supporting: search, filter and sort of listings; marketplace wallet transaction records.

**Out of scope** (roadmap "Future Enhancements": `api.txt`)
- Royalties, NFT minting, crypto payments
- Real payment gateways or fiat deposits
- Notifications, admin moderation console, full-text search engine
- External blockchains (Ethereum, Polygon, etc.)
- Rentals — in the original API sketch but not in the proposal

**Dependent modules**

| Module | What Marketplace needs from it |
|---|---|
| Auth | JWT identity (`req.user.id`) for every endpoint |
| Assets | Asset ownership, title, status, file/preview |
| Verification | Latest verification result for an asset |
| Wallet | Balance check, debit, credit, transaction history |
| Ownership + Blockchain | Ownership transfer, ownership history, block mining |
| Fractional Ownership | Splitting assets and trading shares (see §3.6) |

### 1.4 Definitions

| Term | Meaning |
|---|---|
| Listing | An offer by a seller: a fixed-price sale, an auction, or a block of shares |
| Auction | A listing that collects bids until its end time, then sells to the best qualifying bid |
| Reserve price | The minimum an auction must reach, or nothing is sold |
| Held funds | A bid's money, debited when the bid is placed and returned if it is outbid |
| Share | One unit of a fractionalised asset; the share register records who holds what |
| Share offer | A fractional listing: a block of shares at a price per share |
| Seller | The current owner of the asset who created the listing |
| Buyer | An authenticated user, other than the seller, who purchases a listing |
| Settlement | The single atomic step that moves money and ownership on purchase |
| Active listing | Listing with `status = 'active'`; visible in browse and purchasable |
| Soft delete | Setting `status = 'removed'` instead of deleting the row |

### 1.5 Users and roles

| Role | Description | Marketplace abilities |
|---|---|---|
| **Seller** | Owner of an asset | Create, edit price, remove own listings |
| **Buyer** | Any other logged-in user | Browse, view, purchase |
| **Guest** | Not logged in | None (all endpoints require JWT); optional public browse is an open question (§12) |
| **Admin** | Platform operator (future) | Remove any listing, resolve disputes — post-MVP |

A user is Seller and Buyer at different times; there is no separate account type.

---

## 2. Current implementation status

| Capability | Status | Where |
|---|---|---|
| Create listing (owner-only, verified, one active per asset) | Implemented | `POST /api/marketplace/listings` |
| Browse with search, filters, sorting and paging | Implemented | `GET /api/marketplace/listings` |
| Listing details with authenticity and ownership evidence | Implemented | `GET /api/marketplace/listings/:id` |
| Edit price (seller only, active listings only) | Implemented | `PATCH /api/marketplace/listings/:id` |
| Remove listing (seller only, soft delete) | Implemented | `DELETE /api/marketplace/listings/:id` |
| **Purchase / atomic settlement** | Implemented | `POST /api/marketplace/listings/:id/buy` |
| Seller's own listings / listable assets / trade history | Implemented | `/listings/mine`, `/listable-assets`, `/trades` |
| Ownership transfer + history | Implemented | `ownershipService`, `GET /api/ownership/history/:assetId` |
| Blockchain mining + chain verification | Implemented | `blockchainService`, `/api/blockchain/*` |
| Wallet balance, history, settlement-only transaction types | Implemented | `/api/wallet`, `/api/wallet/transactions` |
| Marketplace UI (browse, tabs, buy with confirmation, trust panel) | Implemented | `MarketplacePage.jsx`, `ListingDetails.jsx` |
| Automated tests for the rules above | Implemented | `tests/marketplace.test.js` (`npm test`) |
| **Asset auctions** (bidding, reserve, auto-settlement) | Implemented | `POST /listings/:id/bids`, `auctionService` |
| **Fractional ownership** (split, share offers, register) | Implemented | `/assets/:assetId/fractionalize`, `fractionalService` |
| Asset image previews on listings | Not implemented | Needs an auth-compatible file endpoint (Assets module) |
| Rentals | Not implemented | Not in the proposal; rejected at creation |
| Platform fee destination | Not implemented | `MARKETPLACE_FEE_PERCENT` defaults to 0; no platform wallet |
| Idempotency key on purchase | Not implemented | Double-submit is guarded by the status claim, not by a key |
| Partial fills on a share offer | Not implemented | A buyer takes the whole offered block |
| Scheduled auction close | Not implemented | Auctions settle when the marketplace is next read |

Everything below labeled **Gap** is work still to do.

---

## 3. Functional requirements

Priority: **M** = must (MVP), **S** = should, **C** = could (stretch).
Status: ✅ done, 🟡 partly done / needs change, ⬜ not started.

### 3.1 Listing management (Seller)

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-MKT-01 | A logged-in user shall be able to create a listing for an asset they own, with a price. | M | ✅ |
| FR-MKT-02 | The system shall reject listing an asset the user does not own (HTTP 403) and a non-existent asset (404), regardless of client input. | M | ✅ |
| FR-MKT-03 | The system shall reject a price that is missing, non-numeric, zero, or negative (400). | M | ✅ |
| FR-MKT-04 | The system shall allow at most one **active** listing per asset. | M | ✅ |
| FR-MKT-05 | The system shall only allow listing assets that have passed verification with an acceptable result (see BR-05). | M | ✅ |
| FR-MKT-06 | The seller shall be able to change the price of their own active listing. | M | ✅ |
| FR-MKT-07 | The seller shall be able to remove (unlist) their own active listing; the record is retained (`status = 'removed'`). | M | ✅ |
| FR-MKT-08 | A listing shall not be editable or removable once `sold`. | M | ✅ |
| FR-MKT-09 | `sold` shall be set only by the purchase flow, never by a seller `PATCH`. | M | ✅ |
| FR-MKT-10 | A seller shall be able to view all of their own listings in every status ("My listings"). | S | ✅ |
| FR-MKT-11 | Listing creation shall accept an optional description/notes field shown to buyers. | C | ✅ |

### 3.2 Discovery (Buyer)

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-MKT-12 | The system shall list all active listings, newest first, including asset title, price, and seller name without extra client lookups. | M | ✅ |
| FR-MKT-13 | The listing page shall show the asset preview (image thumbnail), not only text. | M | ⬜ |
| FR-MKT-14 | Users shall be able to search listings by asset title. | S | ✅ |
| FR-MKT-15 | Users shall be able to filter by price range, asset category, and verification status. | S | 🟡 price and category done; verification filter waits on the Verification module |
| FR-MKT-16 | Users shall be able to sort by newest, price ascending, price descending. | S | ✅ |
| FR-MKT-17 | Browse results shall be paginated (default 20 per page). | S | ✅ |
| FR-MKT-18 | Listing details shall be retrievable by ID for any status, so a seller can still open their own removed listing. | M | ✅ |
| FR-MKT-19 | The current user's own listings shall be visibly marked in browse and shall not show a Buy action to them. | M | ✅ |

### 3.3 Trust and authenticity evidence

This is VaultChain's differentiator, so it is a core marketplace requirement, not decoration.

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-MKT-20 | Listing details shall show the asset's verification result (Original / Duplicate / Modified Copy / Unknown) and report date. | M | ✅ |
| FR-MKT-21 | Listing details shall show the SHA-256 hash and pHash of the asset. | M | ✅ |
| FR-MKT-22 | Listing details shall show extracted metadata (dimensions, camera, capture date, location if present). | S | ✅ |
| FR-MKT-23 | Listing details shall show the ownership timeline (previous owners, transfer dates) from `ownership_history`. | M | ✅ |
| FR-MKT-24 | Listing details shall show the blockchain record for the asset (block index, hash, action), with a way to verify chain integrity. | S | ✅ |
| FR-MKT-25 | If an asset is flagged duplicate/modified after listing, the listing shall be automatically suspended and the seller informed. | S | ⬜ |

### 3.4 Purchase and settlement

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-MKT-26 | A buyer shall be able to purchase an active `sale` listing using their wallet balance via `POST /api/marketplace/listings/:id/buy`. | M | ✅ |
| FR-MKT-27 | The system shall reject a purchase when: the listing is not active (409), the buyer is the seller (400/403), the buyer's balance is below the price (402/400), or the seller no longer owns the asset (409). | M | ✅ |
| FR-MKT-28 | Settlement shall run as **one database transaction** that: (1) debits the buyer's wallet, (2) credits the seller's wallet (price minus platform fee, if any), (3) updates `assets.owner_id`, (4) inserts `ownership_history` (`transfer_type = 'sale'`), (5) mines a `blockchain_blocks` record, (6) marks the listing `sold`. If any step fails, none are applied. | M | ✅ |
| FR-MKT-29 | Two buyers purchasing the same listing concurrently shall result in exactly one success; the other receives a 409 and is not charged. | M | ✅ |
| FR-MKT-30 | Both wallets shall record a `wallet_transactions` row referencing the listing (`reference_id`): type `purchase` for the buyer, `sale` for the seller. | M | ✅ |
| FR-MKT-31 | On successful sale, any other active listings for the same asset shall be closed. | M | ✅ |
| FR-MKT-32 | The buyer shall see a confirmation (asset, price, new balance, ledger block ID) and the asset shall appear in their asset list. | M | ✅ |
| FR-MKT-33 | The purchase endpoint shall accept an idempotency key (or otherwise be safe against double-click / retry) so a retried request cannot charge twice. | S | ⬜ |
| FR-MKT-34 | The buyer shall see a purchase summary and explicit "Confirm purchase" step before funds move. | S | ✅ |
| FR-MKT-35 | Users shall be able to view their trade history (purchases and sales) with links to the listing and ledger block. | S | ✅ |

### 3.5 Listing types

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-MKT-36 | The system shall support `sale`, `auction` and `fractional` listing types. | M | ✅ |
| FR-MKT-37 | `rent` shall be rejected: it is absent from the proposal and nothing implements rental terms. | M | ✅ |

### 3.6 Asset auctions

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-MKT-50 | An owner shall be able to auction an asset with a starting price, an end time, an optional reserve price and an optional minimum bid increment. | M | ✅ |
| FR-MKT-51 | The system shall reject an auction with no end time, an end time in the past, a run shorter than 1 minute or longer than 30 days, or a reserve below the starting price. | M | ✅ |
| FR-MKT-52 | Any signed-in user other than the seller shall be able to bid on an open auction. | M | ✅ |
| FR-MKT-53 | A bid shall be rejected below the starting price, or below the current highest bid plus the increment. | M | ✅ |
| FR-MKT-54 | Placing a bid shall commit the funds: the amount is debited and recorded as `bid_hold`, so the same balance cannot back two bids or be spent elsewhere. | M | ✅ |
| FR-MKT-55 | Being outbid shall return the funds immediately (`bid_release`). | M | ✅ |
| FR-MKT-56 | A bidder raising their own bid shall only need the difference, not the full new amount. | S | ✅ |
| FR-MKT-57 | A bid shall be rejected once the auction has ended (409) or if the bidder cannot cover it (402). | M | ✅ |
| FR-MKT-58 | When an auction ends, it shall settle to the highest held bid that meets the reserve, transferring ownership and paying the seller in one transaction. | M | ✅ |
| FR-MKT-59 | If no bid meets the reserve, or none were placed, every held bid shall be returned and the listing closed unsold. | M | ✅ |
| FR-MKT-60 | An auction with live bids shall not be editable, removable or cancellable. | M | ✅ |
| FR-MKT-61 | The seller shall be able to cancel an auction that has attracted no bids. | S | ✅ |
| FR-MKT-62 | An auction shall not be purchasable outright. | M | ✅ |
| FR-MKT-63 | Listing details shall show the current bid, bid count, reserve state, time remaining and the full bid history. | M | ✅ |
| FR-MKT-64 | A sold auction shall record the winning bid as its price, not the starting price. | M | ✅ |

### 3.7 Fractional ownership

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-MKT-40 | An owner shall be able to split an asset into between 2 and 10,000 shares, receiving all of them. | M | ✅ |
| FR-MKT-41 | An asset shall not be split twice, split by a non-owner, or split while it has an active listing. | M | ✅ |
| FR-MKT-42 | A shareholder shall be able to offer a block of shares at a price per share. | M | ✅ |
| FR-MKT-43 | A share offer shall be rejected if the seller does not hold that many shares, or if the asset was never split. | M | ✅ |
| FR-MKT-44 | Buying a share offer shall move shares and money in one transaction, recording an ownership-history entry and a ledger block. | M | ✅ |
| FR-MKT-45 | Share percentages shall always reflect shares held over total shares, and a holder left with none shall drop off the register. | M | ✅ |
| FR-MKT-46 | Several co-owners shall be able to hold active share offers for the same asset at once, but each holder only one. | M | ✅ |
| FR-MKT-47 | A whole-asset sale or auction shall be blocked while anyone else holds shares. | M | ✅ |
| FR-MKT-48 | A holder who acquires every share shall become the asset's owner of record, making it sellable whole again. | S | ✅ |
| FR-MKT-49 | The listing page shall show the share register: who holds how many shares and what percentage. | M | ✅ |

> **Simplification.** A share offer is bought as a whole block; partial fills are not supported.
> Shares are traded at a fixed price, not auctioned.


---

## 4. Business rules

| ID | Rule |
|---|---|
| BR-01 | Only the current owner (`assets.owner_id`) may list an asset. |
| BR-02 | Only the listing's seller may edit or remove it. |
| BR-03 | A buyer cannot buy their own listing. |
| BR-04 | Prices are positive numbers in the wallet currency, maximum 2 decimal places, with a configurable upper bound. |
| BR-05 | An asset is listable only if its most recent verification result is **Original**; **Duplicate**, **Modified Copy**, or no verification blocks listing. *(Confirm against proposal.)* |
| BR-06 | Money moves only through the settlement transaction. Users must not be able to fake a marketplace `purchase`/`sale` via the generic wallet endpoint. |
| BR-07 | Listings are never hard-deleted; removal sets `status = 'removed'` to preserve audit history. |
| BR-08 | Listing status lifecycle: `active → sold` (system) or `active → removed` (seller). `sold` and `removed` are terminal; relisting creates a new row. |
| BR-09 | Every ownership change produces an `ownership_history` row and a ledger block. |
| BR-10 | A platform fee, if any, is a configurable percentage taken from the seller's proceeds. `MARKETPLACE_FEE_PERCENT` defaults to 0 because there is no platform wallet to credit. |
| BR-11 | Bidding commits money. A bid debits the bidder immediately and is returned the moment they are outbid or the auction ends without them winning, so an auction can never close on a winner who cannot pay. |
| BR-12 | An auction's terms are fixed once it has a live bid; it cannot be edited, removed or cancelled. |
| BR-13 | Auctions settle to the highest held bid that meets the reserve. With no qualifying bid the listing closes unsold and every hold is returned. |
| BR-14 | Once an asset is split into shares, the whole asset can only be sold by someone holding all of them. |
| BR-15 | An asset may have one active whole-asset listing, but each shareholder may hold one active share offer concurrently with other shareholders'. |

**Listing state diagram**

```
            create
              │
              ▼
         ┌─────────┐   seller removes    ┌─────────┐
         │ active  │ ──────────────────► │ removed │
         └─────────┘                     └─────────┘
              │
              │ buyer purchases (settlement)
              ▼
         ┌─────────┐
         │  sold   │
         └─────────┘
```

---

## 5. Use cases

### UC-1 Create a listing
**Actor:** Seller · **Precondition:** logged in, owns a verified asset with no active listing.
1. Seller opens Marketplace and chooses an owned asset and enters a price.
2. System validates type, price, ownership, verification, and no existing active listing.
3. System creates the listing and shows it in browse.

**Alternate:** not owner → 403; already listed → 409; not verified → 422 with reason.

### UC-2 Browse and inspect
**Actor:** Buyer
1. Buyer opens Marketplace; sees paginated active listings, can search/filter/sort.
2. Buyer opens a listing; sees preview, price, seller, verification result, hashes, ownership timeline.

### UC-3 Buy an asset
**Actor:** Buyer · **Precondition:** logged in, wallet balance ≥ price, listing active, not own listing.
1. Buyer clicks Buy and reviews the summary; confirms.
2. System runs settlement (FR-MKT-28) in one transaction.
3. System shows confirmation; the asset now belongs to the buyer; the listing is `sold`.

**Alternate:** insufficient funds → prompt to add funds, nothing changes; listing sold meanwhile → 409, nothing changes.

### UC-4 Edit or remove a listing
**Actor:** Seller · Seller changes price or removes an active listing; system enforces ownership and status rules.

### UC-5 Review trade history
**Actor:** Any user · Views purchases and sales, each linking to the listing and ledger block.

---

## 6. API requirements

Base path `/api`. All endpoints require `Authorization: Bearer <JWT>`.

| Method | Route | Purpose | Status |
|---|---|---|---|
| POST | `/marketplace/listings` | Create listing (`sale` only, verified, one active per asset) | ✅ |
| GET | `/marketplace/listings` | Browse active; `search`, `minPrice`, `maxPrice`, `category`, `sort`, `page`, `limit` | ✅ |
| GET | `/marketplace/listings/:id` | Details, extended with verification, hashes, metadata, ownership history, ledger | ✅ |
| PATCH | `/marketplace/listings/:id` | Update price; `sold` refused, terminal listings refused | ✅ |
| DELETE | `/marketplace/listings/:id` | Soft-remove | ✅ |
| GET | `/marketplace/listings/mine` | Caller's listings, all statuses | ✅ |
| **POST** | **`/marketplace/listings/:id/buy`** | **Purchase (settlement)** | ✅ |
| GET | `/marketplace/listable-assets` | Caller's assets with a listable flag and reason | ✅ |
| GET | `/marketplace/trades` | Caller's purchases and sales | ✅ |
| GET | `/ownership/history/:assetId` | Ownership timeline | ✅ |
| GET | `/blockchain/blocks` | Whole ledger | ✅ |
| GET | `/blockchain/assets/:assetId` | Ledger history of an asset | ✅ |
| GET | `/blockchain/verify` | Re-check every block hash and link | ✅ |
| POST | `/marketplace/listings/:id/bids` | Place a bid on an auction | ✅ |
| GET | `/marketplace/listings/:id/bids` | Bid history for an auction | ✅ |
| POST | `/marketplace/listings/:id/cancel` | Seller cancels an auction with no bids | ✅ |
| POST | `/marketplace/assets/:assetId/fractionalize` | Split an asset into shares | ✅ |
| GET | `/marketplace/assets/:assetId/shares` | Share register for an asset | ✅ |

`POST /ownership/transfer` and `POST /blockchain/mine` from `api.txt` are deliberately **not**
exposed. Ownership changes and blocks are produced inside the settlement transaction; letting a
client request them separately would allow an ownership change with no payment, and a ledger that
no longer describes what happened.

**Error contract:** JSON `{ "success": false, "message": "<message>" }` with status: 400 validation,
401 unauthenticated, 402 insufficient funds, 403 not permitted, 404 not found, 409 state conflict
(already sold, already listed, lost a race), 422 blocked by verification.

**Response shape:** listings keep the camelCase form `{ id, assetId, sellerId, buyerId, listingType,
price, description, status, createdAt, updatedAt, soldAt, assetTitle, assetCategory, sellerName,
buyerName }`. The detail endpoint adds `verification`, `hashes`, `metadata`, `ownershipHistory` and
`blockchain`. Browse adds a `pagination` block.

---

## 7. Data requirements

Existing tables used: `marketplace_listings`, `assets`, `users`, `wallets`, `wallet_transactions`,
`ownership_history`, `blockchain_blocks`, `asset_hashes`, `asset_metadata`, `verification_reports`,
`fractional_ownership`.

Proposed changes:

| Change | Reason |
|---|---|
| Partial unique index on `marketplace_listings(asset_id) WHERE status = 'active'` | Enforce FR-MKT-04 in the database, not only in code |
| `marketplace_listings.sold_at`, `buyer_id`, `updated_at` | Record who bought and when; support trade history |
| `marketplace_listings.description` (nullable) | FR-MKT-11 |
| `CHECK (price > 0)` and `CHECK (listing_type IN (...))` | Defence in depth; the table currently allows NULL price and type |
| `wallet_transactions.reference_id` = `listing:<id>` convention | FR-MKT-30 links wallet rows to trades |
| Index on `marketplace_listings(seller_id)` | "My listings" |
| `ownership_history.transfer_type` values: `upload`, `sale`, `transfer` | Consistent timeline labels |

Money: SQLite `REAL` is used today. Amounts should be rounded to 2 decimals in service code, or
stored as integer minor units, before real-money-like use; this is a known limitation to decide on.

---

## 8. User interface requirements

| ID | Requirement |
|---|---|
| UI-01 | Marketplace page: grid/list of active listings with thumbnail, title, price, seller, verification badge. |
| UI-02 | Search box, filter controls, sort dropdown, and pagination on the browse page. |
| UI-03 | Listing detail page: large preview, price, seller, authenticity panel (verification result, SHA-256, pHash, metadata), ownership timeline, ledger record. |
| UI-04 | **Buy** button with confirmation dialog for non-owners; edit/remove controls only for the seller. Replace the current "Buy not implemented" note. |
| UI-05 | Wallet balance visible on the marketplace page; a clear insufficient-funds message with a link to the wallet. |
| UI-06 | Loading, empty ("no listings yet"), and error states for every screen. |
| UI-07 | Create-listing form only offers assets the user owns that are eligible (verified, not already listed), with reasons shown for ineligible ones. |
| UI-08 | Consistent with the existing dark theme and routing; usable at tablet and phone widths. |
| UI-09 | After purchase, redirect to the asset page with a success message. |

---

## 9. Non-functional requirements

### 9.1 Security
- NFR-SEC-01: Authorization is enforced server-side on every write; client-side hiding of buttons is cosmetic only (already the design).
- NFR-SEC-02: All SQL is parameterized (already true in `marketplaceRepository`).
- NFR-SEC-03: The generic `POST /api/wallet/transactions` currently lets any user create `deposit`, `sale`, or `purchase` entries of arbitrary size. Before purchases ship, restrict `sale`/`purchase` to internal use and either remove self-service `deposit` or label it as demo funds. Otherwise the marketplace has no real economic constraint.
- NFR-SEC-04: Validate and bound numeric inputs (price maximum, integer IDs) and reject NaN/Infinity.
- NFR-SEC-05: Rate-limit listing creation and purchase endpoints.
- NFR-SEC-06: Do not expose the seller's email or other private profile fields in listing responses (only display name).

### 9.2 Integrity and reliability
- NFR-REL-01: Settlement is atomic (single DB transaction with rollback), with no state where money moved but ownership did not, or the reverse.
- NFR-REL-02: Concurrent purchases are serialized; the loser gets a clean 409 (use a conditional `UPDATE ... WHERE status = 'active'` and check rows affected).
- NFR-REL-03: Ledger blocks form a valid hash chain; a chain verification routine can detect tampering.
- NFR-REL-04: Failed requests return structured errors and never leave partial writes.

### 9.3 Performance
- NFR-PERF-01: Browse and detail responses in under 500 ms for up to 10,000 listings on the target SQLite setup.
- NFR-PERF-02: Browse uses a single joined query and pagination (no N+1).
- NFR-PERF-03: Purchase completes in under 2 seconds under normal load.

### 9.4 Usability and accessibility
- NFR-UX-01: A buyer can go from browse to confirmed purchase in 4 clicks or fewer.
- NFR-UX-02: Form errors are specific ("price must be a positive number") and shown next to the field.
- NFR-UX-03: Keyboard-operable controls, sufficient contrast, labelled inputs.

### 9.5 Maintainability
- NFR-MNT-01: Keep the existing layering: route → controller → service → repository; SQL only in repositories.
- NFR-MNT-02: Business rules live in the service layer and are unit-testable without HTTP.
- NFR-MNT-03: Schema changes go through `database/migrations/`.

### 9.6 Auditability
- NFR-AUD-01: Removed and sold listings are retained; every trade is reconstructible from `marketplace_listings`, `wallet_transactions`, `ownership_history`, and `blockchain_blocks`.

---

## 10. Acceptance criteria (sample)

| # | Given | When | Then |
|---|---|---|---|
| AC-1 | Alice owns verified asset A | She lists A at 50 | Listing is `active` and appears in browse |
| AC-2 | A already has an active listing | Alice lists A again | 409, no new row |
| AC-3 | Bob owns nothing of A | Bob lists A | 403 |
| AC-4 | Bob's balance is 100, listing price 50 | Bob buys | Bob 50, Alice +50 (minus fee if any), owner = Bob, listing `sold`, one `purchase` and one `sale` transaction, one history row, one new block |
| AC-5 | Bob's balance is 20, price 50 | Bob buys | Rejected; balances, owner, listing unchanged |
| AC-6 | Alice views her own listing | — | No Buy button; edit/remove shown |
| AC-7 | Bob and Carol buy the same listing at once | Both submit | Exactly one succeeds; the other gets 409 and is not charged |
| AC-8 | Listing is `sold` | Alice sends `PATCH` to change price or status | Rejected |
| AC-9 | Alice sends `PATCH {status:'sold'}` on an active listing | — | Rejected (only the purchase flow sets `sold`) |
| AC-10 | Asset has a Duplicate verification result | Owner lists it | Rejected with reason |
| AC-11 | Mid-settlement failure (simulated error after wallet debit) | — | Full rollback; no balance or ownership change |
| AC-12 | Auction open, A bids 100 | B bids 200 | A refunded in full, B debited 200, B leads |
| AC-13 | Auction ends, best bid 200, reserve 150 | Time passes | Sold at 200 to B; seller +200; ownership and ledger updated |
| AC-14 | Auction ends, best bid 200, reserve 900 | Time passes | Nothing sold; listing closed; bid returned in full |
| AC-15 | Auction has a live bid | Seller edits, removes or cancels | All rejected (409) |
| AC-16 | Asset split into 100 shares, owner sells 25 at 10 | Buyer buys | Buyer −250, seller +250, register reads 75/25 |
| AC-17 | Asset co-owned by two holders | Owner lists the whole asset | Rejected (409) |
| AC-18 | Buyer acquires all 100 shares | — | Buyer becomes owner of record; whole-asset sale allowed again |

---

## 11. Verification and testing approach

- **Unit (service layer):** each business rule BR-01…BR-08, including boundary prices and every invalid status transition.
- **Integration (API + in-memory SQLite):** UC-1…UC-4 end to end, with settlement rollback tests that force a failure at each step.
- **Concurrency:** two simultaneous buy requests against one listing (AC-7).
- **Security:** authorization matrix (owner / non-owner / other user / no token) for every endpoint; attempt to fake a `sale` via the wallet endpoint.
- **UI:** manual walkthrough of UC-1 to UC-4 plus empty/error states.

Implemented in `tests/marketplace.test.js` and `tests/auctions-fractional.test.js`, run with
`npm test` from the repository root. Both use Node's built-in test runner against a temporary
SQLite file, so they need no extra dependencies and never touch the development database.
53 tests currently pass, covering AC-1 to AC-18 plus the browse, wallet and ledger rules.
The UI walkthrough is still manual.

---

## 12. Assumptions, gaps, and open questions

Confirm against the proposal:

1. ~~**Listing types.**~~ **Resolved by the proposal:** sale, auction and fractional are all in scope and implemented. Rent is not in the proposal and is rejected.
2. **Verification gate.** Must an asset be verified "Original" before it can be listed? (BR-05 assumes yes.)
3. **Payment model.** Wallet-balance only? How does a user get funds — demo top-up, seed balance, or no self-service deposit? (Affects NFR-SEC-03.)
4. **Fees and royalties.** Platform fee percentage? Creator royalty on resale? (`api.txt` lists royalties as future.)
5. **Guest access.** May unauthenticated visitors browse listings?
6. **Ledger.** Is the blockchain purely a local hash chain in SQLite (as `api.txt` implies), and should the ledger block be mined inside the settlement transaction?
7. ~~**Fractional ownership.**~~ **Resolved by the proposal:** in scope and implemented. A whole-asset sale is blocked while others hold shares (BR-14).
8. **Currency and precision.** Single currency? Two decimals? Integer minor units?
9. **Dispute / refund.** Any reversal flow after a sale, or are sales final?
10. **Roles.** Is there an Admin role with listing moderation in scope?
11. **Auction close timing.** There is no scheduler, so auctions settle the next time the
    marketplace is read. Should a background job close them on time instead?
12. **Share offers.** Should a buyer be able to take part of an offered block, and should
    shares be auctionable as well as fixed-price?

## 13. Suggested implementation order

Sections 1 to 6 of the original plan are complete: the integrity fixes, ownership transfer and
ledger, atomic purchase settlement, the authenticity panel and ownership timeline, browse
search/filter/sort/paging, and both advanced features (auctions and fractional ownership).

Remaining, in rough priority order:

1. Asset image previews on listings (FR-MKT-13) — needs a file endpoint that works with `<img>`
   while respecting the vault's access rules.
2. The Verification module, so listings show real reports and `REQUIRE_VERIFIED_LISTINGS` can be
   switched on.
3. A scheduled job to close auctions on time rather than on next read (§12.11).
4. Partial fills and auctions for share offers (§12.12).
5. Auto-suspend a listing if its asset is later flagged duplicate (FR-MKT-25).
6. A platform wallet, so a non-zero fee has somewhere to go.
