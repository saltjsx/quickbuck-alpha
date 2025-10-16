# QuickBuck Moderation System Implementation

## Overview

A complete user moderation system has been implemented for QuickBuck, allowing admins to warn or ban players directly from a CLI tool. The system includes database tracking, UI components for ban screens and warning popups, and comprehensive data cleanup.

## What Was Implemented

### 1. **Database Schema** (`convex/schema.ts`)

Two new tables were added:

#### `userWarnings` Table
- Tracks warnings issued to users
- Fields: `userId`, `reason`, `severity`, `isAcknowledged`, `createdAt`, `acknowledgedAt`
- Indexes: `by_user`, `by_user_created`, `by_acknowledged`
- Warnings show as popups and can be acknowledged by users

#### `userBans` Table
- Blacklist of banned users
- Fields: `email`, `userId`, `reason`, `bannedAt`, `bannedBy`
- Indexes: `by_email`, `by_user`
- Used to prevent banned users from accessing the platform

### 2. **Backend Moderation Module** (`convex/moderation.ts`)

Six public functions and three queries:

**Queries:**
- `checkIfBanned(email)` - Public query to check if an email is banned
- `getUnacknowledgedWarnings()` - Get current user's unacknowledged warnings
- `getBanRecord(email, adminKey)` - Admin query to check ban details

**Mutations:**
- `warnUser(userId, reason, adminKey)` - Issue a warning to a user
  - Creates warning record
  - User sees popup on next login
  - Warning stays in history
  
- `banUser(userId, reason, adminKey)` - Permanently ban a user
  - Adds email to blacklist
  - Deletes all user data:
    - Companies owned
    - Products in those companies
    - Company access records
    - Stock transactions
    - Stock holdings
    - Stock price history
    - Company sale offers
    - Company expenses
    - Company metrics
    - Licenses
    - All accounts
    - All ledger entries
    - All gambles
    - All blackjack states
    - All collections (purchases)
    - All loans
  - User gets ban screen on next login

- `unbanUser(email, adminKey)` - Remove a ban
  - Removes email from blacklist
  - User can re-register

- `acknowledgeWarning(warningId)` - User acknowledges a warning
  - Marks warning as acknowledged
  - Records acknowledgment timestamp

### 3. **Moderation CLI Tool** (`scripts/moderation.ts`)

Interactive command-line tool with 6 options:

```
1. Warn user
2. Ban user
3. Check ban status
4. Unban user
5. View user warnings
6. Exit
```

**Features:**
- Admin key authentication
- Player ID input for warn/ban operations
- Email input for ban status checks
- Confirmation prompts for destructive operations
- Detailed feedback on operations completed
- Shows data cleanup statistics on ban

**Usage:**
```bash
npm run moderation
```

### 4. **React Components** (`app/components/moderation/moderation-components.tsx`)

**BanCheckComponent:**
- Displays ban screen if user is banned
- Shows ban reason
- Prevents access to platform
- "Return to Home" button

**WarningPopup:**
- Shows warning popup on login
- Displays warning reason and date
- "I Understand" button to acknowledge
- Only shows unacknowledged warnings

**ModerationProviders:**
- Wrapper component to be added to root layout
- Checks for bans and shows warnings

### 5. **Documentation** (`docs/MODERATION.md`)

Complete guide including:
- Setup instructions
- Usage examples for each operation
- Finding player IDs
- Ban screen and warning UI descriptions
- Data deletion details
- Safety features
- Troubleshooting guide

### 6. **npm Script**

Added to `package.json`:
```json
"moderation": "tsx scripts/moderation.ts"
```

## Data Flow

### Warning Flow
1. Admin runs `npm run moderation`
2. Admin selects "Warn user"
3. Admin enters player ID and reason
4. Warning record created in database
5. User logs in and sees warning popup
6. User clicks "I Understand" to acknowledge
7. Warning marked as acknowledged but stays in history

### Ban Flow
1. Admin runs `npm run moderation`
2. Admin selects "Ban user"
3. Admin enters player ID and reason
4. Admin confirms with "yes"
5. User's email added to blacklist
6. All user data deleted
7. User tries to access platform
8. Ban screen appears with reason
9. User cannot proceed further

## Security Features

1. **Admin Key Protection**: All moderation actions require valid admin key
2. **Confirmation Required**: Ban action requires explicit "yes" confirmation
3. **Email-based Bans**: Prevents re-registration with same email
4. **Reversible Bans**: Admins can unban users if needed
5. **Audit Trail**: All warnings and bans recorded with timestamps

## Integration Steps

To integrate into your application:

1. **Deploy Convex changes:**
   ```bash
   npx convex deploy
   ```

2. **Add components to root layout:**
   ```tsx
   import { ModerationProviders } from "@/components/moderation/moderation-components";
   
   export default function RootLayout() {
     return (
       <RootProvider>
         <ModerationProviders />
         {/* rest of layout */}
       </RootProvider>
     );
   }
   ```

3. **Set admin key in `.env.local`:**
   ```
   ADMIN_KEY=your-secret-admin-key
   ```

4. **Run moderation CLI:**
   ```bash
   npm run moderation
   ```

## Usage Examples

### Warn a player for spamming
```
$ npm run moderation
Enter admin key: [your-admin-key]

1. Select option 1 (Warn user)
2. Enter player ID: j1234567890abcdef1234567890
3. Enter warning reason: Spamming chat with advertisements
4. ✅ Warning issued successfully!
```

### Ban a player for cheating
```
$ npm run moderation
Enter admin key: [your-admin-key]

1. Select option 2 (Ban user)
2. Enter player ID: j1234567890abcdef1234567890
3. Enter ban reason: Account hacked and used for fraud
4. Type 'yes' to confirm: yes
5. ✅ User banned successfully!
   - Companies deleted: 3
   - Products deleted: 12
   - Accounts deleted: 4
```

## Testing

To test the system:

1. Create a test user account
2. Issue a warning to that user
3. Log in as that user and verify warning popup appears
4. Ban the test user
5. Try to log in and verify ban screen appears
6. Unban the user and verify they can log in again

## Notes

- Warning records are kept in database even after being acknowledged for audit purposes
- Bans are tied to email addresses to prevent re-registration workarounds
- All data deletion on ban is permanent and cannot be recovered
- Admin key should be kept secret and rotated regularly
- Consider logging moderation actions to a monitoring service

## Future Enhancements

Potential improvements:
1. Dashboard UI for moderation (instead of CLI only)
2. Temporary bans (X days or Y warnings before permanent ban)
3. Appeal system for banned users
4. Moderation history and audit log viewer
5. Bulk operations (warn/ban multiple users)
6. Automatic warnings for TOS violations
7. IP-based bans in addition to email bans
8. Moderation logs in Convex dashboard
