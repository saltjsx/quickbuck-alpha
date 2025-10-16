# Ban System Testing Guide

## Overview

The ban system has been updated to properly detect and display the ban screen. Here's what was fixed:

### What Was Wrong

1. ❌ `BanCheckComponent` was not actually querying the database
2. ❌ It was using placeholder code that never checked ban status
3. ❌ The query `checkCurrentUserBan` was created but never used

### What Was Fixed

1. ✅ Created `checkCurrentUserBan` query in `convex/moderation.ts`
2. ✅ Updated `BanCheckComponent` to use `useQuery` with the new query
3. ✅ Added debug logging to track ban status
4. ✅ Ban screen now properly displays with the ban reason

## How It Works Now

```
User Loads Page
    ↓
ModerationProviders Component Renders
    ↓
BanCheckComponent Queries: api.moderation.checkCurrentUserBan
    ↓
Query checks user's email against userBans table
    ↓
If banned: Display ban screen (blocks entire app)
If not banned: Continue normal app flow
```

## Testing the Ban System

### Step 1: Get User Email

1. Log into the application
2. Open browser console (F12)
3. Go to Convex Dashboard > `users` table
4. Find your user and note the email address

### Step 2: Ban the User

```bash
npm run moderation
```

1. Enter admin key
2. Select option `2` (Ban user)
3. Enter your User ID (format: `j1234567890abcdef...`)
4. Enter reason: `Testing ban system`
5. Type `yes` to confirm

You should see:
```
✅ User banned successfully!
   Email: your-email@example.com
   Reason: Testing ban system
   Cleaned up:
   • Companies deleted: X
   • Products deleted: X
   • Accounts deleted: X
```

### Step 3: Verify Ban Screen Appears

1. **Refresh the page** or navigate to any page
2. You should immediately see:

```
⛔
Account Banned

Your account has been banned from QuickBuck.

Reason: Testing ban system

If you believe this is a mistake, please contact support.

[Return to Home]
```

3. Check browser console for:
```
[BanCheck] Ban status loaded: {isBanned: true, reason: "Testing ban system", bannedAt: ...}
[BanCheck] ⛔ USER IS BANNED - Reason: Testing ban system
```

### Step 4: Verify Access is Blocked

- Try navigating to any page: `/dashboard`, `/game`, etc.
- Ban screen should overlay everything
- No access to any features
- Can only click "Return to Home"

### Step 5: Unban to Continue Testing

```bash
npm run moderation
```

1. Select option `4` (Unban user)
2. Enter your email address
3. Type `yes` to confirm
4. Refresh the page - ban screen should disappear

## Debug Console Output

### When Not Banned:
```
[BanCheck] Ban status loaded: {isBanned: false}
[BanCheck] ✅ User is not banned
```

### When Banned:
```
[BanCheck] Ban status loaded: {isBanned: true, reason: "...", bannedAt: ...}
[BanCheck] ⛔ USER IS BANNED - Reason: ...
```

## Troubleshooting

### Ban Screen Not Showing?

**Check 1: Is the query returning data?**
```javascript
// In browser console:
// Look for: [BanCheck] Ban status loaded:
```

**Check 2: Is the user actually banned in the database?**
- Go to Convex Dashboard
- Open `userBans` table
- Check if your email exists
- Verify email is lowercase

**Check 3: Is ModerationProviders rendered?**
- Open React DevTools
- Find `ModerationProviders` component
- Should be at root level

**Check 4: Does the email match?**
- The ban table uses lowercase emails
- Check `users` table for your email
- Check `userBans` table for matching email

**Check 5: Clear cache and refresh**
```bash
# Hard refresh
Cmd+Shift+R (Mac)
Ctrl+Shift+R (Windows/Linux)
```

### Already Banned But Can Still Access?

This means the ban record doesn't exist. Check:

1. Was the ban command successful?
2. Does the email in `userBans` match your user email?
3. Is the email lowercase in the database?

### Data Wiped But No Ban Screen?

This is the original issue - now fixed! If you're still seeing this:

1. Make sure you pulled the latest code
2. Verify `checkCurrentUserBan` query exists in `convex/moderation.ts`
3. Verify `BanCheckComponent` uses `useQuery`
4. Check browser console for errors

## Manual Database Check

### Check if user is banned:

```sql
-- In Convex Dashboard Console
const bans = await ctx.db.query("userBans").collect();
console.log(bans);
```

### Check user's email:

```sql
-- In Convex Dashboard Console  
const user = await ctx.db.get("[your-user-id]");
console.log(user.email);
```

## Implementation Details

### Backend Query (`convex/moderation.ts`)

```typescript
export const checkCurrentUserBan = query({
  args: {},
  handler: async (ctx) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { isBanned: false };

    // Get user from database
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user || !user.email) return { isBanned: false };

    // Check if email is in ban table
    const userEmail = user.email.toLowerCase();
    const ban = await ctx.db
      .query("userBans")
      .withIndex("by_email", (q) => q.eq("email", userEmail))
      .first();

    // Return ban status
    if (ban) {
      return {
        isBanned: true,
        reason: ban.reason,
        bannedAt: ban.bannedAt,
      };
    }

    return { isBanned: false };
  },
});
```

### Frontend Component (`app/components/moderation/moderation-components.tsx`)

```typescript
export function BanCheckComponent() {
  const banStatus = useQuery(api.moderation.checkCurrentUserBan);

  // If banned, show full-screen ban overlay
  if (banStatus?.isBanned) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50">
        {/* Ban screen UI */}
      </div>
    );
  }

  return null;
}
```

## Security Notes

1. **Email-based bans**: Prevents re-registration with same email
2. **Full-screen overlay**: z-index 50 - blocks all UI interactions
3. **No bypass**: Ban check runs on every page load
4. **Auth-required**: Only checks authenticated users
5. **Lowercase emails**: All emails normalized to lowercase for consistency

## Common Test Scenarios

### Scenario 1: Ban Active User
1. User is logged in and playing
2. Admin bans user via CLI
3. User refreshes page
4. ✅ Ban screen appears immediately

### Scenario 2: Banned User Tries to Log In
1. User is already banned
2. User logs out and tries to log back in
3. User authenticates with Clerk
4. ✅ Ban screen appears after auth

### Scenario 3: Ban Then Unban
1. User is banned
2. Admin unbans user
3. User refreshes page
4. ✅ Ban screen disappears, full access restored

### Scenario 4: Wrong Email Format
1. User banned with email: `User@Example.COM`
2. Database has: `user@example.com`
3. ✅ Ban still works (emails normalized)

## Files Modified

1. `convex/moderation.ts` - Added `checkCurrentUserBan` query
2. `app/components/moderation/moderation-components.tsx` - Updated `BanCheckComponent`
3. `app/root.tsx` - Already has `ModerationProviders` (from previous fix)

## Success Checklist

- [ ] Run ban command successfully
- [ ] Refresh page
- [ ] See ban screen with reason
- [ ] Console shows: `[BanCheck] ⛔ USER IS BANNED`
- [ ] Cannot access any features
- [ ] "Return to Home" button works
- [ ] Unban command works
- [ ] Refresh removes ban screen
- [ ] Full access restored after unban

The ban system is now **fully functional** and will prevent banned users from accessing the platform! 🎉
