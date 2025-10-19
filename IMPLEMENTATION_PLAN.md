# QuickBuck Feature Implementation Plan

## Feature Overview

### 1. Employee & Payroll System
Hire NPC or player employees to boost company performance. Employees provide bonuses to product quality, sales rate, or maintenance costs. Payroll is automatically deducted every 10 minutes. Includes morale and satisfaction mechanics.

### 2. Supply Chain & Resource Management
Products require raw materials (e.g., Silicon for tech, Wheat for food). Resource prices are dynamic based on global demand and random events. Creates interdependency between companies where one sells parts and another builds products.

### 3. Research & Development (R&D)
Invest funds into R&D to permanently boost quality, reduce costs, or unlock new product tiers (Basic → Advanced → Premium → Luxury). Higher R&D levels also boost company valuation and unlock special abilities.

### 4. Mergers & Acquisitions (M&A)
Buy or merge with other companies (requires both parties to agree). Absorb assets, balance, and products. Option to spin off subsidiaries or merge stock tickers into parent company.

---

## Technical Architecture

### Database Schema Extensions

#### employees
- id (auto)
- companyId (foreign key → companies)
- name (string)
- type (enum: "npc" | "player")
- playerId (optional, foreign key → users)
- role (enum: "marketer" | "engineer" | "manager" | "quality_control" | "cost_optimizer")
- level (number: 1-10)
- salary (number, per payroll cycle)
- morale (number: 0-100)
- satisfaction (number: 0-100)
- bonusMultiplier (number: 1.0-2.0)
- hiredAt (timestamp)
- lastPayrollDate (timestamp)
- isActive (boolean)

**Indexes:**
- by_company
- by_company_active
- by_type
- by_player (for player employees)
- by_lastPayrollDate (for payroll processing)

#### resources
- id (auto)
- name (string: "Silicon", "Wheat", "Steel", "Plastic", "Copper", etc.)
- category (enum: "raw_material" | "component" | "energy")
- basePrice (number)
- currentPrice (number)
- demandFactor (number: 0.5-2.0)
- supplyFactor (number: 0.5-2.0)
- isActive (boolean)
- lastPriceUpdate (timestamp)
- createdAt (timestamp)

**Indexes:**
- by_active
- by_category
- by_name

#### productResources
- id (auto)
- productId (foreign key → products)
- resourceId (foreign key → resources)
- quantityRequired (number)
- createdAt (timestamp)

**Indexes:**
- by_product
- by_resource
- by_product_resource

#### resourceInventory
- id (auto)
- companyId (foreign key → companies)
- resourceId (foreign key → resources)
- quantity (number)
- lastUpdated (timestamp)

**Indexes:**
- by_company
- by_resource
- by_company_resource

#### resourceTransactions
- id (auto)
- fromCompanyId (optional, foreign key → companies)
- toCompanyId (foreign key → companies)
- resourceId (foreign key → resources)
- quantity (number)
- pricePerUnit (number)
- totalAmount (number)
- transactionType (enum: "purchase" | "sale" | "production" | "consumption")
- createdAt (timestamp)

**Indexes:**
- by_from_company
- by_to_company
- by_resource
- by_created_at

#### researchProjects
- id (auto)
- companyId (foreign key → companies)
- name (string)
- description (string)
- type (enum: "quality_boost" | "cost_reduction" | "tier_unlock" | "efficiency")
- tier (enum: "basic" | "advanced" | "premium" | "luxury")
- currentFunding (number)
- targetFunding (number)
- completionPercentage (number: 0-100)
- status (enum: "active" | "completed" | "paused")
- bonusApplied (object: { qualityBonus?: number, costReduction?: number, etc. })
- startedAt (timestamp)
- completedAt (optional timestamp)
- createdAt (timestamp)

**Indexes:**
- by_company
- by_company_status
- by_status
- by_tier

