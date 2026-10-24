# FixNearMe

FixNearMe tracks neighborhood problems from resident submission through staff resolution. The repository contains a React/Vite/Tailwind client and a Node.js/Express/Mongoose API backed by MongoDB. Admins create staff accounts for a selected category; super admins assign matching staff to reports.

## Requirements

- Node.js 20 or newer
- MongoDB 6.0 or newer; transaction workflows require a replica set (MongoDB Atlas provides one)

## Run locally

1. Connect MongoDB Compass to a MongoDB deployment and create/select the `fixnearme` database. Compass is the database client; `MONGODB_URI` must point to the MongoDB server, not to Compass.
2. Copy `.env.example` to `.env`, set `MONGODB_URI` and `MONGODB_DATABASE`, and set a random `JWT_SECRET` of at least 32 characters. For Atlas, use the deployment connection string and database user credentials.
3. Install API dependencies in the repository root with `npm install` and frontend dependencies with `npm --prefix client install`.
4. Create the collections and indexes and seed built-in categories with `npm run migrate`.
5. Create the first super admin in a private terminal:

   ```powershell
   $env:SUPER_ADMIN_NAME = "FixNearMe Admin"
   $env:SUPER_ADMIN_EMAIL = "admin@example.com"
   $env:SUPER_ADMIN_PASSWORD = "a-long-unique-password"
   npm run create:super-admin
   Remove-Item Env:SUPER_ADMIN_NAME, Env:SUPER_ADMIN_EMAIL, Env:SUPER_ADMIN_PASSWORD
   ```

   The bootstrap script refuses to create another super admin after one exists. Never commit the environment values.

6. Run the API with `npm run dev` (port 5000 by default).
7. In a second terminal, run the frontend with `npm run client:dev` and open the Vite URL shown in the terminal (normally `http://localhost:5173`). Set `client/.env` from `client/.env.example` if the API uses a different URL.
8. Create a production frontend bundle with `npm run client:build`.
9. Run backend unit tests with `npm test`.

To reset an existing super-admin password, set `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` only in the current terminal and run `npm run reset:super-admin`. The command updates only a `super_admin` account matching that email; it does not save the plaintext password in the database or project files. Clear those terminal variables afterward.

## Roles

- **Resident:** register, sign in, submit and confirm reports.
- **Staff:** see only reports assigned to them, add work notes, and submit a completion photo for admin review.
- **Admin:** review all reports, approve or return completion photos, manage report categories, create staff accounts for a selected category, and change report priority and notes.
- **Super admin:** all admin capabilities, deactivate staff accounts, and assign or unassign staff on reports. Each staff account belongs to one category.

Registration always creates a resident. The only initial super admin is created through the one-time local bootstrap script. Tokens are signed JWTs; each request reloads the active role from MongoDB so deactivated accounts lose access immediately.

## API

All endpoints use `/api`. Protected routes accept `Authorization: Bearer <token>`. JSON errors use `{ "error": { "code", "message", "details?" } }`; successful responses use `{ "data": ... }`.

