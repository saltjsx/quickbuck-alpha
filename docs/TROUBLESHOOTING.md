# QuickBuck - Troubleshooting Guide

## Issue #2: Route Loading Error (SOLVED)

### Error Message

```
Failed to load url /app/routes/dashboard/accounts.tsx (resolved id: /app/routes/dashboard/accounts.tsx)
in virtual:react-router/server-build. Does the file exist?
```

### Problem

After restructuring the navigation to add new route files (`accounts.tsx`, `companies.tsx`, `marketplace.tsx`, `stocks.tsx`), the dev server failed to start.

### Root Cause

**Stale build cache** combined with **old route files** that were no longer in the route configuration but still existed in the file system. The React Router build system was trying to resolve routes that had been removed from `routes.ts` but were still cached.

Specifically:

- `chat.tsx` - Removed from routes.ts but file still existed
- `settings.tsx` - Removed from routes.ts but file still existed
- `game.tsx` - Removed from routes.ts but file still existed

### Solution

#### Step 1: Remove Old Route Files

```bash
rm /Users/abdul/Documents/quickbuck/app/routes/dashboard/chat.tsx
rm /Users/abdul/Documents/quickbuck/app/routes/dashboard/settings.tsx
rm /Users/abdul/Documents/quickbuck/app/routes/dashboard/game.tsx
```

#### Step 2: Clear Build Caches

```bash
rm -rf .react-router build node_modules/.vite
```

This removes:

- `.react-router/` - React Router's compiled route cache
- `build/` - Production build artifacts
- `node_modules/.vite/` - Vite's development cache

#### Step 3: Restart Dev Server

```bash
npm run dev
```

### Why This Works

React Router caches:

1. **Route configuration** in `.react-router/`
2. **Compiled routes** in the build directory
3. **Module resolution** in Vite's cache

When you:

- Add new routes
- Remove old routes
- Change route structure

The cache can become stale and point to:

- Non-existent files
- Outdated route configurations
- Incorrect module paths

Clearing these caches forces a complete rebuild with the current route structure.

### Current Working Route Structure

After fixes, the route files in `app/routes/dashboard/`:

```
✅ layout.tsx       - Dashboard wrapper with sidebar
✅ index.tsx        - Dashboard overview (homepage)
✅ accounts.tsx     - Bank accounts page
✅ companies.tsx    - Companies management page
✅ marketplace.tsx  - Product marketplace page
✅ stocks.tsx       - Stock market page
❌ chat.tsx         - REMOVED
❌ settings.tsx     - REMOVED
❌ game.tsx         - REMOVED (split into separate pages)
```

Route configuration in `app/routes.ts`:

```typescript
export default [
  layout("routes/dashboard/layout.tsx", [
    index("routes/dashboard/index.tsx"),
    route("accounts", "routes/dashboard/accounts.tsx"),
    route("companies", "routes/dashboard/companies.tsx"),
    route("marketplace", "routes/dashboard/marketplace.tsx"),
    route("stocks", "routes/dashboard/stocks.tsx"),
  ]),
  route("sign-in/*", "routes/sign-in.tsx"),
  route("sign-up/*", "routes/sign-up.tsx"),
] satisfies RouteConfig;
```

### Verification

✅ Dev server starts without errors
✅ All routes accessible:

- http://localhost:5173/ - Dashboard
- http://localhost:5173/accounts - Accounts
- http://localhost:5173/companies - Companies
- http://localhost:5173/marketplace - Marketplace
- http://localhost:5173/stocks - Stock Market

---

## General Troubleshooting Steps

### When Routes Won't Load

#### 1. Check File Existence

```bash
ls -la app/routes/dashboard/
```

Ensure all files referenced in `routes.ts` actually exist.

#### 2. Check Route Configuration

Open `app/routes.ts` and verify:

- All paths are correct
- No duplicate route IDs
- Paths are relative to `app/` directory
- Files have `.tsx` extension

#### 3. Check for Orphaned Route Files

```bash
# List all .tsx files in routes directory
find app/routes -name "*.tsx"

# Compare with routes.ts configuration
```

Remove any `.tsx` files NOT in your `routes.ts` config.

#### 4. Clear ALL Caches

```bash
# Clear React Router cache
rm -rf .react-router

# Clear build cache
rm -rf build

# Clear Vite cache
rm -rf node_modules/.vite

# Optional: Clear node_modules (nuclear option)
rm -rf node_modules
npm install
```

#### 5. Check for TypeScript Errors

```bash
npx tsc --noEmit
```

Fix any TypeScript errors before restarting.

#### 6. Restart Dev Server

```bash
npm run dev
```

### When Components Won't Render

#### Check for "use client" Directives

```bash
grep -r "use client" app/components/
grep -r "use client" app/routes/
```

If found, **remove them** - they're not supported in React Router v7.

#### Check Import Paths

Common issues:

- `../../../convex/_generated/api` - Should work from `app/routes/dashboard/`
- `~/components/...` - Alias for `app/components/...`
- Relative imports - Count the `../` carefully

#### Check for Missing Dependencies

```bash
npm list convex react-router @clerk/react-router
```

### When Nothing Works

#### Nuclear Option: Full Reset

```bash
# Stop dev server (Ctrl+C)

# Remove all caches
rm -rf .react-router build node_modules/.vite node_modules

# Reinstall dependencies
npm install

# Rebuild
npm run build

# Start dev server
npm run dev
```

---

## Common Errors and Solutions

### Error: "Cannot read properties of null (reading 'useContext')"

**Solution**: Remove all "use client" directives
See: [FIXES_APPLIED.md](./FIXES_APPLIED.md)

### Error: "Failed to load url /app/routes/..."

**Solution**: Clear caches and remove old route files
See: This document (above)

### Error: "No route matches URL"

**Solution**: Check `routes.ts` configuration matches your file structure

### Error: "Module not found"

**Solution**:

1. Check import paths
2. Verify file exists
3. Check tsconfig.json paths
4. Clear Vite cache

### Error: "Duplicate route ID"

**Solution**: Check routes.ts for duplicate `route()` calls with same ID

---

## Maintenance Best Practices

### When Adding New Routes

1. Create the route file in `app/routes/`
2. Add to `app/routes.ts`
3. No cache clearing needed (usually)
4. Dev server hot-reloads automatically

### When Removing Routes

1. Remove from `app/routes.ts` first
2. Delete the route file
3. Clear caches: `rm -rf .react-router build node_modules/.vite`
4. Restart dev server

### When Restructuring Routes

1. Plan the new structure
2. Update `app/routes.ts`
3. Move/rename route files
4. **Clear ALL caches**
5. Remove old/orphaned files
6. Restart dev server

### Regular Maintenance

```bash
# Weekly: Clear build artifacts
rm -rf build .react-router

# Monthly: Full dependency refresh
rm -rf node_modules package-lock.json
npm install
```

---

## Prevention Tips

1. **Always update routes.ts when adding/removing route files**
2. **Delete old files immediately** - Don't leave orphaned routes
3. **Clear caches after major route changes** - Save yourself debugging time
4. **Use descriptive file names** - Makes debugging easier
5. **Keep route structure flat** - Avoid deep nesting
6. **Test immediately after changes** - Catch issues early

---

## Debug Mode

To see detailed React Router logs:

```bash
DEBUG=react-router:* npm run dev
```

To see Vite debug info:

```bash
VITE_DEBUG=true npm run dev
```

---

**Status**: ✅ Issue Resolved
**Date**: October 4, 2025
**App**: Running successfully at http://localhost:5173/
