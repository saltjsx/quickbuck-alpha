# Quickbuck — Implementation Todo (Phase 1 focus: Functionality)

> Important: Phase 1 is strictly functionality-first. Use shadcn UI components exclusively for UI elements. Do NOT write unnecessary README files or extra documentation. Write Vitest tests to confirm functionality. Always run TypeScript typechecks and tests before finalizing any feature.

## Summary

This document breaks the project into actionable, ordered tasks with acceptance criteria and suggested test coverage. Phase 1 prioritizes working features and backend correctness. Phase 2 focuses on UI polish and visual refinement (shorter).

---

## 1) High-level contract (short)

- Inputs: user actions (create company, buy product, transfer funds, place stock/crypto orders), automated tick running every 20 minutes.
- Outputs: updated balances (personal & company), transactions logged, marketplace purchases, stock/crypto holdings updated, loans applied, notifications.
- Error modes: insufficient funds, race conditions during tick, invalid offers, duplicate tick runs — these must be tested and handled.

## 2) Edge cases to cover (top ones)

1. Negative balances from loans and automatic deductions.
2. Simultaneous purchases during a tick; ensure atomicity and idempotency.
3. Company deletion while offers/pending orders exist.
4. Ticker/name uniqueness collisions for companies and cryptos.
5. Large-volume orders and overflow/precision issues in currency math.

---

## Phase 1 — Functionality (detailed, numbered)

1. Project setup & baseline
   1. Install/verify shadcn UI and its minimal requirements (Tailwind if needed). Keep styles minimal.
   2. Add Vitest and tsc scripts. Add lighweight ESLint config (optional).
   3. Provide npm scripts: dev, build, test, typecheck.
   4. Acceptance: baseline scripts run without errors.

2. Core tick & scheduler
   1. Implement server-side tick that runs every 20 minutes (cron or scheduled worker). Export a simulateTick() for tests.
   2. Tick responsibilities: marketplace bot buys available product inventory, revenue flows to companies, transaction records created, company inventory updated, loans interest/machine deductions applied.
   3. Ensure locking so tick runs once (database lock or server lock to avoid duplicates).
   4. Tests: simulateTick unit/integration tests.

3. Data models & schema
   1. Define TypeScript types and Convex (or DB) collections for: Users, Accounts, Companies, CompanyAccounts, Products, MarketplaceListings, Orders, Transactions, Stocks, StockHoldings, Cryptos, CryptoHoldings, Loans, Offers, Upgrades.
   2. Establish indexes and fields needed for leaderboard queries (net worth, market cap, revenue).
   3. Acceptance: types compile and basic CRUD covered by tests.

4. Authentication & onboarding
   1. Wire sign-up and sign-in (use existing Convex auth if present). Create initial personal account with configured starting balance.
   2. Acceptance: register/login works and initial account exists.

5. Player dashboard (functional)
   1. Backend: API to compute balance, portfolio values (stocks & crypto), company equity contribution, and next tick time.
   2. Frontend: dashboard page showing numbers, countdown, stacked bar for net worth breakdown (shadcn components), quick actions, and last 5 transactions.
   3. Tests: calculation correctness and API endpoints.

6. Leaderboard & tables
   1. APIs for top-N queries for balance, net worth, company valuations, and company cash.
   2. Table endpoints for full lists: players by net worth, companies by market cap, products by revenue.
   3. Frontend pages with sorting and search (minimal UI OK).

7. Accounts UI & APIs
   1. Endpoints to list player personal account and company accounts with balances and recent transactions.
   2. Simple UI for account selection and transaction preview.

8. Transfers (cash, crypto, stocks)
   1. Backend transfer endpoints with validation and permissions (from-account must be owned by sender or authorised company admin).
   2. UI for selecting from-account, to-account or player, asset type, and description required.
   3. Tests for permissions, insufficient funds, and asset transfers.

9. Transaction history
   1. Account-level transaction queries and frontend table sorted by recency, with basic filters.

10. Loans
    1. Borrow endpoint (limit $5,000,000). Track loan principal, daily interest 5% (accrue each day), and automated debit of interest/principal as scheduled.
    2. Repay endpoint. Loan history for last 5 loans in UI.
    3. Tests for accrual and auto-debit behaviors.

11. Manage companies
    1. CRUD endpoints for companies. Creation modal requires name, ticker, description, tags, logo image.
    2. Company card UI with quick actions. "Go public" action enabled at $50k balance.
    3. Tests for validation (ticker uniqueness) and go-public flow.