#### mergers
- id (auto)
- acquirerCompanyId (foreign key → companies)
- targetCompanyId (foreign key → companies)
- offerPrice (number)
- offerType (enum: "acquisition" | "merger")
- status (enum: "pending" | "accepted" | "rejected" | "completed" | "cancelled")
- acquirerApproved (boolean)
- targetApproved (boolean)
- assetsTransferred (boolean)
- terms (object: { keepBrand?: boolean, spinoffAllowed?: boolean, etc. })
- createdAt (timestamp)
- completedAt (optional timestamp)

**Indexes:**
- by_acquirer
- by_target
- by_status
- by_acquirer_status
- by_target_status

#### subsidiaries
- id (auto)
- parentCompanyId (foreign key → companies)
- subsidiaryCompanyId (foreign key → companies)
- ownershipPercentage (number: 0-100)
- createdAt (timestamp)

**Indexes:**
- by_parent
- by_subsidiary

---

## Implementation Phases

### Phase 1: Employee & Payroll System

#### Backend (Convex)

**1.1 Schema Updates**
- Add employees table to schema.ts
- Add ledger transaction type: "payroll"

**1.2 Core Functions (convex/employees.ts)**
- `hireEmployee` (mutation)
  - Validate company ownership
  - Check if player already employed (if player employee)
  - Create employee record
  - Calculate initial salary based on role and level
  
- `fireEmployee` (mutation)
  - Validate company ownership
  - Deactivate employee record
  - Optional severance payment

- `getCompanyEmployees` (query)
  - Fetch all active employees for a company
  - Include performance metrics

- `processPayroll` (internal mutation, cron-triggered)
  - Run every 10 minutes
  - Query all active employees where lastPayrollDate < 10 min ago
  - Batch process payroll deductions
  - Update morale based on payment success/failure
  - Update company balance
  - Create ledger entries

- `updateEmployeeMorale` (internal mutation)
  - Calculate morale decay over time
  - Bonus payments increase morale
  - Missed payrolls decrease morale

- `calculateEmployeeBonus` (internal query helper)
  - Marketer: boosts product sales rate
  - Engineer: reduces maintenance costs
  - Quality Control: improves product quality
  - Manager: boosts overall efficiency
  - Cost Optimizer: reduces production costs

- `giveEmployeeBonus` (mutation)
  - Owner pays bonus to employee
  - Increases morale and satisfaction
  - Creates ledger entry

**1.3 Cron Job (convex/crons.ts)**
- Add payroll cron: runs every 10 minutes
- Calls `processPayroll`

#### Frontend (React Router + shadcn/ui)

**1.4 UI Components**

**app/components/game/employees-tab.tsx**
- Display list of hired employees
- Show employee stats (name, role, level, salary, morale, satisfaction)
- "Hire Employee" button → opens hire dialog
- "Fire Employee" button for each employee
- "Give Bonus" button for each employee

**app/components/game/hire-employee-dialog.tsx**
- Search/filter available NPC employees
- Option to invite player employees (by username/email)
- Display employee stats and salary requirements
- Preview impact on company finances
- Confirm and hire button

**app/components/game/employee-card.tsx**
- Reusable employee card component
- Avatar, name, role badge
- Stats: level, morale, satisfaction
- Salary display
- Action buttons (bonus, fire)

**app/components/game/give-bonus-dialog.tsx**
- Input field for bonus amount
- Preview new morale/satisfaction levels
- Confirm button

---

### Phase 2: Supply Chain & Resource Management

#### Backend (Convex)

**2.1 Schema Updates**
- Add resources table
- Add productResources table
- Add resourceInventory table
- Add resourceTransactions table
- Add ledger type: "resource_purchase", "resource_sale"

**2.2 Core Functions (convex/resources.ts)**
- `initializeResources` (mutation, run once)
  - Create default resources: Silicon, Wheat, Steel, Plastic, Copper, Oil, etc.
  - Set base prices and initial demand/supply factors

- `getActiveResources` (query)
  - Fetch all active resources with current prices

- `getResourcePrice` (query)
  - Calculate current price: basePrice × demandFactor / supplyFactor
  - Apply random events if any

- `purchaseResources` (mutation)
  - Validate company ownership
  - Check company balance
  - Calculate total cost
  - Add to resource inventory
  - Create resource transaction
  - Create ledger entry

