# 🌱 LeftoverLove — Reduce Food Waste. Feed Communities.

> A community-driven food sharing platform that connects food donors with people in need through real-time maps, volunteer pickups, and a trust-based rating system.

---

## 🍽️ Features

| Role | Capabilities |
|------|-------------|
| 🧑‍🍳 **Donor** | Create food listings, track donations, view analytics & donation streaks |
| 🙋 **Receiver** | Browse nearby food, request pickups, track deliveries in real-time |
| 🚗 **Volunteer** | Accept delivery requests, live GPS location sharing |
| 🏢 **NGO** | Bulk food requests for organizations |
| 🛡️ **Admin** | User management, ban system, complaint handling |

### ✨ Platform Highlights
- 📍 Interactive food map with location-based filtering
- 🔔 Real-time notifications and in-app messaging
- 🤖 Smart food recommendations based on proximity
- ⏳ Countdown timers for expiring listings
- 🔐 Role-based access control
- 📊 Donation analytics dashboard
- 🎉 Pickup completion celebrations

---

## 🛠️ Built With

- **Frontend** — React + TypeScript + Vite
- **Backend** — Supabase (Auth, Database, Realtime, Storage)
- **Styling** — Tailwind CSS + shadcn/ui
- **Maps** — Leaflet.js
- **Charts** — Recharts

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) account

### Installation

**1. Clone the repository**
```bash
https://github.com/Kaviharan08/LeftOverLove-main_v2.git
cd LeftOverLove
```

**2. Install dependencies**
```bash
npm install --legacy-peer-deps
```

**3. Set up environment variables**

Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**4. Set up the database**

Go to your Supabase project → SQL Editor and run each file in `/supabase/migrations/` in order (they are named by date so run oldest first).

**5. Run the app**
```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## 📁 Project Structure

```
src/
├── components/        # Reusable UI components
├── pages/
│   ├── dashboard/     # Role-specific dashboards
│   ├── food/          # Food listing pages
│   └── admin/         # Admin pages
├── lib/               # Supabase queries & helpers
└── integrations/      # Supabase client & types
supabase/
└── migrations/        # Database migration files
```

---

## 🗄️ Database Migrations

Run these in order from `/supabase/migrations/` in your Supabase SQL Editor:

1. `initial_schema_roles_enums_tables`
2. `storage_food_images_bucket`
3. `pickup_requests_table_and_rls`
4. `enable_realtime_pickup_requests_food_listings`
5. `messages_table`
6. `fix_notifications_insert_policy`
7. `contact_messages_table`
8. `fix_handle_new_user_block_admin_self_assign`
9. `storage_avatars_bucket`
10. `food_listing_expiry_and_categories`
11. `add_ngo_role_and_organizations_table`
12. `ngo_pickup_request_policies`
13. `fix_pickup_request_update_policies`
14. `add_volunteer_location_columns`
15. `add_quantity_weight_to_food_listings`
16. `add_expiring_soon_status_and_archive_function`
17. `add_delivery_location_columns`
18. `fix_listing_completion_rls`
19. `fix_listing_status_rls_policy`
20. `add_missing_request_status_enum_values`

---

## 👤 Changing User Roles (Admin)

In your Supabase dashboard → SQL Editor:

```sql
UPDATE user_roles 
SET role = 'admin' 
WHERE user_id = 'paste-user-uuid-here';
```

Available roles: `donor`, `receiver`, `volunteer`, `ngo`, `admin`

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">Built with ❤️ to reduce food waste and feed communities.</p>
