SDK Reference
The Databuddy SDK provides framework-specific components and a vanilla JavaScript library for tracking analytics events. Choose your preferred integration method.

SDK Version: 2.0.0+ | API: basket.databuddy.cc | CDN: cdn.databuddy.cc

Installation
React/Next.js
Vue
Vanilla JS

# Using bun (recommended)

bun add @databuddy/sdk

# Using npm

npm install @databuddy/sdk
Quick Start
React/Next.js
Vue
Vanilla JS
app/layout.tsx

import { Databuddy } from "@databuddy/sdk/react";
export default function RootLayout({
children,
}: {
children: React.ReactNode;
}) {
return (
<html lang="en">
<body>
<Databuddy
clientId={process.env.NEXT_PUBLIC_DATABUDDY_CLIENT_ID!}
trackWebVitals // Recommended for performance monitoring
trackErrors
enableBatching
/>
{children}
</body>
</html>
);
}
Configuration Options
Required Settings
All frameworks require your clientId from the Databuddy dashboard:

React/Next.js
Vue
Vanilla JS

import { Databuddy } from "@databuddy/sdk/react";
<Databuddy clientId="your-client-id" />
Core Tracking Features
These features are enabled by default:

Feature Default Description
trackScreenViews true Page views and route changes
trackPerformance true Page load times and navigation timing
trackSessions true User sessions with 30-minute timeout
Optional Features
Enable additional tracking as needed:

Feature Default Description
trackWebVitals false Core Web Vitals (LCP, FID, CLS, TTFB)
trackErrors false JavaScript errors and unhandled rejections
trackOutgoingLinks false Clicks on external links
trackScrollDepth false Scroll depth milestones (25%, 50%, 75%, 100%)
trackEngagement false Time on page and interaction counts
trackInteractions false Button clicks and form submissions
trackAttributes false Elements with data-track attributes
Example Configuration
React/Next.js
Vue
Vanilla JS

