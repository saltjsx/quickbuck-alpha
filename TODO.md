# QuickBuck Feature Implementation TODO

## Phase 1: Employee & Payroll System

### Backend (Convex)

- [ ] Update schema.ts
  - [ ] Add employees table with all fields and indexes
  - [ ] Add "payroll" type to ledger transaction types

- [ ] Create convex/employees.ts
  - [ ] Implement `hireEmployee` mutation
  - [ ] Implement `fireEmployee` mutation
  - [ ] Implement `getCompanyEmployees` query
  - [ ] Implement `processPayroll` internal mutation
  - [ ] Implement `updateEmployeeMorale` internal mutation
  - [ ] Implement `calculateEmployeeBonus` helper function
  - [ ] Implement `giveEmployeeBonus` mutation
  - [ ] Implement `getAvailableNPCEmployees` query
  - [ ] Implement `invitePlayerEmployee` mutation

- [ ] Update convex/crons.ts
  - [ ] Add payroll processing cron (every 10 minutes)

- [ ] Update convex/products.ts
  - [ ] Integrate employee bonuses into product operations
  - [ ] Apply marketer bonus to sales rate
  - [ ] Apply engineer bonus to maintenance costs
  - [ ] Apply quality control bonus to product quality
  - [ ] Apply cost optimizer bonus to production costs

- [ ] Update convex/companies.ts
  - [ ] Include employee costs in company dashboard calculations
  - [ ] Show employee count and total payroll in company metrics

### Frontend (React Router + shadcn/ui)

- [ ] Create app/components/game/employees-tab.tsx
  - [ ] Employee list with stats
  - [ ] Hire button
  - [ ] Fire button per employee
  - [ ] Give bonus button per employee
  - [ ] Payroll summary display

- [ ] Create app/components/game/hire-employee-dialog.tsx
  - [ ] NPC employee search and filter
  - [ ] Player employee invite form
  - [ ] Employee preview card
  - [ ] Salary requirement display
  - [ ] Financial impact preview
  - [ ] Confirm hire button

- [ ] Create app/components/game/employee-card.tsx
  - [ ] Avatar component
  - [ ] Name and role badge
  - [ ] Level indicator
  - [ ] Morale gauge
  - [ ] Satisfaction gauge
  - [ ] Salary display
  - [ ] Action buttons

- [ ] Create app/components/game/give-bonus-dialog.tsx
  - [ ] Bonus amount input
  - [ ] Morale/satisfaction preview
  - [ ] Balance check
  - [ ] Confirm button

- [ ] Update app/routes/dashboard/company.$companyId.tsx
  - [ ] Add "Employees" tab to navigation
  - [ ] Import and render EmployeesTab component

---

## Phase 2: Supply Chain & Resource Management

### Backend (Convex)

- [ ] Update schema.ts
  - [ ] Add resources table
  - [ ] Add productResources table
  - [ ] Add resourceInventory table
  - [ ] Add resourceTransactions table
  - [ ] Add "resource_purchase" and "resource_sale" to ledger types

- [ ] Create convex/resources.ts
  - [ ] Implement `initializeResources` mutation (run once)
  - [ ] Implement `getActiveResources` query
  - [ ] Implement `getResourcePrice` query helper
  - [ ] Implement `purchaseResources` mutation
  - [ ] Implement `sellResources` mutation
  - [ ] Implement `consumeResourcesForProduction` internal mutation
  - [ ] Implement `updateResourcePrices` internal mutation (cron)
  - [ ] Implement `getCompanyInventory` query
  - [ ] Implement `getResourceTransactionHistory` query

- [ ] Update convex/products.ts
  - [ ] Implement `setProductResources` mutation
  - [ ] Implement `getProductResources` query
  - [ ] Update `createProduct` to require resources
  - [ ] Update product purchase logic to consume resources
  - [ ] Add resource cost to product pricing

- [ ] Update convex/crons.ts
  - [ ] Add resource pricing cron (every 30 minutes)

- [ ] Create script to initialize default resources
  - [ ] Run once after schema deployment
  - [ ] Create Silicon, Wheat, Steel, Plastic, Copper, Oil, etc.

### Frontend (React Router + shadcn/ui)

- [ ] Create app/components/game/resources-tab.tsx
  - [ ] Company inventory display
  - [ ] Market prices table
  - [ ] Buy resources button
  - [ ] Sell resources button
  - [ ] Price history chart (optional)

- [ ] Create app/components/game/buy-resources-dialog.tsx
  - [ ] Available resources list
  - [ ] Current prices display
  - [ ] Quantity input per resource
  - [ ] Total cost calculator
  - [ ] Balance check
  - [ ] Confirm purchase button

- [ ] Create app/components/game/sell-resources-dialog.tsx
  - [ ] Owned resources list with quantities
  - [ ] Quantity input to sell
  - [ ] Total revenue calculator
  - [ ] Confirm sale button