| Method and path                              | Access              | Purpose                                                                                                                  |
| -------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `GET /health`                                | Public              | API and database health                                                                                                  |
| `POST /auth/register`                        | Public              | Create resident account (`name`, `email`, `password`)                                                                    |
| `POST /auth/login`                           | Public              | Get a signed token                                                                                                       |
| `GET /auth/me`                               | Signed in           | Current account                                                                                                          |
| `GET /reports`                               | Public              | Search (`search`), filters, `page`, `limit`                                                                              |
| `GET /reports/:id`                           | Public              | Report details                                                                                                           |
| `GET /reports/:id/updates`                   | Public              | Report history; staff can read history only for assigned reports                                                         |
| `POST /reports`                              | Public or signed in | Submit a report with optional `image` upload                                                                             |
| `POST /reports/check-duplicates`             | Public              | Rule-based suggestions; does not merge or alter reports                                                                  |
| `POST /reports/:id/confirm`                  | Signed in           | Confirm a report once per account                                                                                        |
| `GET /reports/:id/updates`                   | Public              | Chronological status, priority, assignment, and note history                                                             |
| `GET /dashboard/stats`                       | Public              | Counts by status/category, urgent/unassigned totals, recent reports                                                      |
| `GET /admin/reports`                         | Admin, super admin  | All reports for administration                                                                                           |
| `PATCH /admin/reports/:id`                   | Admin, super admin  | Update priority/note and status; assignment fields are super-admin only. Resolution must use the review route            |
| `PATCH /admin/reports/:id/review-resolution` | Admin, super admin  | Approve a staff completion photo (`decision: approve`) or request more work (`decision: request_changes`, with a reason) |
| `GET /admin/categories`                      | Admin, super admin  | List categories with report/staff counts                                                                                 |
| `POST /admin/categories`                     | Admin, super admin  | Create a category (`name`, optional `description`); its key is generated from its name                                   |
| `PATCH /admin/categories/:slug`              | Admin, super admin  | Edit a category name/description or restore an archived category                                                         |
| `DELETE /admin/categories/:slug`             | Admin, super admin  | Archive a category while preserving report history                                                                       |
| `GET /categories`                            | Public              | List active categories used by report submission and filters                                                             |
| `GET /reports/staff/assigned`                | Staff               | Current staff member's assigned work only                                                                                |
| `PATCH /reports/staff/reports/:id`           | Assigned staff      | Set `in_progress` or submit `resolved` with a required `image` file; the report becomes `pending_verification`           |
| `GET /admin/staff`                           | Admin, super admin  | Staff list and workload                                                                                                  |
| `POST /admin/staff`                          | Admin, super admin  | Create staff (`name`, `email`, `password`, minimum 12 chars, and active `category` key)                                  |
| `PATCH /admin/staff/:id`                     | Super admin         | Activate/deactivate staff (`is_active`)                                                                                  |

Categories are managed by admins. New reports can use active categories only. Category keys remain stable if the display name changes; archived categories stay attached to historical reports and can be restored. Super admins can assign a report only to active staff in that report's category; the admin screen filters the staff list accordingly, and the API enforces the same rule. Staff report lists, detail endpoints, and history are scoped to the signed-in staff member's assigned reports. Statuses: `reported`, `under_review`, `in_progress`, `pending_verification`, `resolved`, `rejected`. A staff completion submission remains `pending_verification` until an admin approves its photo; requesting changes returns it to `in_progress`. Only approved completion photos are shown as resolved proof to the community. Priorities: `low`, `medium`, `high`, `urgent`.

Report submission accepts `multipart/form-data`; use `image` for one optional JPEG, PNG, or WebP file up to 5 MB. The API checks the file signature, creates a random server-side filename, stores it under the ignored local `uploads/` directory, and returns its public `image_url`. Uploaded images are displayed on report details. Run `npm run migrate` once to initialize MongoDB indexes and built-in categories. Local filesystem uploads suit development; use durable object storage for production deployments.

Explore reports can be switched between list and map views. The map displays reports that include coordinates and uses OpenStreetMap raster tiles with visible attribution. Reporters can choose a point on the map or use browser geolocation; location permission requires HTTPS or localhost. The neighborhood field remains manually entered. OpenStreetMap's public tile servers are best-effort and have usage limits; follow the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/) and use a suitable hosted tile provider for higher-traffic production deployments.

Each report also includes a **Civic Priority Brief**, an explainable triage aid based on the selected priority, possible safety/health/access phrases, neighbor confirmations, and open-report age. It ranks the admin queue and recommends a next step. It never changes priority or dispatches staff automatically; an administrator reviews the report and makes those decisions.

To assign or clear a staff member, a super admin sends `PATCH /api/admin/reports/:id` with `{ "assigned_to": 42 }` or `{ "assigned_to": null }`. Assignment requires an active staff account whose category matches the report. Every assignment/status/priority change is recorded in `report_updates` in the same transaction as the report update.

## Query examples

```http
POST /api/reports
Content-Type: application/json

{
  "title": "Broken streetlight near the clinic",
  "description": "The light has been out for three nights and the road is very dark.",
  "category": "streetlight",
  "neighborhood": "Bole",
  "landmark": "Bole clinic entrance"
}
```

