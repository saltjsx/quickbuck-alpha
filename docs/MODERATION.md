# QuickBuck Moderation CLI Tool

## Overview

This CLI tool provides moderators and admins with the ability to warn or ban users from the QuickBuck platform. It includes:

- **Warn Users**: Issue warnings that appear as popups on user login
- **Ban Users**: Permanently ban users and delete all associated data
- **View Warnings**: Check a user's warning history
- **Ban Management**: Check ban status and unban users if needed

## Setup

### Prerequisites

1. Ensure you have `ADMIN_KEY` set in your `.env.local` file
2. The tool requires Convex deployment to be running

### Installation

The tool is already in the repository at `scripts/moderation.ts`.

## Usage

### Running the Moderation CLI

```bash
npm run moderation
```

This will start an interactive menu where you can:

1. **Warn User** - Issue a warning to a player
2. **Ban User** - Permanently ban a player
3. **Check Ban Status** - Check if an email is banned
4. **Unban User** - Remove a ban from an email
5. **View User Warnings** - See all warnings for a user
6. **Exit** - Exit the CLI

### Warn a User

```
1. Select option 1
2. Enter the player ID (user's Convex ID)
3. Enter the warning reason
4. The user will see a popup the next time they log in
```

**What happens:**
- A warning record is created in the database
- The user sees a warning popup on their next login
- The warning can be acknowledged but stays in their record

### Ban a User

```
1. Select option 2
2. Enter the player ID (user's Convex ID)
3. Enter the ban reason
4. Type 'yes' to confirm (this action is destructive!)
```

**What happens:**
- The user's email is added to the blacklist
- All companies owned by the user are deleted
- All products in those companies are deleted
- All user data (accounts, holdings, loans, gambles, etc.) is deleted
- User receives a ban screen if they try to access the platform
- The reason for the ban is displayed on the ban screen

### Check Ban Status

```
1. Select option 3
2. Enter the user's email
3. You'll see if they're banned and the reason
```

### Unban a User

```
1. Select option 4
2. Enter the user's email
3. Type 'yes' to confirm
4. The ban record is removed and they can access the platform again
```

### View User Warnings

```
1. Select option 5
2. Enter the player ID
3. See all warnings issued to that user
```

## Finding Player IDs

Player IDs are the Convex user ID format: `j1234567890abcdef1234567890`

You can find player IDs by:
1. Checking the Convex dashboard's `users` table
2. Looking at Convex logs for user operations
3. Checking the user record in the Convex console

## Ban Screen UI

When a banned user tries to access the platform, they see:

```
⛔
Account Banned

Your account has been banned from QuickBuck.

Reason: [Ban reason provided by admin]

If you believe this is a mistake, please contact support.

[Return to Home]
```

## Warning Popup UI

When a warned user logs in, they see:

```
⚠️
Warning

[Warning reason]

Issued: [Date]

[I Understand]
```

## Data Deletion on Ban

When a user is banned, the following data is permanently deleted:

- All companies owned by the user
- All products in those companies
- All stock holdings
- All accounts (personal and company)
- All ledger entries (transaction history)
- All gamble records
- All loans
- All collection records (product purchases)
- All company metrics and analytics

## Safety Features

1. **Confirmation Required**: Ban action requires typing 'yes' to confirm
2. **Admin Key Protection**: All moderation actions require a valid admin key
3. **Email-based Bans**: Bans are tied to email addresses, preventing re-registration workarounds
4. **Unban Capability**: Admins can unban users if needed

## Troubleshooting

### "Invalid admin key" error

Make sure:
- Your `ADMIN_KEY` environment variable is set correctly in `.env.local`
- You're using the same admin key in both the CLI and environment

### "User not found" error

The player ID must be a valid Convex user ID. Check:
- The ID format: should be like `j1234567890abcdef1234567890`
- Verify the ID exists in the Convex dashboard

### Changes not showing up immediately

Moderation changes are applied immediately in the database but:
- Ban screens appear on next login/page refresh
- Warning popups appear on next login/page refresh
- You may need to force-reload the page to see changes

## Notes

- Player IDs are required for warning and banning operations
- Email addresses are required for ban status checks
- All operations are logged in your Convex deployment
- Bans are permanent until explicitly unbanned by an admin
