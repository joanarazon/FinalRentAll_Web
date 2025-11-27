# RentAll Web

RentAll is a peer-to-peer rentals marketplace frontend (React + Vite + Supabase). Users can list items for rent, discover and favorite items, start and track bookings, exchange messages, leave ratings, and file reports. Admins have dashboards, history, and moderation tools.

## What is RentAll?

RentAll connects people who have items with people who need them—short-term, flexible, and local-first. The app supports the full lifecycle: discovery → inquiry → booking → handoff → return → reviews. Both renters and owners interact through a streamlined, mobile-friendly UI.

## Core features

-   Discovery: search with typeahead, category and availability filters
-   Favorites: persistent favorites with a global badge and real-time updates
-   Bookings: renter/owner workflows with clear statuses (pending, on_the_way, ongoing, awaiting_owner_confirmation, completed, etc.)
-   Messaging & notifications: conversations around items with basic notifications
-   Ratings:
    -   Item reviews (per rental)
    -   Lessor reviews (one per reviewer across rentals)
-   Reports/Complaints:
    -   Item complaints are stored in `public.complaints`
    -   User/owner complaints are stored in `public.user_complaints`
    -   Admin pages for reviewing and resolving both
-   Admin insights: live KPIs, Transaction Tracking with filters, and moderation queues

…and more. The UI is modular so adding new flows and pages stays straightforward.

## Roles

-   Renter: discovers items, makes booking requests, leaves item and lessor reviews, files reports
-   Owner: lists items, manages availability and booking requests (confirm, reject, hold/maintenance), sees complaints on their items via admin review when applicable
-   Admin: reviews reports, monitors KPIs, audits Transaction Tracking, and resolves complaints

## Booking process (overview)

1. Browse & inquire: renter finds an item and selects dates/quantity
2. Request: a booking record is created (status: `pending`)
3. Owner action:
    - Confirm → proceeds toward handoff (e.g., `on_the_way` → `ongoing`)
    - Reject/Cancel → ends the request
    - Hold (maintenance) → temporarily pause availability/flow as configured
4. Handoff & rental:
    - `on_the_way` → item transit/handoff
    - `ongoing` → active rental period
5. Return flow:
    - Renter marks returned → `awaiting_owner_confirmation`
    - Owner confirms return → `completed`
6. Reviews: renter can leave an item review (per rental) and one overall lessor review

## Tech stack

-   React + Vite
-   Supabase JS client (`supabaseClient.js`)
-   Shadcn/ui components

## Quick start

1. Install dependencies

```powershell
npm install
```

2. Configure environment

Create a `.env` (or `.env.local`) and set your Supabase credentials:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

3. Run the app

```powershell
npm run dev
```

Build for production:

```powershell
npm run build
```

## Data model (overview)

Key tables used by the app (names referenced by the UI):

-   `users`, `items`, `rental_transactions`, `favorites`
-   `reviews` (item reviews) and `lessor_reviews` (lessor ratings)
-   `complaints` (item complaints)
-   `user_complaints` (reports about users/owners)

Note: ensure your Supabase project has RLS policies that allow reporters to insert and view their own complaints and allow admins to review and resolve reports. The UI expects admins to have `users.role = 'admin'`.

## Admin area

-   Dashboard with live KPIs (pending users/items, ongoing rentals, etc.)
-   Reported Items: reads from `complaints` and can mark reports as resolved
-   Reported Users: reads from `user_complaints` and can mark reports as resolved

## Reporting behavior

-   The `ReportDialog` component routes automatically:
    -   If `targetItemId` is provided → insert into `complaints`
    -   Else if `targetUserId` is provided → insert into `user_complaints`
-   Reasons should match your `complaint_reason_enum`. If a reason is unsupported, the app gracefully retries using `other` and informs the user.

## Scripts

-   `npm run dev` – Start the dev server
-   `npm run build` – Production build
-   `npm run preview` – Preview the production build locally
