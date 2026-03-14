

# Implementation Plan: UI/UX Images, Analytics, Top Donor, and Food Listing Enhancements

This is a large set of changes. I recommend implementing them in 5 ordered phases across multiple messages to keep quality high and avoid errors.

---

## Phase 1: UI/UX Images Across Pages

Since we cannot install external image assets, we will use high-quality free images from Unsplash via direct URLs, wrapped in responsive containers with dark/light mode compatibility using overlays and opacity.

**Changes:**

- **Index.tsx (Main Page)**: Add a hero background image (food sharing/community) behind the existing gradient using `bg-cover` with an overlay. Add sustainability illustration SVGs as decorative elements in the "How It Works" and "Roles" sections.

- **Login.tsx**: Convert to a split-screen layout -- left side with a food donation illustration image, right side with the existing form. On mobile, the image becomes a subtle top banner.

- **Signup.tsx**: Same split-screen pattern with a different community/sharing image. The existing avatar upload placeholder already exists.

- **DonorDashboard.tsx**: Add a motivational banner card at the top with a food donation image and encouraging text like "Every donation counts."

- **ReceiverDashboard.tsx**: Add a community support banner image at the top of the dashboard.

- **FoodDetail.tsx / BrowseFood.tsx**: Already have food images on cards. Add a placeholder/fallback image when `image_url` is null so cards always show an image.

All images will use Unsplash source URLs (e.g., `https://images.unsplash.com/photo-...?w=800&q=80`) with `loading="lazy"`, responsive sizing, and dark mode overlays via `dark:opacity-80`.

---

## Phase 2: Donor Dashboard Analytics Graph

**Changes to DonorDashboard.tsx:**

- Compute weekly and monthly donation counts from `listings` array by filtering `created_at` dates
- Add two summary cards: "Donated This Week" and "Donated This Month"
- Add a Recharts `BarChart` showing donations per day for the last 7 days, and a toggle to switch to monthly view (last 30 days grouped by week)
- Use existing `recharts` dependency (already installed)

---

## Phase 3: Admin Dashboard - Top Donor of the Month

**Changes to AdminDashboard.tsx:**

- Query `food_listings` grouped by `donor_id` for the current month, join with `profiles` to get donor names
- Display a highlighted "Top Donor of the Month" card with donor name, avatar, and donation count
- Add a "Top 5 Donors" leaderboard list below it
- This requires a new query function in `src/lib/admin.ts`

---

## Phase 4: Food Listing Quantity & Weight Fields

**Database migration:**
- Add `quantity` (integer, nullable, default null) and `weight_kg` (numeric, nullable, default null) columns to `food_listings`

**Code changes:**
- **CreateListing.tsx / EditListing.tsx**: Add Quantity and Weight (kg) input fields
- **BrowseFood.tsx**: Display quantity/weight on listing cards
- **FoodDetail.tsx**: Show quantity and weight prominently
- **DonorDashboard.tsx**: Show quantity on listing cards

---

## Phase 5: Enhanced Expiry Handling

**Changes:**
- **BrowseFood.tsx**: Already calls `archive_expired_listings` RPC on load and shows `ExpiryBadge`. Enhance to filter out expired items from the grid and add an "Archived/Expired" collapsible section at the bottom.
- **FoodDetail.tsx**: If listing is expired, show a prominent warning banner and disable the "Accept & Claim" button.
- **CreateListing.tsx**: The expiry field already exists. No changes needed.
- The `archive_expired_listings` database function already handles automatic status updates.

---

## Technical Notes

- All Unsplash images will be served via URL parameters (`w=800&q=80`) for performance optimization
- Recharts is already installed -- no new dependencies needed
- One database migration is needed for quantity/weight columns
- All new UI will use existing Tailwind classes with `dark:` variants for dark mode support
- Mobile responsiveness maintained via existing `sm:`, `md:`, `lg:` breakpoint patterns

---

## Execution Order

I will implement these in order (Phase 1 through 5) across this message, making all file changes simultaneously where possible.