- `sellResources` (mutation)
  - Validate company ownership
  - Check inventory quantity
  - Calculate total revenue
  - Deduct from inventory
  - Create resource transaction
  - Create ledger entry

- `consumeResourcesForProduction` (internal mutation)
  - Called when product is created/sold
  - Check required resources for product
  - Deduct from inventory
  - If insufficient, product creation fails or cost increases

- `updateResourcePrices` (internal mutation, cron-triggered)
  - Run every 30 minutes
  - Update demand/supply factors based on global transactions
  - Apply random events (shortages, surpluses)
  - Update currentPrice for all resources

**2.3 Product Resource Requirements (convex/products.ts updates)**
- `setProductResources` (mutation)
  - Define required resources for a product
  - Only company owner can set

- `getProductResources` (query)
  - Fetch resource requirements for product

- Update `createProduct` mutation:
  - Require resource selection
  - Validate resources exist

**2.4 Cron Job (convex/crons.ts)**
- Add resource pricing cron: runs every 30 minutes
- Calls `updateResourcePrices`

#### Frontend (React Router + shadcn/ui)

**2.5 UI Components**

**app/components/game/resources-tab.tsx**
- Display company resource inventory
- Show current market prices
- "Buy Resources" button → opens purchase dialog
- "Sell Resources" button → opens sell dialog
- Price history chart (optional)

**app/components/game/buy-resources-dialog.tsx**
- List of available resources with current prices
- Quantity input for each resource
- Total cost calculator
- Confirm purchase button

**app/components/game/sell-resources-dialog.tsx**
- List of owned resources with quantities
- Quantity input to sell
- Total revenue calculator
- Confirm sale button

**app/components/game/resource-card.tsx**
- Reusable resource card
- Icon/image based on resource type
- Name, category, current price
- Quantity owned (if applicable)
- Price trend indicator (up/down arrow)

**Update app/components/game/create-product-dialog.tsx**
- Add resource selection step
- Show required resources for product tier
- Display resource availability

---

### Phase 3: Research & Development (R&D)

#### Backend (Convex)

**3.1 Schema Updates**
- Add researchProjects table
- Update products table: add "tier" field (enum: "basic" | "advanced" | "premium" | "luxury")
- Add ledger type: "rd_investment"

**3.2 Core Functions (convex/research.ts)**
- `createResearchProject` (mutation)
  - Validate company ownership
  - Define project type, tier, and funding target
  - Create research project record

- `fundResearchProject` (mutation)
  - Validate company ownership
  - Check company balance
  - Add funding to project
  - Update completion percentage
  - Create ledger entry
  - If 100% funded, mark as completed and apply bonuses

- `getCompanyResearchProjects` (query)
  - Fetch all research projects for a company
  - Filter by status (active, completed, paused)

- `pauseResearchProject` (mutation)
  - Pause active project (stop accepting funding)

- `resumeResearchProject` (mutation)
  - Resume paused project

- `applyResearchBonuses` (internal mutation)
  - Called when research project completes
  - Quality boost: increase product quality permanently
  - Cost reduction: reduce production costs
  - Tier unlock: allow creating higher-tier products
  - Efficiency: reduce maintenance costs

- `calculateCompanyValuation` (query helper)
  - Base valuation on balance, revenue, assets
  - Add R&D bonus: +10% per completed advanced project, +25% per premium, +50% per luxury

**3.3 Product Tier System (convex/products.ts updates)**
- Update `createProduct` to include tier selection
- Higher tiers require:
  - Completed R&D projects
  - More expensive resources
  - Higher base price
  - Better quality/stats

#### Frontend (React Router + shadcn/ui)

**3.4 UI Components**

**app/components/game/research-tab.tsx**
- Display active and completed research projects
- Progress bars for active projects
- "Start New Research" button → opens research dialog
- "Fund Project" button for each active project

**app/components/game/start-research-dialog.tsx**
- Select research type (quality boost, cost reduction, tier unlock, efficiency)
- Select target tier (advanced, premium, luxury)
- Display funding target and expected benefits
- Confirm button

