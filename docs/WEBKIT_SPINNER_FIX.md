# WebKit Browser Infinite Spinner Fix

## Problem

On WebKit browsers (Safari, iOS Safari), the dashboard UI would display an infinite loading spinner that could only be bypassed by toggling the sidebar. This was a critical UX issue affecting all Safari users.

## Root Causes Identified

### 1. Race Condition in `useIsMobile` Hook

The `useIsMobile` hook was initializing its state as `undefined`, then converting it to `false` with `!!isMobile`. This caused:

- Hydration mismatches between server and client
- Potential rendering issues on WebKit browsers
- Sidebar context initialization problems

### 2. Dashboard Layout Initialization Race

The dashboard layout's `useEffect` for user/account initialization was running asynchronously without waiting for completion before rendering children. This meant:

- Child routes (like `/dashboard`) would try to query data before the account was initialized
- Queries would return `undefined` indefinitely on some browsers
- WebKit browsers were particularly susceptible to this race condition

### 3. Loading State Logic

The dashboard index page only checked for `personalAccount === undefined` without checking if other critical queries were also loading, leading to inconsistent loading states.

### 4. Sidebar Hydration Issues

The sidebar wasn't marking when hydration was complete, which could cause WebKit browsers to get confused about the initial render state.

## Solutions Applied

### 1. Fixed `useIsMobile` Hook (`app/hooks/use-mobile.ts`)

```typescript
// Before: initialized as undefined
const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);
return !!isMobile; // false for undefined

// After: initialized with proper default
const [isMobile, setIsMobile] = useState<boolean>(() => {
  if (typeof window !== "undefined") {
    return window.innerWidth < MOBILE_BREAKPOINT;
  }
  return false;
});
return isMobile; // Always boolean
```

**Benefits:**

- Eliminates undefined state
- Prevents hydration mismatches
- Provides consistent boolean return value

### 2. Added Initialization Guard in Layout (`app/routes/dashboard/layout.tsx`)

```typescript
const [isInitialized, setIsInitialized] = useState(false);

useEffect(() => {
  const initUser = async () => {
    try {
      await upsertUser();
      await initializeAccount({});
      setIsInitialized(true);
    } catch (error) {
      console.error("Error initializing user:", error);
      setIsInitialized(true); // Prevent infinite loading on error
    }
  };
  initUser();
}, [upsertUser, initializeAccount]);

// Only render children after initialization
{
  isInitialized ? <Outlet /> : <LoadingSpinner />;
}
```

**Benefits:**

- Ensures user/account initialization completes before rendering child routes
- Prevents queries from running before data is ready
- Shows proper loading state during initialization
- Gracefully handles errors

### 3. Improved Loading State Logic (`app/routes/dashboard/index.tsx`)

```typescript
// Before: Only checked personalAccount
if (personalAccount === undefined) { ... }

// After: Checks multiple critical queries
const isLoading = personalAccount === undefined || companies === undefined;
if (isLoading) { ... }
```

**Benefits:**

- More comprehensive loading detection
- Prevents partial data rendering
- Better user experience

### 4. Added Hydration Marker to Sidebar (`app/components/ui/sidebar.tsx`)

```typescript
const [isHydrated, setIsHydrated] = useState(false);

useEffect(() => {
  setIsHydrated(true);
}, []);

return (
  <div data-hydrated={isHydrated} ...>
    {children}
  </div>
);
```

**Benefits:**

- Marks when client-side hydration is complete
- Helps with debugging hydration issues
- Can be used for conditional CSS if needed

## Testing Recommendations

1. **WebKit Browsers:**

   - Test on Safari (macOS)
   - Test on Safari (iOS)
   - Test on any WebKit-based browsers

2. **Test Scenarios:**

   - Fresh page load (hard refresh)
   - Navigation from sign-in
   - Direct URL access to `/dashboard`
   - Slow network conditions
   - Toggle sidebar multiple times

3. **Expected Behavior:**
   - Single loading spinner that disappears when data loads
   - No infinite spinning
   - Sidebar toggle should not affect loading state
   - Dashboard loads consistently across all browsers

## Technical Details

### Why WebKit Was Affected

WebKit browsers have stricter timing around:

- CSS custom property calculations
- React hydration timing
- Animation frame timing
- Query suspension/resumption

The combination of undefined states, race conditions, and sidebar rendering created a perfect storm where WebKit browsers would get stuck in a loading state.

### Why Toggling Sidebar Fixed It

Toggling the sidebar forced:

- A complete re-render of the sidebar context
- Re-evaluation of the `isMobile` state
- Re-mounting of child components
- Convex queries to re-subscribe

This "reset" would break the infinite loop, but wasn't a proper fix.

## Prevention

To prevent similar issues in the future:

1. **Always initialize hooks with proper defaults** - avoid `undefined` states
2. **Use initialization guards for async operations** - wait for setup before rendering
3. **Check multiple loading states** - don't rely on single query check
4. **Add hydration markers** - help with SSR/client debugging
5. **Test on WebKit browsers early** - they often expose timing issues

## Files Modified

1. `app/hooks/use-mobile.ts` - Fixed undefined state
2. `app/routes/dashboard/layout.tsx` - Added initialization guard
3. `app/routes/dashboard/index.tsx` - Improved loading state
4. `app/components/ui/sidebar.tsx` - Added hydration marker

## Additional Notes

This fix addresses a common pattern in React applications where:

- Async initialization happens in `useEffect`
- Child components assume data is ready
- Browser-specific timing causes race conditions

The solution ensures proper initialization order and eliminates undefined states that can cause hydration mismatches on WebKit browsers.
