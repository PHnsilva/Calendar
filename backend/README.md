# CalendarMate Backend

Spring Boot backend for bookings, OTP verification, admin/provider sessions, availability, history, routes, and finance integrations.

## Run And Build

```bash
./gradlew bootRun
./gradlew test
./gradlew build
```

On Windows PowerShell:

```powershell
.\gradlew.bat bootRun
.\gradlew.bat test
.\gradlew.bat build
```

## Public Booking Lookup And Cancellation

Customer lookup no longer depends on a manage token or browser storage:

```http
POST /api/servicos/public/lookup
Content-Type: application/json

{"phone":"31999999999"}
```

The response DTO contains only `eventId`, `serviceType`, `start`, and `status`. Cancellation uses `POST /api/servicos/public/cancel` with both `eventId` and `phone`; the service normalizes the phone and verifies ownership before persisting `CANCELLED`. Repeated cancellation is idempotent. A cancelled Google event is retained as transparent so it releases availability without deleting history.

Production must enable Google Calendar so events and occupied slots survive a process restart, and should also enable Supabase for resilient history snapshots. `DummyCalendarClient` and the in-memory history store are development fallbacks only. Apply `docs/supabase-admin-auth.sql` before or alongside deployment; the backend remains compatible while the optional cancellation metadata columns roll out.

The lookup and cancellation rate limits are configurable with `PUBLIC_BOOKING_*_RATE_*`. Forwarded IP headers remain ignored unless both `TRUST_PROXY_HEADERS=true` and an exact direct-proxy allowlist in `TRUSTED_PROXY_ADDRESSES` are configured.

The administrative history endpoint is `GET /api/servicos/admin/history`; the frontend requests today minus 29 days through today using `America/Sao_Paulo` calendar boundaries.

## Admin And Provider Registry

Production should use the Supabase `admin_users` table:

- `id`
- `phone_digits`
- `name`
- `role` (`OWNER` or `PROVIDER`)
- `active`

The no-Supabase fallback is `ADMIN_USERS`:

```env
ADMIN_USERS=31995438467|SG Admin|OWNER|owner-main;31900000001|Prestador 1|PROVIDER|provider-1;31900000002|Prestador 2|PROVIDER|provider-2;31900000003|Prestador 3|PROVIDER|provider-3
```

Replace placeholder provider phones before production. Adding a provider should be a new `admin_users` row or one new `ADMIN_USERS` entry.

## Workspace Authorization

Admin APIs require `X-ADMIN-SESSION`.

When the authenticated owner selects a provider workspace, clients also send:

```http
X-ADMIN-WORKSPACE: PROVIDER
X-ADMIN-PROVIDER-ID: provider-1
```

The backend resolves an effective provider principal for those requests. Provider workspaces can read/update only assigned active bookings and route details for assigned bookings. Owner-only endpoints reject provider workspace access, including history, finance, global availability blocks, assignment, deletion, bulk cancel, and cleanup.