```http
PATCH /api/admin/reports/17
Authorization: Bearer <super-admin-token>
Content-Type: application/json

{ "assigned_to": 42, "status": "under_review", "priority": "high", "note": "Assigned to the electrical repairs team." }
```

## Data and implementation notes

- Mongoose schemas and indexes are defined in `src/db/models.js`; report filters use MongoDB queries and deterministic date/id ordering.
- Duplicate suggestions use category, neighborhood, landmark, text overlap, and distance when coordinates exist. `DUPLICATE_THRESHOLD` controls a 0–100 score; results are suggestions only.
- Reports and assignment/status history persist in MongoDB. Each report can be confirmed once per signed-in account using a unique compound index.
- Passwords use bcrypt; authentication and report creation/duplicate checks have focused rate limits, and CORS origins are set with comma-separated `FRONTEND_ORIGIN` values.
- Staff initial passwords are created by the super admin. Password change and reset flows are not included in this first version.
- No secrets are included in health responses. Add production TLS, secret rotation, operational backups, and a durable image storage provider before deploying publicly.

## Validation checklist

- `npm test` covers report-field validation, coordinate bounds and normalization, duplicate scoring, scoring reasons, and no mutation of stored reports.
- With MongoDB available, verify health, register/login, create a report, query it after restarting the API, search and filter with pagination, view history, confirm twice (the second response should be 409), and verify duplicate checks only suggest.
- Sign in as the bootstrapped super admin, create a staff user, assign a report, sign in as that staff user, and confirm the assignment appears in their queue. Try the same admin endpoints as a resident and verify the API returns 403.
- In the client, submit valid and invalid forms, use duplicate suggestions, search/filter/paginate, inspect report history, reject with and without a reason, and retry after stopping the API. Failed requests should show an error and keep the form values.
- Resize to mobile and desktop widths; verify menus, forms, report cards, tables, keyboard focus, and status feedback remain usable.

Database integration checks require a configured MongoDB replica set and are not part of the isolated unit tests. The old SQL files under `src/db/migrations` are retained as historical MySQL schema documentation and are not run by `npm run migrate`.

`npm run migrate` prepares the MongoDB schema only; it does not copy data from an existing MySQL database. Keep the old MySQL database and its SQL files until any required user/report/history data has been exported and imported, then verify record counts and API behavior against MongoDB.

## Historical MySQL migrations

The SQL files are retained unchanged while the MongoDB migration is being validated:

| File                                     | Purpose                                                                                                                                                   | Dependencies                                                                                      |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `001_initial_schema.sql`                 | Creates users, reports, report updates, and report confirmations; defines initial role/status/priority enums, foreign keys, indexes, and full-text index. | Base migration; reports and history reference users. Updates and confirmations reference reports. |
| `002_report_image.sql`                   | Adds the initial report image URL column.                                                                                                                 | `001_initial_schema.sql`; alters `reports`.                                                       |
| `003_categories_and_staff_specialty.sql` | Creates and seeds categories, converts report category to a category reference, adds staff category, and assigns existing staff to `other`.               | `001_initial_schema.sql`; assumes category values can map to the seeded slugs.                    |
| `004_resolution_photo_review.sql`        | Adds `pending_verification` to report/history statuses and stores completion-photo URLs.                                                                  | `001_initial_schema.sql` and `002_report_image.sql`; alters both `reports` and `report_updates`.  |
| `005_notifications.sql`                  | Creates per-user report notifications with read state and lookup index.                                                                                   | `001_initial_schema.sql`; notification rows reference users and reports.                          |

Migration order was numeric filename order: `001` → `002` → `003` → `004` → `005`. The MongoDB application equivalents are the `User`, `Report`, `ReportUpdate`, `ReportConfirmation`, `Category`, and `Notification` models, plus the counter collection used to preserve the existing numeric API IDs. MongoDB does not enforce SQL foreign keys; relationship checks remain in the route logic and unique indexes.