import { Databuddy } from "@databuddy/sdk/react";
<Databuddy
clientId="your-client-id"
trackWebVitals
trackErrors
trackOutgoingLinks
trackScrollDepth
trackEngagement
enableBatching
batchSize={20}
batchTimeout={5000}
disabled={process.env.NODE_ENV === "development"}
/>
Performance Options
Option Default Description
enableBatching false Group events into batches
batchSize 10 Events per batch (1-50)
batchTimeout 2000 Batch timeout in ms (100-30000)
enableRetries true Retry failed requests
maxRetries 3 Maximum retry attempts
initialRetryDelay 500 Initial retry delay in ms
samplingRate 1.0 Event sampling rate (0.0-1.0)
Advanced Options
Option Description
apiUrl Custom API endpoint (default: https://basket.databuddy.cc)
scriptUrl Custom script URL (default: https://cdn.databuddy.cc/databuddy.js)
disabled Disable all tracking (useful for development)
waitForProfile Wait for user profile before sending events
clientSecret Client secret for server-side operations (advanced)
sdk SDK name (default: web)
sdkVersion SDK version (auto-detected from package.json)
Privacy & Path Masking
Control which pages are tracked and how sensitive URL paths are handled:

Option Type Description
skipPatterns string[] Skip tracking on matching paths (e.g., ["/admin/**", "/private/*"])
maskPatterns string[] Mask sensitive URL segments in analytics (e.g., ["/users/*", "/orders/**"])
Pattern Syntax

- matches a single path segment: /users/\* matches /users/123 but not /users/123/settings
  ** matches multiple path segments: /admin/** matches /admin/users/edit/123
  Skip Patterns
  Prevent tracking on sensitive pages:

React/Next.js
Vue
Vanilla JS

<Databuddy
clientId="your-client-id"
skipPatterns={[
"/admin/**", // Skip all admin pages
"/private/*", // Skip direct private pages only
"/checkout/payment" // Skip specific payment page
]}
/>
Mask Patterns
Hide sensitive URL segments while preserving analytics structure:

React/Next.js
Vue
Vanilla JS

<Databuddy
clientId="your-client-id"
maskPatterns={[
"/users/*", // /users/123/profile → /users/*/profile
"/orders/**", // /orders/abc/items/xyz → /orders/*
"/documents/*" // /documents/secret.pdf → /documents/*
]}
/>
Masking Behavior
Pattern Original Path Masked Path Description
/users/_ /users/123 /users/_ Mask single segment
/users/_ /users/123/settings /users/_/settings Mask one segment, keep rest
/users/** /users/123/settings /users/\* Mask everything after prefix
/orders/** /orders/abc/items/xyz /orders/\* Mask all remaining segments
Privacy by Design: Use skip patterns for pages that should never be tracked, and mask patterns for pages where you need analytics but want to hide sensitive identifiers like user IDs, order numbers, or document names.

SDK Methods
Import and use these methods directly in your code:

Core Tracking Functions

import { track, clear, flush, trackError } from "@databuddy/sdk";
// Track custom events
await track("product_viewed", {
product_id: "P12345",
category: "Electronics",
price: 299.99
});
// Track errors
await trackError("API request failed", {
endpoint: "/api/products",
error_type: "network_error"
});
// Clear session data
clear();
// Flush queued events
flush();
track(eventName, properties)
Track custom events with optional properties:

import { track } from "@databuddy/sdk";
// Track a product view
await track("product_viewed", {
product_id: "P12345",
category: "Electronics",
price: 299.99,
currency: "USD"
});
// Track a button click
await track("button_click", {
button_text: "Add to Cart",
button_id: "add-to-cart-btn"
});
screenView(path, properties)
Manually track page views (useful for SPAs):

import { getTracker } from "@databuddy/sdk";
const tracker = getTracker();
tracker?.screenView("/dashboard", {
section: "analytics"
});
setGlobalProperties(properties)
Set properties that attach to all future events:

import { getTracker } from "@databuddy/sdk";
// After user login
const tracker = getTracker();
tracker?.setGlobalProperties({
user_id: "user-123",
plan: "premium"
});
trackError(message, properties)
Track error events with additional context:

import { trackError } from "@databuddy/sdk";
await trackError("API request failed", {
filename: "api.js",
lineno: 42,
error_type: "network_error"
});
clear()
Clear session and global properties (e.g., on logout):

import { clear } from "@databuddy/sdk";
clear();
flush()
Force immediate sending of queued events:

import { flush } from "@databuddy/sdk";
flush();
Standard Events
The SDK automatically tracks these events when enabled:

Event Trigger Key Properties
screen_view trackScreenViews={true} time_on_page, scroll_depth, interaction_count, has_exit_intent, is_bounce
page_exit Automatic on page unload time_on_page, scroll_depth, interaction_count, has_exit_intent, page_count, is_bounce
button_click trackInteractions={true} button_text, button_id, button_type, element_class
form_submit trackInteractions={true} form_id, form_name, form_type, success
link_out trackOutgoingLinks={true} href, text, target_domain
web_vitals trackWebVitals={true} fcp, lcp, cls, fid, ttfb, load_time, dom_ready_time, render_time, request_time
error trackErrors={true} message, filename, lineno, colno, stack, error_type
Custom Event Tracking
Track business-specific events with rich properties:

import { track } from "@databuddy/sdk";
// E-commerce events
await track("product_viewed", {
product_id: "P12345",
category: "Electronics",
price: 299.99,
currency: "USD"
});
await track("purchase_completed", {
order_id: "ORD-789",
revenue: 299.99,
currency: "USD",
payment_method: "credit_card"
});
// User engagement
await track("feature_used", {
feature: "export_data",
user_tier: "premium",
page: window.location.pathname
});
// Content interaction
await track("video_engagement", {
video_id: "intro-video",
action: "completed", // play, pause, complete
duration: 120,
timestamp: 45
});
Best Practices
Event Names: Use snake_case (e.g., signup_completed, product_viewed)
Properties: Include rich context but avoid PII (personally identifiable information)
Consistency: Use consistent property names across events for better analysis

import { track } from "@databuddy/sdk";
// ✅ Good
await track("purchase_completed", {
product_category: "software",
payment_method: "credit_card",
value: 299.99,
currency: "USD"
});
// ❌ Avoid
await track("purchase", {
email: "user@example.com", // PII violation
productCat: "software", // Inconsistent naming
Price: 299.99 // Inconsistent capitalization
});
Environment Setup
React/Next.js
Vue
Vanilla JS
.env.local

NEXT_PUBLIC_DATABUDDY_CLIENT_ID=your-client-id-here
Debugging & Testing
Development Mode
Disable tracking during development:

React/Next.js
Vue
Vanilla JS

<Databuddy
clientId={process.env.NEXT_PUBLIC_DATABUDDY_CLIENT_ID!}
disabled={process.env.NODE_ENV === "development"}
/>
Console Testing

import { track, isTrackerAvailable } from "@databuddy/sdk";
// Test if SDK tracker is available
console.log(isTrackerAvailable() ? "Tracker available ✅" : "Tracker not available ❌");
// Send test event using SDK
await track("test_event", { source: "console" });
// Check network requests in DevTools Network tab
// Look for requests to basket.databuddy.cc
// Test error tracking
import { trackError } from "@databuddy/sdk";
await trackError("Test error", { context: "debugging" });
Troubleshooting
Issue Solution
Events not appearing Check client ID, network requests, domain verification
TypeScript errors Ensure @databuddy/sdk is installed, TypeScript 4.5+
Script loading issues Verify CDN URL, check CSP rules, disable ad blockers
TypeScript Support
The SDK is fully typed and provides excellent TypeScript support:

import { track, getTracker, type DatabuddyTracker, type EventName, type PropertiesForEvent } from "@databuddy/sdk";
// Type-safe event tracking with SDK imports
await track("product_viewed", {
product_id: "P12345", // ✅ Type-safe
category: "Electronics",
price: 299.99
});
// Custom event with proper typing
await track("feature_used", {
feature: "export_data",
user_tier: "premium"
});
// Access tracker instance for advanced operations
const tracker: DatabuddyTracker | null = getTracker();
if (tracker) {
tracker.setGlobalProperties({ plan: "premium" });
}
// Type-safe custom events
type CustomEventName = "signup_completed" | "feature_used" | "purchase_completed";
await track<CustomEventName>("signup_completed", {
method: "email",
source: "landing_page"
});
Data Attributes for Automatic Tracking
Use data-track attributes for automatic event tracking:

<!-- Automatically tracks button_click event -->
<button data-track="signup_clicked" data-plan="premium">
  Sign Up
</button>
<!-- Tracks with additional properties -->
<a 
  href="/pricing" 
  data-track="pricing_link_clicked"
  data-source="header"
  data-user-type="visitor"
>
  View Pricing
</a>
When trackAttributes={true} is enabled, these elements will automatically send events with the specified properties.
