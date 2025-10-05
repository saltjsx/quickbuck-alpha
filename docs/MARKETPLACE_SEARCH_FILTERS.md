# Marketplace Search & Filters

## Overview

The marketplace now features a comprehensive search and filtering system that allows players to easily find products by name, company, tags, price range, and more. Each product card displays the company logo for easy brand recognition.

## Features

### 1. Search Functionality

**Text Search**

- Search across product names, descriptions, and company names
- Real-time filtering as you type
- Case-insensitive search
- Located at the top of the marketplace with a search icon

**Usage:**

```
Type in search bar → Results filter instantly
Example: "phone" finds all phones, "tech" finds tech products, "Apple" finds Apple products
```

### 2. Company Filter

**Filter by Company**

- View all available companies as filter buttons
- Each company button shows the company logo (if available)
- Click to filter by specific company
- Click again to deselect
- "All Companies" button to reset company filter

**Visual Elements:**

- Company logo appears on button
- Active filter highlighted with primary color
- Inactive filters shown as outline buttons

### 3. Tag Filtering

**Dynamic Tag System**

- All unique tags from products displayed as clickable badges
- Multiple tags can be selected simultaneously
- Products matching ANY selected tag will be shown
- Tags are sorted alphabetically
- Click tag badge to toggle selection

**Use Cases:**

- Find all "Electronics" products
- Combine "Gaming" + "Accessories"
- Browse by category like "Clothing", "Food", "Software"

### 4. Price Range Filters

**Four Price Tiers:**

- **All Prices**: No price filtering (default)
- **Under $50**: Budget-friendly items
- **$50 - $200**: Mid-range products
- **$200+**: Premium items

**Implementation:**

```typescript
if (priceRange === "low") matchesPrice = product.price < 50;
else if (priceRange === "medium")
  matchesPrice = product.price >= 50 && product.price < 200;
else if (priceRange === "high") matchesPrice = product.price >= 200;
```

### 5. Sorting Options

**Four Sort Methods:**

1. **Name A-Z** (Default)

   - Alphabetical sorting by product name
   - Consistent and predictable ordering

2. **Price: Low to High**

   - Cheapest products first
   - Great for bargain hunting

3. **Price: High to Low**

   - Most expensive products first
   - Perfect for premium shopping

4. **Most Popular**
   - Sorted by total sales (highest first)
   - See what other players are buying

### 6. Company Logo Display

**Product Cards Enhancement**
Every product now displays:

- Company logo (small icon next to company name)
- Company name
- Company ticker symbol (if company is public)

**Visual Layout:**

```
[Product Image]
Product Name
[Logo] by Company Name [TICKER]
Description...
Price | Sales
[Tags]
[Purchase Button]
```

### 7. Filter Management

**Clear Filters Button**

- Appears when any filter is active
- One-click reset of all filters
- Returns to default view (all products, sorted by name)

**Active Filters Detection:**
System tracks: search query, company filter, tag selection, price range, sort order

## User Interface Components

### Search Bar Card

```tsx
<Card>
  <CardContent>
    - Search input with icon - Clear filters button (conditional)
  </CardContent>
</Card>
```

### Filters Card

```tsx
<Card>
  <CardHeader>Filters & Sorting</CardHeader>
  <CardContent>
    - Company buttons - Tag badges - Price range buttons - Sort options
  </CardContent>
</Card>
```

### Products Display Card

```tsx
<Card>
  <CardHeader>- Product count - Filter status message</CardHeader>
  <CardContent>
    - Products grid (responsive) - Empty state (if no results)
  </CardContent>
</Card>
```

## Filtering Logic

### Multi-Filter Combination

All filters work together using AND logic:

```typescript
matchesSearch AND matchesCompany AND matchesTags AND matchesPrice
```

**Example:**

- Search: "phone"
- Company: "TechCorp"
- Tags: ["Electronics", "Mobile"]
- Price: "$50-$200"

Result: Shows phones from TechCorp with Electronics OR Mobile tags priced $50-$200

### Tag Logic

Tags use OR logic within the selection:

```typescript
product.tags.some((tag) => selectedTags.has(tag));
```

If you select ["Gaming", "Tech"], products with EITHER tag will show.

## Enhanced Product Data

### Backend Changes

Updated `getActiveProducts` query to include:

```typescript
{
  ...product,
  companyName: company?.name || "Unknown",
  companyLogoUrl: company?.logoUrl,
  companyTicker: company?.ticker,
}
```

### Frontend Display

Each product card now shows:

- Product image (if available)
- Product name
- Company logo + name + ticker
- Description (clamped to 2 lines)
- Price (green, large)
- Total sales (gray, small)
- Tags (clickable badges)
- Purchase button

## Responsive Design

### Grid Layout

- **Mobile**: 1 column
- **Tablet (md)**: 2 columns
- **Desktop (lg)**: 3 columns

### Filter Buttons

