# Wallet & Marketplace Modules — Workflow

This document explains how the Wallet and Marketplace modules work end to end,
from an HTTP request down to the database and back. Both modules follow the
same layering already used by the Auth and Asset modules in this codebase.

## Shared architecture

```
Client page → client service → HTTP request (JWT in Authorization header)
   → Express route → authenticateToken middleware → controller → service → repository → SQLite
```

### One connection, one transaction at a time

Every repository shares a single `sqlite3` connection, and SQLite has no
nested transactions. If two requests each ran `BEGIN ... COMMIT` at the same
time, their statements would land inside one transaction and a rollback in one
request would silently discard the other's writes.

`database.withTransaction(work)` solves this. It keeps a promise queue, so each
transaction waits for the previous one to finish before issuing its own
`BEGIN IMMEDIATE`. Repository functions take an optional `client` argument:
called without one they run standalone, called with the `client` from
`withTransaction` they join the caller's transaction. That is what lets a
marketplace purchase move two wallet balances, an asset's owner, the ownership
history and a ledger block in a single all-or-nothing step.

Each layer has exactly one job:

| Layer | Responsibility |
|---|---|
| **Route** (`server/src/routes/`) | Maps an HTTP verb + path to a controller function, gated by `authenticateToken`. |
| **Controller** (`server/src/controllers/`) | Reads `req.user.id` (decoded from the JWT) and `req.body` / `req.params`, calls the service, shapes the JSON response. |
| **Service** (`server/src/services/`) | Validation and business rules — ownership checks, balance checks. No SQL here. |
| **Repository** (`server/src/repositories/`) | The only layer that touches SQL. |

Files:

```
server/src/
  routes/walletRoutes.js
  routes/marketplaceRoutes.js
  controllers/wallet/walletController.js
  controllers/marketplace/marketplaceController.js
  services/wallet/walletService.js
  services/marketplace/marketplaceService.js
  repositories/walletRepository.js
  repositories/marketplaceRepository.js

client/src/
  services/walletService.js
  services/marketplaceService.js
  pages/wallet/WalletPage.jsx
  pages/marketplace/MarketplacePage.jsx
  pages/marketplace/ListingDetails.jsx
```

---

## Wallet workflow

**1. Wallet creation happens at registration, not in this module.**
`authRepository.js` creates a `wallets` row with `balance = 0` inside the same
DB transaction as the `users` insert, so every user already has a wallet
before they ever call a wallet endpoint.

**2. `GET /api/wallet`**
`walletController.getWallet` → `walletService.getWallet` →
`walletRepository.getWalletByUserId` — a lookup by `req.user.id`, returns
`{ balance, currency }`.

**3. `GET /api/wallet/transactions`**
Same pattern, but first re-fetches the wallet to get its `id`, then
`getTransactionsByWalletId` returns all rows ordered newest-first.

**4. `POST /api/wallet/transactions`** — the interesting one:

- `walletService.validateTransactionInput` accepts only `deposit` and
  `withdrawal`. `purchase` and `sale` describe a completed marketplace trade,
  so they are written by the settlement transaction and rejected with **403**
  here — otherwise any user could credit themselves a sale that never
  happened.
- `addTransaction` decides the **sign**: `deposit` / `sale` → `+amount`,
  `withdrawal` / `purchase` → `-amount`.
- `walletRepository.applyBalanceChange` does the risky part atomically:

  ```
  read current balance
  newBalance = balance + signedAmount
  if newBalance < 0 → throw "Insufficient wallet balance" → ROLLBACK
  UPDATE wallets SET balance = newBalance
  INSERT INTO wallet_transactions (...)
  ```

  Balance and transaction history are updated together or not at all — there
  is no state where a transaction row exists without the balance reflecting
  it, or vice versa. The same function is reused by the marketplace
  settlement, which calls it twice (buyer and seller) inside one transaction.

**Client side:** `WalletPage.jsx` calls `walletService` on mount to load
balance + history, and re-calls `loadWallet()` after every successful
`addTransaction()` so the UI always reflects the DB state instead of
predicting the new balance client-side.

---

## Marketplace workflow

**1. `POST /api/marketplace/listings` (create a listing)**

- `marketplaceService.createListing` validates the price and routes on the
  listing type. Three are supported — `sale` (fixed price), `auction` and
  `fractional` (a block of shares) — each validated by its own builder.
  `rent` is rejected: it is not in the project proposal and nothing implements
  rental terms.
- `assertOwnsAsset` fetches the asset via `assetRepository.getAssetById` and
  throws **403** if `asset.ownerId !== req.user.id` — you cannot list
  something you do not own, enforced server-side regardless of what the
  client sends.
