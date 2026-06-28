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
