# Moderation Quick Reference

## Command to Start
```bash
npm run moderation
```

## Player IDs
Player IDs look like: `j1234567890abcdef1234567890`
Find them in:
- Convex dashboard > tables > users
- Convex logs
- User records in Convex console

## Menu Options

### 1. Warn User
- User gets popup on next login
- Reason is displayed
- User can acknowledge
- Warning stays in history

### 2. Ban User (DESTRUCTIVE)
- Deletes ALL user data
- Adds email to blacklist
- User sees ban screen forever (until unbanned)
- Type `yes` to confirm

### 3. Check Ban Status
- Enter email address
- See if user is banned and why

### 4. Unban User
- Remove from blacklist
- User can re-register
- Type `yes` to confirm

### 5. View User Warnings
- Enter player ID
- See all warnings (acknowledged and unacknowledged)
- Shows dates and severity

## Common Actions

### Quick Warn
```
1 → [Player ID] → [Reason] → ✓
```

### Quick Ban (need to confirm)
```
2 → [Player ID] → [Reason] → yes → ✓
```

### Check If Email is Banned
```
3 → [Email] → ✓
```

### Unban an Email
```
4 → [Email] → yes → ✓
```

## Data Cleaned on Ban
- 3+ Companies
- 12+ Products
- Stock holdings
- Transaction history
- All gambles
- All loans
- Account balances
- Everything else

## Ban Screen Shows
```
⛔ Account Banned
Reason: [Your provided reason]
```

## Warning Popup Shows
```
⚠️ Warning
[Your provided reason]
Issued: [Date]
```

## Confirmation Messages

**Warn Successful:**
```
✅ Warning issued successfully!
   User: [Name]
   Reason: [Reason]
   Warning ID: [ID]
```

**Ban Successful:**
```
✅ User banned successfully!
   User: [Name]
   Email: [Email]
   Reason: [Reason]
   Cleaned up:
   • Companies deleted: N
   • Products deleted: N
   • Accounts deleted: N
```

**Not Banned:**
```
✅ User is NOT banned
```

## Error Messages

| Error | Fix |
|-------|-----|
| Invalid admin key | Check ADMIN_KEY in .env.local |
| User not found | Verify player ID is correct format |
| Already banned | Try unban first, then reban if needed |
| No warnings on record | User doesn't have any warnings yet |

## Tips

1. Always use `yes` confirmation for bans
2. Keep player IDs handy for quick lookups
3. Ban reason should be clear (for appeal purposes)
4. View warnings before deciding to ban
5. Test on a dummy account first

## Files Modified/Created

- `convex/schema.ts` - Added userWarnings and userBans tables
- `convex/moderation.ts` - Backend logic
- `scripts/moderation.ts` - CLI tool
- `app/components/moderation/moderation-components.tsx` - React components
- `docs/MODERATION.md` - Full documentation
- `package.json` - Added npm script

## Integration Checklist

- [ ] Run `npx convex deploy`
- [ ] Add `ModerationProviders` to root layout
- [ ] Set `ADMIN_KEY` in `.env.local`
- [ ] Test warn functionality
- [ ] Test ban functionality
- [ ] Test that bans work (try accessing as banned user)
- [ ] Document your moderation policy
