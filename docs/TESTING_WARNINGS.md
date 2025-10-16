# Testing the Warning System

## Quick Test Guide

### Step 1: Get Your User ID

1. Open the application and log in
2. Open browser console (F12)
3. Run this to get your user details:
   ```javascript
   // The user ID will be in the Convex queries in the Network tab
   // Or check the Convex dashboard > users table
   ```
4. Note your User ID (format: `j1234567890abcdef...`)

### Step 2: Issue a Warning via CLI

```bash
npm run moderation
```

1. Enter your admin key (or press Enter to use env var)
2. Select option `1` (Warn user)
3. Enter your User ID
4. Enter a test reason: `Test warning - please ignore`
5. Confirm the warning was created

### Step 3: Verify Warning Appears

1. Refresh the page or navigate to a new page
2. You should immediately see a warning popup with:
   - ⚠️ Warning icon
   - Your warning reason
   - Issue date
   - "I Understand" button

### Step 4: Check Browser Console

The console should show:
```
[WarningPopup] Warnings loaded: [...]
[WarningPopup] Number of warnings: 1
```

### Step 5: Acknowledge the Warning

1. Click "I Understand" button
2. Console should show:
   ```
   [WarningPopup] Acknowledging warning: [warning-id]
   [WarningPopup] Warning acknowledged successfully
   ```
3. Popup should disappear
4. Warning won't show again (it's been acknowledged)

## Troubleshooting

### Warning Not Showing Up?

**Check 1: Is ModerationProviders rendered?**
- Open React DevTools
- Search for "ModerationProviders" component
- Should be at the top level, right after ConvexProviderWithClerk

**Check 2: Is the query returning data?**
- Open browser console
- Look for: `[WarningPopup] Warnings loaded:`
- If you see `undefined`, auth might not be set up yet
- If you see `[]`, no unacknowledged warnings exist

**Check 3: Is the user authenticated?**
- Warning query requires authentication
- Log out and log back in to refresh auth

**Check 4: Check Convex Dashboard**
- Go to Convex dashboard
- Open `userWarnings` table
- Verify the warning exists
- Check `userId` matches your logged-in user
- Check `isAcknowledged` is `false`

**Check 5: Verify User ID is correct**
- In CLI, make sure you entered the correct User ID format
- Format should be: `j1234567890abcdef1234567890`
- Get it from Convex dashboard > users table

### Warning Shows But Won't Acknowledge?

**Check mutation errors:**
```javascript
// In browser console, run:
console.log(api.moderation.acknowledgeWarning)
```

**Check warning belongs to current user:**
- Only the user who received the warning can acknowledge it
- Make sure you're logged in as the warned user

### Network Errors?

Check Convex connection:
```javascript
// In browser console:
console.log(convex.connectionState())
```

Should show: `{ hasInflightRequests: false, isWebSocketConnected: true }`

## Manual Query Test

You can manually test the query in browser console:

```javascript
// This will show all your warnings
// (Requires auth to be set up)
```

## Common Issues

| Issue | Solution |
|-------|----------|
| "Warnings loaded: undefined" | Auth not ready yet - wait a moment and check again |
| "Warnings loaded: []" | No warnings or already acknowledged |
| Warning ID format error | Make sure using Convex ID format |
| "Not authenticated" error | Log out and log back in |
| Popup doesn't appear | Check z-index conflicts with other components |
| Can't click button | Check for overlaying elements |

## Success Indicators

✅ Console shows: `[WarningPopup] Warnings loaded: [Object]`
✅ Console shows: `[WarningPopup] Number of warnings: 1`
✅ Popup appears on screen
✅ Can click "I Understand"
✅ Console shows: `[WarningPopup] Warning acknowledged successfully`
✅ Popup disappears
✅ Doesn't reappear on refresh

## Clean Up Test Data

After testing, clean up warnings:

```bash
# Option 1: Via CLI
npm run moderation
# Select option 5 to view warnings
# Manually delete from Convex dashboard if needed

# Option 2: Via Convex Dashboard
1. Go to userWarnings table
2. Find your test warning
3. Delete the entry
```

## Production Checklist

Before using in production:

- [ ] Remove debug console.logs (or keep for monitoring)
- [ ] Test with different warning reasons
- [ ] Test with multiple warnings
- [ ] Test warning persistence across sessions
- [ ] Test on mobile devices
- [ ] Verify z-index doesn't conflict with other modals
- [ ] Test accessibility (keyboard navigation, screen readers)
- [ ] Set up admin notification when warnings are issued