12. Company dashboard & products
    1. Company stats API (revenue, profits, costs due). Revenue/profit graph API.
    2. Products table with Edit/Delete/Pay costs. Product creation requires name, description, price, image; optional tags.
    3. Production cost calculation: random percent between 35%-67% of price; when ordered, company pays production cost and stock is listed on marketplace for bots.
    # Quickbuck — Implementation Checklist (Phase 1: Functionality-first)

    > Phase 1 is strictly functionality-first. Use shadcn UI components exclusively for UI elements. Do NOT write unnecessary README files or extra docs. Prefer tests (Vitest) and TypeScript typechecks to prove correctness. Always run typechecks and tests before merging changes.

    This file is a checklist-style, step-by-step plan for building Quickbuck. Each line is actionable; check an item when it's fully implemented, tested, and typechecked.

    ---

    ## How to use this checklist

    - Mark tasks complete only when implementation, TypeScript typechecks, and associated Vitest tests pass locally. Add CI checks to enforce this on PRs.
    - For each feature: implement API + backend logic -> unit tests (Vitest) -> minimal UI (shadcn) -> integration tests -> typecheck. Keep UI minimal in Phase 1.
    - Do NOT add extra README files. Inline commands and tests belong to implementation commits.

    ---

    ## Quick commands (run before finalizing a feature)

    Run typecheck:

    ```bash
    npm run typecheck
    ```

    Run tests:

    ```bash
    npm run test
    ```

    Run dev server:

    ```bash
    npm run dev
    ```

    ---

    ## Phase 1 — Detailed Checklist (functionality-first)

    1) Project setup & baseline
        - [x] 1.1 Add/verify Shadcn UI dependency and its minimal styling pipeline (Tailwind + shadcn config) in package.json and tailwind config.
        - [x] 1.2 Add Vitest + testing-library/react and jsdom to devDependencies.
        - [x] 1.3 Ensure TypeScript is configured with strict mode; add `tsconfig.json` settings for noImplicitAny, strictNullChecks, and noEmit for CI typecheck runs.
        - [x] 1.4 Add `npm` scripts: `dev`, `build`, `preview`, `test` (vitest), `typecheck` (tsc --noEmit`).
        - [x] 1.5 Add a minimal GitHub Actions workflow `ci.yml` that runs `npm ci`, `npm run typecheck`, `npm run test` on PRs. (Optional but recommended.)
        - [x] 1.6 Add a minimal smoke test that asserts the app builds and shadcn components render in a simple test fixture.

    2) Data models & schema
        - [x] 2.1 Define TypeScript interfaces and Convex (or DB) collection schemas for the following entities (create `src/models/*`):
             - User
             - Account (personal, company)
             - Company
             - Product
             - Listing/MarketplaceItem
             - Order / Transaction
             - Stock & StockHolding
             - CryptoToken & CryptoHolding
             - Loan
             - Offer
             - Upgrade
        - [x] 2.2 Add validation helpers to centralize field constraints (ticker format, max loan amount, unique constraints).
        - [x] 2.3 Add database indexes for fast leaderboard queries: netWorth, marketCap, company revenue, company cash.
        - [x] 2.4 Add unit tests that insert sample fixtures and read them back (CRUD smoke tests).

    3) Authentication & user onboarding
        - [x] 3.1 Integrate sign-up and sign-in using the project's existing auth config (use `convex/auth.config.ts` if available).
        - [x] 3.2 Implement `createPersonalAccountForUser(userId)` that creates user's default account with configurable starting balance (env var: QUICKBUCK_START_BALANCE).
        - [x] 3.3 Add tests: signup flow creates user + personal account; signin-protected endpoints return 401 when unauthenticated.

    4) Core tick & scheduler (20-minute tick)
        - [ ] 4.1 Implement a pure function `simulateTick(now?: Date)` that executes a single tick and is easily testable.
        - [ ] 4.2 Implement `runTick()` for the scheduler which acquires an exclusive lock, calls `simulateTick()`, and releases the lock; ensure idempotency.
        - [ ] 4.3 Tick responsibilities to implement in `simulateTick`:
             - [ ] 4.3.1 Marketplace bot purchases: iterate listings and perform buys based on heuristic (randomized or weighted), create transactions, credit company accounts.
             - [ ] 4.3.2 Update product stock/inventory and company revenue/profit metrics.
             - [ ] 4.3.3 Accrue loan interest (5% per day) and attempt repayment (withdraw even if balance becomes negative).
             - [ ] 4.3.4 Create proper transaction logs and update ownership-equity if needed.
        - [ ] 4.4 Add unit & integration tests for `simulateTick` covering partial buys, multiple purchases, loan accrual and auto-repayment, and idempotency.

    5) Transaction model & logging
        - [ ] 5.1 Create atomic transaction writes for every money/asset movement: type, fromAccountId, toAccountId, amount (cents), balanceBefore/After (optional), metadata, createdAt.
        - [ ] 5.2 Centralize currency math in helper utilities that operate on integers (cents) and avoid floating point rounding.
        - [ ] 5.3 Tests for transaction invariants and double-entry balance consistency.

    6) Player dashboard (core functionality)
        - [ ] 6.1 Backend: implement `GET /api/dashboard` returning:
             - personalAccountBalance
             - portfolioValueStocks
             - portfolioValueCrypto
             - equityInCompanies
             - netWorth (sum)
             - nextTickAt (timestamp)
             - last5Transactions
        - [ ] 6.2 Implement server-side stacked bar calculation function that returns segment values and percentages.
        - [ ] 6.3 Frontend (use shadcn components): minimal functional dashboard showing tiles, countdown (client-side synced), stacked bar using plain DIV segments, quick actions, and last 5 transactions table.
        - [ ] 6.4 Tests: API calculations from sample fixtures; UI smoke test rendering with mocked API.

    7) Leaderboard & listing pages
        - [ ] 7.1 Backend endpoints for top-5 aggregations: balance, netWorth, companyValuation(net worth + market cap), companyCash.
        - [ ] 7.2 Table endpoints for full lists: players by netWorth, companies by market cap, products by revenue (paginated).
        - [ ] 7.3 Frontend widgets and table pages (searchable headers, minimal filters).
        - [ ] 7.4 Tests for query correctness and pagination.

    8) Accounts tab (personal & company accounts)
        - [ ] 8.1 API: `GET /api/accounts` and `GET /api/accounts/:id/transactions` with paging and filters.
        - [ ] 8.2 UI: list accounts with balance and type chips; account detail shows recent transactions and quick transfer button.
        - [ ] 8.3 Tests for access control and transaction listing.

    9) Transfers (cash, crypto, stocks)
        - [ ] 9.1 API: `POST /api/transfers` with strict validation (owner, sufficient funds/holdings, description required).
        - [ ] 9.2 Asset-specific handlers:
             - cash: debit/credit accounts
             - stock: transfer or purchase shares affecting StockHolding and account balances
             - crypto: debit/mint/burn token balances (simulate)
        - [ ] 9.3 UI: transfer form with from-account selector, to-account/username search, asset type toggles, and required description.
        - [ ] 9.4 Tests: permission checks, insufficient funds, successful cross-account transfers.

    10) Transaction history UI & API
        - [ ] 10.1 API design with filters: type, date range, accountId, paging.
        - [ ] 10.2 UI: transaction table with export button (CSV optional in Phase 2).
        - [ ] 10.3 Tests for filtering and results ordering.

    11) Loans system
        - [ ] 11.1 Borrow endpoint: `POST /api/loans/borrow` enforcing max $5,000,000 and creating loan record; increase borrower account balance immediately.
        - [ ] 11.2 Interest accrual: implement `accrueLoanInterest()` that can be called daily or within `simulateTick` with the correct daily rate (5%).
        - [ ] 11.3 Automatic repayment logic: when interest/principal falls due, debit account even if it makes balance negative; persist negative balances.
        - [ ] 11.4 Repay endpoint and loan history endpoint for last 5 loans.
        - [ ] 11.5 Tests: borrow limit, accrual math, auto-debit behavior (including negative balances), repay flow.

    12) Manage companies (create/edit/delete)
        - [ ] 12.1 Company CRUD endpoints with ticker uniqueness validation.
        - [ ] 12.2 Image/logo upload handler (phase 1: store local or temporary URL).
        - [ ] 12.3 UI: company cards listing owned companies with quick actions (Dashboard, Add Product, Edit, Delete), create modal with form validation.
        - [ ] 12.4 'Go public' action available when company cash >= $50,000; endpoint sets `isPublic = true`, creates `Stock` record with initial shares and marketCap.
        - [ ] 12.5 Tests for CRUD, ticker uniqueness, and go-public guard.

    13) Company dashboard & products
        - [ ] 13.1 Company dashboard API that returns header info and stats (totalRevenue, totalProfit, costsDue) plus historical series for charts.
        - [ ] 13.2 Products CRUD endpoints. Product creation requires name, description, price (cents), image; tags optional.
        - [ ] 13.3 Production cost per unit computation: when an order is placed, compute productionCost = price * randomPercent(0.35 - 0.67). Debit company account by productionCost*quantity and create inventory listing for the sold units for marketplace bots.
        - [ ] 13.4 Product actions: payCosts endpoint to cover outstanding production costs for a product batch.
        - [ ] 13.5 Visualizations: top 5 best-selling products and profit margins; assets list showing company-held stocks/crypto.
        - [ ] 13.6 Tests: product lifecycle, production cost accounting, and profit/revenue tallies.

    14) Company sales & offers
        - [ ] 14.1 Offer lifecycle API: create, counter, accept, reject; track parent/child offer relations for counter-offers.
        - [ ] 14.2 Notifications: persist notification records and expose `GET /api/notifications` for owners to poll (Phase 1). Modal UI when counter-offer arrives and must be resolved.
        - [ ] 14.3 Tests: offer state machine transitions and persistence until resolution.

    15) Marketplace (products)
        - [ ] 15.1 Marketplace search & filter API with full-text search on product name, company name, and tags.
        - [ ] 15.2 Product card UI: image, name, description, tags, company badge, add-to-cart.
        - [ ] 15.3 Cart persistence per-user (server-side or session) with quantity controls.
        - [ ] 15.4 Checkout flow: select payer account (personal or company) or choose crypto pay; validate balances; create Order and Transaction records; decrement listing quantities.
        - [ ] 15.5 Tests: search/filter correctness, successful checkout, insufficient funds branch.

    16) Stock market & stock page
        - [ ] 16.1 Stock listing API for public companies including 1h sparkline data, currentPrice, 1h% change, marketCap.
        - [ ] 16.2 Stock detail API with price series (multiple timeframes) and ownership aggregation.
        - [ ] 16.3 Trading endpoints: buy/sell orders that update StockHoldings and company marketCap (simplified market model in Phase 1).
        - [ ] 16.4 UI: stock market page with cards and hover indicator; stock detail page with purchase box (account selector + share/dollar input), ownership visualizer, and trade history.
        - [ ] 16.5 Tests: buy order updates holdings and marketCap calculations; permission checks for account usages.

    17) Crypto market & crypto page
        - [ ] 17.1 Token creation endpoint: `POST /api/crypto/create` (validate ticker starts with '*' and <= 4 chars including '*'), cost $10,000 deducted, total supply = 100,000,000 minted to creator.
        - [ ] 17.2 Crypto list and detail endpoints like stocks; trading endpoints update CryptoHoldings.
        - [ ] 17.3 UI: token creation modal, crypto listing, crypto detail page with buy box.
        - [ ] 17.4 Tests: token creation cost deduction, supply tracking, and trading flows.

    18) Portfolio page (stocks, crypto, collections)
        - [ ] 18.1 Aggregation endpoints providing totals for stocks, crypto, and collections.
        - [ ] 18.2 Collections: persist marketplace purchases per account with quantity and purchase price.
        - [ ] 18.3 UI page showing net worth header and three sections; each row shows logo/image, ticker/name, quantity, and current money value.
        - [ ] 18.4 Tests: aggregation correctness, collection items reflect orders.

    19) Gamble tab & mini-games
        - [ ] 19.1 Implement seedable RNG helper for deterministic testable outcomes.
        - [ ] 19.2 Implement games (phase 1 minimal rules): slot machine, blackjack vs dealer, dice roll, roulette.
        - [ ] 19.3 Ensure only personal accounts can bet; block company accounts.
        - [ ] 19.4 UI: casino-themed page using shadcn components and tasteful CSS transitions.
        - [ ] 19.5 Tests: deterministic outcomes for seeded RNG and balance updates.

    20) Upgrades (placeholder)
        - [ ] 20.1 Create upgrades catalog and purchase endpoint that persists purchases and deducts funds.
        - [ ] 20.2 UI placeholders for Purchase Upgrades and My Upgrades.
        - [ ] 20.3 Tests: purchase persists and reduces balance.

    21) Tests, typechecks, and quality gates
        - [ ] 21.1 For every feature implemented: add at least 1 happy-path unit test + 1 edge-case test (insufficient funds, invalid input, race condition).
        - [ ] 21.2 Add global test utilities and DB fixtures/mocks so tests run deterministically.
        - [ ] 21.3 Add `npm run typecheck` to CI and ensure no TypeScript errors before merging.
        - [ ] 21.4 Create GitHub Actions workflow to run `npm ci`, `npm run typecheck`, `npm run test` on PRs.

    22) Phase 2 — UI polish (short)
        - [ ] 22.1 Replace minimal Phase 1 UI with refined shadcn components and consistent theme tokens.
        - [ ] 22.2 Improve responsiveness, spacing, typography, iconography, and charts (tooltips & accessibility).
        - [ ] 22.3 Add micro-interactions and ARIA improvements; test keyboard navigation on core pages.
        - [ ] 22.4 Optional visual-regression snapshots for main pages.

    ---

    ## Acceptance criteria & developer rules

    - Every completed item must include: implementation, unit tests (Vitest), and passing TypeScript typecheck. Mark complete only after all three pass.
    - Keep business rules (currency math, random percent ranges, loan interest) inside central domain code so they are testable.
    - Use integer arithmetic (cents) for currency. Avoid float money calculations.
    - Keep UI minimal in Phase 1 — correct behavior > pretty screens. Use only shadcn components for UI visuals.
    - Do NOT create extra READMEs or duplicate documentation — tests and code should demonstrate behavior.

    ---

    Last updated: 2025-10-23