- `assertAssetIsListable` reads the asset's most recent verification report
  and throws **422** if it says `duplicate` or `modified_copy`. An asset with
  no report yet is still listable, because the Verification module does not
  produce reports yet; setting `REQUIRE_VERIFIED_LISTINGS=true` tightens this
  to "must be verified original" once it does.
- An asset may only have one active **whole-asset** listing, enforced by a
  partial unique index so two simultaneous requests cannot both slip through
  the service check. Share offers are different: several co-owners may each be
  selling their own shares at once, so a second index limits them to one active
  offer *per seller* instead.
- A whole-asset sale or auction is blocked while anyone else holds shares in
  the asset, since it would sell other people's property.

**2. `GET /api/marketplace/listings` (browse)**

`getActiveListings` runs a single `SELECT` that joins `marketplace_listings`
with `assets` and `users`, so the response already includes `assetTitle` and
`sellerName` (no N+1 lookups on the client), filtered to `status = 'active'`.
Search (`search`), filters (`minPrice`, `maxPrice`, `category`), sorting
(`sort`) and paging (`page`, `limit`) are applied in SQL, and the response
carries a `pagination` block.

**3. `GET /api/marketplace/listings/:id` (details)**

Same joined query, no status filter — so a seller can still view their own
removed listing directly. The service then attaches the evidence a buyer needs
in order to trust the listing: the latest verification report, the asset's
SHA-256 and pHash, its extracted metadata, the full ownership timeline and the
ledger blocks for that asset.

**4. `PATCH /api/marketplace/listings/:id` (edit price)**

- `getListingOwnedByUserOrThrow` fetches the listing and throws **403**
  unless `listing.sellerId === req.user.id`.
- A listing that is already `sold` or `removed` is terminal and returns
  **409**.
- `status` may only be set to `removed`. A seller asking for `sold` gets
  **409**: that status is set by completing a purchase, and nothing else.

**5. `DELETE /api/marketplace/listings/:id` (remove)**

Same ownership check, then `softDeleteListing` sets `status = 'removed'`.
The row stays in the database (so ownership/audit history stays intact
later) but drops out of `getActiveListings()`, and the asset becomes listable
again.

**6. `POST /api/marketplace/listings/:id/buy` (purchase)** — the whole point
of the module:

```
withTransaction:
  re-read the listing                    → 404 if missing
  buyer is not the seller                → 400
  listing is still active and a sale     → 409
  seller still owns the asset            → 409
  buyer balance >= price                 → 402

  UPDATE listings SET status='sold', buyer_id=?
    WHERE id=? AND status='active'       → 0 rows means another buyer
                                           won the race → 409, nothing charged
  debit buyer wallet   + wallet_transactions row (type 'purchase')
  credit seller wallet + wallet_transactions row (type 'sale')
  UPDATE assets SET owner_id = buyer
    WHERE id=? AND owner_id=seller       → 0 rows → 409
  mine a blockchain block (hash chained to the previous block)
  INSERT ownership_history (transfer_type 'sale', block id)
COMMIT
```

Claiming the listing before any money moves is what makes concurrent
purchases safe: the second buyer changes no rows and is turned away before
being charged. Because every step shares one transaction, a failure anywhere
rolls back the balances, the ownership and the listing status together.

Both wallet rows carry `reference_id = "listing:<id>"`, so a trade can be
reconstructed from either side later.

**7. `POST /api/marketplace/listings/:id/bids` (bid on an auction)**

Bidding commits money rather than merely promising it. Placing a bid debits the
bidder straight away and records a `bid_hold` row; being outbid credits it back
as `bid_release`. That is what stops an auction closing on a winner who has
since spent the money, and stops one balance backing two bids at once.

```
withTransaction:
  listing is an open auction, not ended, not the bidder's own   → 409 / 400
  release any earlier hold this bidder has on this auction
      (so raising your own bid only costs the difference)
  bid >= startingPrice, and >= highest + minBidIncrement        → 400
  balance covers the bid                                        → 402
  debit bidder                  → wallet_transactions 'bid_hold'
  release the previous leader   → wallet_transactions 'bid_release'
  INSERT auction_bids (status 'held')
COMMIT
```

**8. Auction settlement**

There is no scheduler in this app, so `settleExpiredAuctions()` runs before
listings are browsed or opened. It is idempotent, so calling it often is
harmless, and it means a finished auction is never shown as still open.