- [ ] Create app/components/game/resource-card.tsx
  - [ ] Resource icon/image
  - [ ] Name and category
  - [ ] Current price
  - [ ] Quantity owned (if applicable)
  - [ ] Price trend indicator

- [ ] Update app/components/game/create-product-dialog.tsx
  - [ ] Add resource selection step
  - [ ] Display required resources
  - [ ] Check inventory availability
  - [ ] Show resource cost in total price

- [ ] Update app/routes/dashboard/company.$companyId.tsx
  - [ ] Add "Resources" tab to navigation
  - [ ] Import and render ResourcesTab component

---

## Phase 3: Research & Development (R&D)

### Backend (Convex)

- [ ] Update schema.ts
  - [ ] Add researchProjects table
  - [ ] Add "tier" field to products table (enum)
  - [ ] Add "rd_investment" to ledger types

- [ ] Create convex/research.ts
  - [ ] Implement `createResearchProject` mutation
  - [ ] Implement `fundResearchProject` mutation
  - [ ] Implement `getCompanyResearchProjects` query
  - [ ] Implement `pauseResearchProject` mutation
  - [ ] Implement `resumeResearchProject` mutation
  - [ ] Implement `applyResearchBonuses` internal mutation
  - [ ] Implement `calculateCompanyValuation` helper (with R&D bonuses)
  - [ ] Implement `getResearchRequirements` query (for tier unlocks)

- [ ] Update convex/products.ts
  - [ ] Update `createProduct` to include tier selection
  - [ ] Add tier validation (check R&D completion)
  - [ ] Add tier-based resource requirements
  - [ ] Add tier-based pricing multipliers
  - [ ] Add tier-based quality bonuses

- [ ] Update convex/companies.ts
  - [ ] Include R&D investments in company valuation
  - [ ] Show completed research count in company metrics

### Frontend (React Router + shadcn/ui)

- [ ] Create app/components/game/research-tab.tsx
  - [ ] Active research projects list
  - [ ] Completed research list
  - [ ] Start new research button
  - [ ] Fund project button per active project
  - [ ] Pause/resume buttons

- [ ] Create app/components/game/start-research-dialog.tsx
  - [ ] Research type selection (quality, cost reduction, tier unlock, efficiency)
  - [ ] Target tier selection
  - [ ] Funding target display
  - [ ] Expected benefits preview
  - [ ] Confirm button

- [ ] Create app/components/game/fund-research-dialog.tsx
  - [ ] Project details display
  - [ ] Funding amount input
  - [ ] Completion percentage preview
  - [ ] Balance check
  - [ ] Confirm button

- [ ] Create app/components/game/research-project-card.tsx
  - [ ] Project name, type, tier badges
  - [ ] Progress bar
  - [ ] Current funding / target funding
  - [ ] Status indicator
  - [ ] Action buttons (fund, pause/resume, details)

- [ ] Update app/components/game/create-product-dialog.tsx
  - [ ] Add tier selection dropdown
  - [ ] Disable higher tiers if R&D not completed
  - [ ] Show tier requirements tooltip
  - [ ] Display tier benefits

- [ ] Update app/routes/dashboard/company.$companyId.tsx
  - [ ] Add "Research" tab to navigation
  - [ ] Import and render ResearchTab component

---

## Phase 4: Mergers & Acquisitions (M&A)

### Backend (Convex)

- [ ] Update schema.ts
  - [ ] Add mergers table
  - [ ] Add subsidiaries table
  - [ ] Add "merger_payment" and "acquisition_payment" to ledger types

- [ ] Create convex/mergers.ts
  - [ ] Implement `proposeMerger` mutation
  - [ ] Implement `acceptMergerOffer` mutation
  - [ ] Implement `rejectMergerOffer` mutation
  - [ ] Implement `cancelMergerOffer` mutation
  - [ ] Implement `completeMerger` mutation
  - [ ] Implement `getMergerOffers` query
  - [ ] Implement `getCompanySubsidiaries` query
  - [ ] Implement `spinoffSubsidiary` mutation
  - [ ] Implement asset transfer logic:
    - [ ] Transfer company balance
    - [ ] Transfer all products
    - [ ] Transfer all stock holdings
    - [ ] Transfer all employees
    - [ ] Transfer all resource inventory
    - [ ] Transfer all research projects
    - [ ] Merge or absorb tickers

- [ ] Update convex/companies.ts
  - [ ] Include subsidiaries in company valuation
  - [ ] Show merger/acquisition history

### Frontend (React Router + shadcn/ui)

- [ ] Create app/components/game/mergers-tab.tsx
  - [ ] Active merger offers (sent)
  - [ ] Active merger offers (received)
  - [ ] Propose merger button
  - [ ] Subsidiaries list
  - [ ] Spinoff subsidiary button