**app/components/game/fund-research-dialog.tsx**
- Display project details
- Input field for funding amount
- Preview new completion percentage
- Confirm button

**app/components/game/research-project-card.tsx**
- Project name, type, tier
- Progress bar (completion %)
- Current funding / target funding
- Status badge (active, completed, paused)
- Action buttons (fund, pause/resume)

**Update app/components/game/create-product-dialog.tsx**
- Add tier selection dropdown
- Disable higher tiers if R&D not completed
- Display tier requirements

---

### Phase 4: Mergers & Acquisitions (M&A)

#### Backend (Convex)

**4.1 Schema Updates**
- Add mergers table
- Add subsidiaries table
- Add ledger type: "merger_payment", "acquisition_payment"

**4.2 Core Functions (convex/mergers.ts)**
- `proposeMerger` (mutation)
  - Validate company ownership
  - Create merger offer
  - Set offer type (acquisition or merger)
  - Set offer price
  - Define terms (keep brand, spinoff allowed, etc.)

- `acceptMergerOffer` (mutation)
  - Validate target company ownership
  - Update offer status to accepted
  - Set targetApproved = true

- `rejectMergerOffer` (mutation)
  - Validate target company ownership
  - Update offer status to rejected

- `cancelMergerOffer` (mutation)
  - Validate acquirer company ownership
  - Update offer status to cancelled

- `completeMerger` (mutation)
  - Validate both parties approved
  - Process payment from acquirer to target owner
  - Transfer assets, balance, products from target to acquirer
  - Transfer stock holdings
  - Update company ownership if acquisition
  - Create subsidiary record if merger
  - Update offer status to completed
  - Create ledger entries

- `getMergerOffers` (query)
  - Fetch all merger offers for user (as acquirer or target)
  - Filter by status

- `getCompanySubsidiaries` (query)
  - Fetch all subsidiaries for a parent company

- `spinoffSubsidiary` (mutation)
  - Validate parent company ownership
  - Create new independent company from subsidiary
  - Transfer assets proportionally
  - Update subsidiary record

**4.3 Asset Transfer Logic**
- Transfer company balance
- Transfer all products (update companyId)
- Transfer all stock holdings
- Transfer all employees
- Transfer all resource inventory
- Transfer all research projects
- Merge or absorb tickers

#### Frontend (React Router + shadcn/ui)

**4.4 UI Components**

**app/components/game/mergers-tab.tsx**
- Display active merger offers (sent and received)
- "Propose Merger" button → opens merger dialog
- List of subsidiaries
- "Spinoff Subsidiary" button

**app/components/game/propose-merger-dialog.tsx**
- Search/select target company
- Select offer type (acquisition or merger)
- Input offer price
- Define terms (checkboxes for options)
- Preview financial impact
- Confirm button

**app/components/game/merger-offer-card.tsx**
- Display offer details (acquirer, target, price, type)
- Status badge (pending, accepted, rejected, completed)
- Action buttons:
  - For target: Accept, Reject
  - For acquirer: Cancel (if pending)
  - For both: View Details

**app/components/game/merger-details-dialog.tsx**
- Full offer details
- Terms breakdown
- Asset transfer preview
- Timeline

**app/components/game/subsidiary-card.tsx**
- Subsidiary company name, ticker
- Ownership percentage
- Current valuation
- "Spinoff" button

**app/components/game/spinoff-dialog.tsx**
- Confirm spinoff action
- Preview new company structure
- Display asset split
- Confirm button

---

## Integration Points

### 1. Employee Bonuses on Product Operations
- When product is sold: apply marketer bonus to sales rate
- When product is produced: apply engineer bonus to reduce maintenance costs
- When quality is calculated: apply quality control bonus
- When costs are calculated: apply cost optimizer bonus

### 2. Resource Requirements on Product Creation
- Product creation requires checking resource inventory
- If insufficient resources: product creation fails or cost increases
- Resource consumption is automatic on product sale
- Resource prices affect product pricing