For each expired auction, in one transaction: the highest held bid that meets
the reserve wins. Its hold is released and immediately charged as a `purchase`
— netting to zero, but leaving a ledger where each row's amount matches what it
actually did — the seller is paid, ownership transfers, a block is mined, and
the listing is marked sold at the winning bid rather than the starting price.
If no bid meets the reserve, every remaining hold is returned and the listing
becomes `closed`.

**9. Fractional ownership**

`POST /api/marketplace/assets/:assetId/fractionalize` splits an asset into
2–10,000 shares and gives them all to the owner. The asset keeps its
`owner_id`, which now means custodian of record; the share register in
`fractional_ownership` becomes the authoritative account of who owns what.

A `fractional` listing offers a block of `share_count` shares at `price` each.
Buying one moves shares and money in a single transaction, writes an
ownership-history entry and mines a block, exactly like a whole-asset sale. A
buyer takes the whole block — partial fills are not supported. If a buyer ends
up holding every share, they become the owner of record and the asset can be
sold whole again.

**Client side:** `MarketplacePage.jsx` handles browse, search/filter/sort,
creating a listing from a dropdown of the user's listable assets, plus "My
listings" and "Trade history" tabs. `ListingDetails.jsx` shows the
authenticity panel and ownership timeline, and gives non-sellers a Buy button
with a confirmation step. Both decode the JWT payload client-side
(`authService.getCurrentUserId()`) purely to decide which controls to *show*.
The actual authorization is re-checked server-side on every write, so a
tampered client cannot bypass it.

---

## Endpoint summary

| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/api/wallet` | required | Returns caller's own wallet |
| GET | `/api/wallet/transactions` | required | Returns caller's own history |
| POST | `/api/wallet/transactions` | required | `deposit` / `withdrawal` only |
| POST | `/api/marketplace/listings` | required | Must own `assetId`, `sale` only |
| GET | `/api/marketplace/listings` | required | Active only; search/filter/sort/page |
| GET | `/api/marketplace/listings/mine` | required | Caller's listings, any status |
| GET | `/api/marketplace/listings/:id` | required | Any status, with trust evidence |
| PATCH | `/api/marketplace/listings/:id` | required | Seller only, active only |
| DELETE | `/api/marketplace/listings/:id` | required | Seller only, soft delete |
| POST | `/api/marketplace/listings/:id/buy` | required | Atomic settlement (sale or share offer) |
| POST | `/api/marketplace/listings/:id/bids` | required | Place a bid; funds are held |
| GET | `/api/marketplace/listings/:id/bids` | required | Bid history |
| POST | `/api/marketplace/listings/:id/cancel` | required | Seller, auctions with no bids |
| POST | `/api/marketplace/assets/:assetId/fractionalize` | required | Split into shares |
| GET | `/api/marketplace/assets/:assetId/shares` | required | Share register |
| GET | `/api/marketplace/listable-assets` | required | Owned assets + why each is blocked |
| GET | `/api/marketplace/trades` | required | Caller's completed purchases and sales |
| GET | `/api/ownership/history/:assetId` | required | Ownership timeline |
| GET | `/api/blockchain/blocks` | required | Whole ledger |
| GET | `/api/blockchain/assets/:assetId` | required | Ledger for one asset |
| GET | `/api/blockchain/verify` | required | Re-checks every block hash |

`/listings/mine`, `/listable-assets` and `/trades` are registered before
`/listings/:id` so Express does not match `mine` as an id.

## Tests

`npm test` from the repository root runs `tests/marketplace.test.js` and
`tests/auctions-fractional.test.js` against a temporary SQLite file — 53 tests.
They cover the ownership and price rules, the verification gate,
search/filter/sort/paging, the full settlement, the concurrent-buyer race,
rollback when a mid-settlement step fails, the wallet restrictions, ledger
tamper detection, bidding and fund holds, auction settlement with and without a
reserve, splitting assets, share trading, and the co-ownership rules.

## Remaining scope

- **Rentals.** Not in the project proposal; rejected at creation.
- **Asset previews.** Listings are text-only. Serving image previews needs a
  file endpoint that works with `<img>` while still respecting the vault's
  access rules, which belongs to the Assets module.
- **Platform fee.** `MARKETPLACE_FEE_PERCENT` is plumbed through settlement but
  defaults to `0`, because there is no platform wallet to credit a fee to yet.
- **Scheduled auction close.** Auctions settle when the marketplace is next
  read rather than at the instant they expire.
- **Partial fills.** A share offer is bought whole, and shares are fixed-price
  rather than auctionable.
- **Refunds and disputes.** A completed sale is final.
