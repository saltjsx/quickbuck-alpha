# Transactions Feature

## Overview

A new transactions page has been added that allows users to send money between accounts, companies, and other players.

## Features

### 1. Multi-Account Support

- Users can select which account to send money from:
  - Personal account
  - Any company account they have access to (owner or manager)
- Account selector shows current balance for each account

### 2. Recipient Search

Users can send money to two types of recipients:

#### Companies

- Search by company name or ticker symbol
- Results display company logo, name, and ticker
- Example: Search "AAPL" or "Apple Inc."

#### Players (Users)

- Search by username, email, or name
- Results display user avatar, name, and username
- Users need to set their username first (via the new `updateUsername` mutation)

### 3. Transfer Form

- Amount input with validation
- Optional description field
- Real-time balance checking
- Transfer preview showing source, destination, and amount

### 4. Backend Updates

#### Schema Changes (`convex/schema.ts`)

- Added `username` field to users table
- Added index on username for efficient searching

#### New Queries (`convex/accounts.ts`)

- `searchUsers`: Search for users by username, email, or name
- `searchCompanies`: Search for companies by name or ticker

#### New Mutations (`convex/users.ts`)

- `updateUsername`: Allow users to set/update their username (with uniqueness validation)

## Usage

### Setting Username

Users should set their username so others can find them:

```typescript
const updateUsername = useMutation(api.users.updateUsername);
await updateUsername({ username: "john_doe" });
```

### Sending Money

1. Navigate to `/dashboard/transactions`
2. Select source account (personal or company)
3. Choose recipient type (Company or Player)
4. Search for recipient
5. Enter amount and optional description
6. Click "Send Money"

### Example Transfer

```typescript
const transfer = useMutation(api.accounts.transfer);

await transfer({
  fromAccountId: "personalAccountId",
  toAccountId: "recipientAccountId",
  amount: 1000,
  description: "Payment for services",
});
```

## UI Components

- Built with shadcn/ui components
- Responsive design
- Real-time search with debouncing
- Visual transfer preview
- Success/error feedback messages

## Navigation

- Added "Transactions" link to sidebar navigation (between Accounts and My Companies)
- Icon: IconSend from @tabler/icons-react

## Security

- Users can only send money from accounts they have access to
- Balance validation prevents overdrafts
- Company access is checked via `companyAccess` table
- All transfers are recorded in the ledger with proper audit trail

## Future Enhancements

- Transaction history view
- Recurring transfers
- Transfer requests/invoices
- Batch transfers
- Export transaction history