### 3. R&D Tier Unlocks
- Products can only be created at tiers unlocked by R&D
- Higher tiers require completed R&D projects
- Company valuation increases with completed R&D

### 4. Merger Asset Transfers
- All company assets transferred: balance, products, employees, inventory, research
- Stock tickers merged or absorbed
- Subsidiaries can be spun off later

---

## Cron Jobs Summary

1. **Payroll Processing** (every 10 minutes)
   - Process employee salaries
   - Update morale

2. **Resource Price Updates** (every 30 minutes)
   - Update demand/supply factors
   - Recalculate resource prices
   - Apply random events

3. **Morale Decay** (every hour)
   - Gradually decrease employee morale if no bonuses given
   - Alert company owners

4. **Research Progress Notifications** (on project completion)
   - Notify company owner when research completes
   - Apply bonuses automatically

---

## UI/UX Considerations

1. **Tab Organization**
   - Add new tabs to company dashboard:
     - "Employees" tab
     - "Resources" tab
     - "Research" tab
     - "Mergers & Acquisitions" tab

2. **Notifications**
   - Toast notifications for:
     - Payroll processed
     - Employee fired/hired
     - Resource price changes
     - Research project completed
     - Merger offer received

3. **Data Visualization**
   - Resource price trends (line chart)
   - R&D progress (progress bars)
   - Employee morale (gauge chart)

4. **Performance Optimization**
   - Batch database operations
   - Cache frequently accessed data
   - Paginate large lists
   - Use indexes for queries

---

## Testing Strategy

1. **Unit Tests**
   - Test all mutation functions with edge cases
   - Test query functions with various filters

2. **Integration Tests**
   - Test complete flows:
     - Hire employee → process payroll → verify balance
     - Buy resources → create product with resources → verify inventory
     - Start R&D → fund to completion → verify bonuses applied
     - Propose merger → accept → complete → verify asset transfer

3. **Load Tests**
   - Test payroll processing with 1000+ employees
   - Test resource price updates with high transaction volume

4. **UI Tests**
   - Test all dialog flows
   - Test error handling and validation
   - Test responsive design

---

## Security Considerations

1. **Authorization**
   - Verify company ownership before all mutations
   - Prevent unauthorized access to company data

2. **Validation**
   - Validate all numerical inputs (no negatives, reasonable ranges)
   - Validate company balance before deductions
   - Validate resource quantities before transactions

3. **Rate Limiting**
   - Prevent spam hiring/firing
   - Prevent spam merger proposals

4. **Data Integrity**
   - Use transactions for complex operations
   - Ensure balance consistency
   - Prevent duplicate payroll processing

---

## Performance Optimization

1. **Database**
   - Add appropriate indexes
   - Use pagination for large lists
   - Batch operations where possible

2. **Caching**
   - Cache resource prices (update every 30 min)
   - Cache employee bonuses
   - Cache company valuations

3. **Query Optimization**
   - Fetch only required fields
   - Use parallel queries where possible
   - Limit result sizes

---

## Deployment Plan

1. **Phase 1: Schema Deployment**
   - Deploy schema updates
   - Run initialization scripts (resources, etc.)

2. **Phase 2: Backend Deployment**
   - Deploy convex functions
   - Set up cron jobs
   - Test in staging environment

3. **Phase 3: Frontend Deployment**
   - Deploy UI components
   - Test all user flows
   - Monitor for errors

4. **Phase 4: Production Rollout**
   - Deploy to production
   - Monitor performance metrics
   - Gather user feedback

---

## Future Enhancements

1. **Employee Skills & Training**
   - Level up employees over time
   - Training programs to boost skills

2. **Resource Trading Market**
   - Player-to-player resource trading
   - Resource futures and contracts

3. **Advanced R&D**
   - Collaborative research between companies
   - Patent system for unique research

4. **Complex Mergers**
   - Hostile takeovers
   - Stock swap mergers
   - Joint ventures

5. **Random Events**
   - Supply chain disruptions
   - Market crashes
   - Technological breakthroughs
