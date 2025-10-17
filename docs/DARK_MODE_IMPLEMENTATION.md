# Dark Mode Implementation for QuickBuck

## Overview
Added a complete dark mode implementation to the QuickBuck game with a toggle button in the site header. The dark mode automatically applies to all game components using Tailwind CSS's dark mode support.

## Changes Made

### 1. Dark Mode Hook (`app/hooks/use-dark-mode.ts`)
Created a custom React hook to manage dark mode state:
- Detects current theme from localStorage and DOM
- Provides `toggleDarkMode()` function to switch themes
- Persists preference to localStorage
- Returns `mounted` state to prevent hydration mismatches

### 2. Dark Mode Toggle Component (`app/components/dark-mode-toggle.tsx`)
Created a reusable toggle button component:
- Displays Sun icon in dark mode, Moon icon in light mode
- Uses shadcn UI Button component for consistency
- Includes proper accessibility features (sr-only labels, title attributes)
- Integrates with the `useDarkMode` hook

### 3. Site Header Update (`app/components/dashboard/site-header.tsx`)
Updated the header to include the dark mode toggle:
- Added `<DarkModeToggle />` to the header's right side
- Maintains existing sidebar trigger and separator
- Placed in the right-aligned action area

### 4. Root Layout Enhancement (`app/root.tsx`)
Added theme initialization script:
- Runs before React hydration to prevent flash of wrong theme
- Reads localStorage for saved theme preference
- Applies dark mode class to HTML element on page load
- Falls back to light mode if no preference is saved

## How It Works

### Light Mode (Default)
- Uses the OKLch color scheme defined in `:root` variables
- Light backgrounds, dark text
- Optimized for daylight viewing

### Dark Mode
- Uses the color scheme defined in `.dark` class
- Dark backgrounds (#3F2D4B equivalent), light text
- All colors are carefully calibrated for low-light viewing
- Shadows are more prominent for depth perception

### Theme Persistence
1. User clicks toggle button
2. Theme preference is saved to localStorage
3. DOM class is updated (`dark` class added/removed)
4. Tailwind CSS applies dark mode styles
5. On next visit, script applies saved theme before React loads

## Components Affected
All UI components throughout the game automatically support dark mode:
- Dashboard cards and panels
- Company/Stock cards
- Modals and dialogs
- Buttons and inputs
- Tables and lists
- Sidebars and headers
- Charts and visualizations

## Browser Support
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- localStorage required for persistence
- Graceful fallback to light mode if localStorage unavailable

## Future Enhancements
- Add system theme preference detection (prefers-color-scheme)
- Add keyboard shortcut for quick toggle (e.g., Ctrl+Shift+D)
- Remember user's scroll position when toggling theme
- Add theme transition animations

## Testing Checklist
- [ ] Toggle button appears in header
- [ ] Theme persists across page refreshes
- [ ] All game components display correctly in dark mode
- [ ] Text is readable in both light and dark modes
- [ ] Colors maintain proper contrast ratios
- [ ] No FOUC (Flash of Unstyled Content) on page load