- [ ] Create app/components/game/propose-merger-dialog.tsx
  - [ ] Company search/select
  - [ ] Offer type selection (acquisition or merger)
  - [ ] Offer price input
  - [ ] Terms configuration (checkboxes)
  - [ ] Financial impact preview
  - [ ] Confirm button

- [ ] Create app/components/game/merger-offer-card.tsx
  - [ ] Acquirer and target company display
  - [ ] Offer price and type
  - [ ] Status badge
  - [ ] Action buttons:
    - [ ] Accept (target owner)
    - [ ] Reject (target owner)
    - [ ] Cancel (acquirer)
    - [ ] View details

- [ ] Create app/components/game/merger-details-dialog.tsx
  - [ ] Full offer details
  - [ ] Terms breakdown
  - [ ] Asset transfer preview
  - [ ] Timeline visualization
  - [ ] Close button

- [ ] Create app/components/game/subsidiary-card.tsx
  - [ ] Subsidiary company info
  - [ ] Ownership percentage
  - [ ] Current valuation
  - [ ] Performance metrics
  - [ ] Spinoff button

- [ ] Create app/components/game/spinoff-dialog.tsx
  - [ ] Confirmation prompt
  - [ ] New company structure preview
  - [ ] Asset split details
  - [ ] Confirm button

- [ ] Update app/routes/dashboard/company.$companyId.tsx
  - [ ] Add "M&A" tab to navigation
  - [ ] Import and render MergersTab component

---

## Testing & QA

- [ ] Write unit tests for all mutation functions
- [ ] Write unit tests for all query functions
- [ ] Write integration tests for complete flows:
  - [ ] Employee hire → payroll → balance check
  - [ ] Resource purchase → product creation → inventory check
  - [ ] R&D start → fund → completion → bonus verification
  - [ ] Merger proposal → acceptance → completion → asset transfer verification
- [ ] Perform load testing:
  - [ ] 1000+ employees payroll processing
  - [ ] High-volume resource transactions
  - [ ] Multiple concurrent mergers
- [ ] UI/UX testing:
  - [ ] All dialog flows
  - [ ] Error handling
  - [ ] Validation messages
  - [ ] Responsive design on mobile/tablet/desktop
- [ ] Security testing:
  - [ ] Authorization checks
  - [ ] Input validation
  - [ ] Balance consistency
  - [ ] Rate limiting

---

## Documentation (Skipped per requirements)

---

## Deployment

- [ ] Phase 1 Deployment
  - [ ] Deploy schema updates (employees)
  - [ ] Deploy convex/employees.ts functions
  - [ ] Deploy employee UI components
  - [ ] Set up payroll cron job
  - [ ] Test in staging
  - [ ] Deploy to production

- [ ] Phase 2 Deployment
  - [ ] Deploy schema updates (resources)
  - [ ] Run initializeResources script
  - [ ] Deploy convex/resources.ts functions
  - [ ] Deploy resource UI components
  - [ ] Set up resource pricing cron job
  - [ ] Test in staging
  - [ ] Deploy to production

- [ ] Phase 3 Deployment
  - [ ] Deploy schema updates (research)
  - [ ] Deploy convex/research.ts functions
  - [ ] Deploy research UI components
  - [ ] Test in staging
  - [ ] Deploy to production

- [ ] Phase 4 Deployment
  - [ ] Deploy schema updates (mergers)
  - [ ] Deploy convex/mergers.ts functions
  - [ ] Deploy merger UI components
  - [ ] Test in staging
  - [ ] Deploy to production

- [ ] Post-Deployment
  - [ ] Monitor error rates
  - [ ] Monitor performance metrics
  - [ ] Gather user feedback
  - [ ] Fix critical bugs
  - [ ] Optimize slow queries

---

## Priority Order

1. **HIGH PRIORITY**: Employee & Payroll System (most impact on gameplay)
2. **HIGH PRIORITY**: Supply Chain & Resources (foundation for interdependence)
3. **MEDIUM PRIORITY**: R&D System (progression mechanics)
4. **MEDIUM PRIORITY**: M&A System (advanced endgame feature)

---

## Estimated Time

- Phase 1 (Employees): 3-4 days
- Phase 2 (Resources): 4-5 days
- Phase 3 (R&D): 2-3 days
- Phase 4 (M&A): 3-4 days
- Testing & QA: 2-3 days
- **Total**: 14-19 days

---

## Notes

- Use only shadcn/ui components for all UI
- No icons usage per requirements
- Follow existing code patterns in convex functions
- Maintain consistency with current schema design
- Optimize for performance (batch operations, proper indexes)
- Ensure all mutations validate company ownership
- Test edge cases thoroughly before deployment