- Flex wrap for overflow
- Responsive sizing
- Touch-friendly on mobile

## State Management

```typescript
const [searchQuery, setSearchQuery] = useState("");
const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
const [priceRange, setPriceRange] = useState<"all" | "low" | "medium" | "high">(
  "all"
);
const [sortBy, setSortBy] = useState<
  "name" | "price-low" | "price-high" | "sales"
>("name");
```

All state is local to the component and updates trigger immediate re-filtering via `useMemo`.

## Performance Optimizations

### useMemo for Filtering

```typescript
const filteredProducts = useMemo(() => {
  // Filter and sort logic
}, [products, searchQuery, selectedCompany, selectedTags, priceRange, sortBy]);
```

Benefits:

- Only recomputes when dependencies change
- Prevents unnecessary re-renders
- Smooth user experience

### Company/Tag Extraction

```typescript
const { companies, allTags } = useMemo(() => {
  // Extract unique values
}, [products]);
```

Computed once when products load, cached thereafter.

## User Experience Features

### Visual Feedback

- **Active filters**: Primary color background
- **Inactive filters**: Outline style
- **Hover states**: All interactive elements
- **Loading states**: Spinner during data fetch
- **Empty states**: Helpful messages

### Interactive Tags

- Product tags are clickable
- Clicking adds tag to filter
- Visual consistency with filter tags

### Result Count

Dynamic header showing:

- Number of products found
- "Filtered results" or "All available products"

### Clear Filters

- Only shows when filters active
- Icon + text for clarity
- Resets everything to defaults

## Empty States

### No Products at All

```
[ShoppingBag Icon]
"No products available yet"
"Create a company and add products to get started!"
```

### No Results from Filters

```
[ShoppingBag Icon]
"No products match your filters"
"Try adjusting your search or filters"
```

## Integration Points

### MarketplaceTab Component

Also updated to show company logos:

- Used in dashboard layouts
- Matches main marketplace styling
- Includes company branding

### Collections System

- Purchase buttons integrated
- Balance checking
- Toast notifications
- Disabled states for insufficient funds

## Future Enhancements

Potential additions:

1. **Advanced Filters**

   - Sales range (low/high sellers)
   - Date added (new arrivals)
   - Company rating/reputation
   - Multiple price ranges

2. **Saved Searches**

   - Save filter combinations
   - Quick access to favorites
   - Personal recommendations

3. **Comparison Tool**

   - Compare multiple products
   - Side-by-side pricing
   - Feature comparison

4. **Wishlist**

   - Save products for later
   - Price drop notifications
   - Quick purchase from wishlist

5. **Filter Presets**

   - "Budget items"
   - "Trending now"
   - "New arrivals"
   - "Premium collection"

6. **Search History**

   - Recent searches
   - Popular searches
   - Search suggestions

7. **Company Profiles**
   - Click company logo/name to view profile
   - All products by company
   - Company statistics

## Technical Implementation

### File Locations

**Backend:**

- `convex/products.ts`: Updated `getActiveProducts` query

**Frontend:**

- `app/routes/dashboard/marketplace.tsx`: Full marketplace with filters
- `app/components/game/marketplace-tab.tsx`: Tab view with logos

### Dependencies

- `lucide-react`: Icons (Search, X, SlidersHorizontal, ShoppingCart, ShoppingBag)
- UI Components: Card, Badge, Button, Input
- React: useState, useMemo for state and memoization

### Key Functions

```typescript
// Toggle tag selection
const toggleTag = (tag: string) => {
  setSelectedTags((prev) => {
    const next = new Set(prev);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    return next;
  });
};

// Clear all filters
const clearFilters = () => {
  setSearchQuery("");
  setSelectedCompany(null);
  setSelectedTags(new Set());
  setPriceRange("all");
  setSortBy("name");
};
```

## Accessibility

- Proper labeling for filters
- Keyboard navigation support
- Clear button text
- Visual indicators for active states
- Screen reader friendly
- Touch targets sized appropriately

## Testing Scenarios

1. **Search Functionality**

   - Empty search shows all
   - Partial matches work
   - No matches shows empty state

2. **Company Filter**

   - Single company selection
   - Toggle on/off
   - Works with other filters

3. **Tag Combinations**

   - Single tag
   - Multiple tags
   - Tag + other filters

4. **Price Ranges**

   - Each range works correctly
   - Boundary cases ($50, $200)
   - Combined with search

5. **Sorting**

   - Each sort option
   - Maintains filters
   - Correct ordering

6. **Clear Filters**
   - Resets all filters
   - Returns to default view
   - Button shows/hides correctly

## Summary

The enhanced marketplace provides:

- ✅ Fast, intuitive search
- ✅ Multiple filter options
- ✅ Company branding with logos
- ✅ Flexible sorting
- ✅ Responsive design
- ✅ Clear visual feedback
- ✅ Performance optimized
- ✅ Great user experience

Players can now easily find exactly what they're looking for in the marketplace!
