# CalendarMate Module Boundaries

Date: 2026-06-16

This document defines ownership to make future Codex and human-review changes
localized and predictable.

## Frontend Boundaries

Dependency order:

`app -> pages -> widgets -> features -> entities -> shared`

Current compatibility paths:

- `src/app/router.tsx` remains the router entry.
- `src/app/providers.tsx` remains the provider entry.
- `src/lib/api-client.ts` remains the legacy HTTP client until callers migrate to
  `src/shared/api/http-client.ts`.
- `src/lib/query-keys.ts` remains the legacy query key source until callers
  migrate to `src/shared/api/query-keys.ts`.

New code should prefer:

- `src/shared/api/http-client.ts`
- `src/shared/api/api-error.ts`
- `src/shared/api/query-client.ts`
- `src/shared/api/query-keys.ts`

Feature ownership map:

| Current area | Target owner |
| --- | --- |
| `features/landing`, landing exports from `CalendarMateRoutes.tsx` | `pages/landing`, `widgets/landing-hero`, `widgets/service-carousel`, `widgets/public-navbar`, `widgets/client-footer` |
| `features/booking-form` | `features/booking-create`, `features/address-autocomplete`, `entities/booking`, `entities/address` |
| `features/otp` | `features/phone-verification` |
| `features/recovery` | `features/booking-recover` |
| `features/bookings` | `entities/booking`, `features/booking-edit`, `features/booking-cancel`, `widgets/booking-list-panel` |
| `features/admin` | `features/admin-auth`, `features/admin-booking-update`, `features/admin-provider-assign`, `features/admin-availability-block` |
| `features/appointments` | `pages/my-bookings`, `pages/admin-dashboard`, `pages/admin-booking-details`, booking widgets |
| `features/calendar` | `entities/availability`, `widgets/availability-calendar` |
| `features/maps` | `entities/route`, `features/route-compute` |
| `features/finance` and `components/admin/Financial*` | `entities/finance`, `features/admin-finance-statement`, `widgets/admin-finance-panel` |
| `features/notifications` | `features/notification-view` |

Frontend forbidden dependencies:

- `shared` importing from any higher layer.
- `entities` importing pages/widgets/features.
- `features` importing pages.
- Feature A importing internal files from Feature B.
- UI primitives calling booking/admin/finance APIs.
- Components consuming raw backend DTOs after the entity mapper exists.

## Backend Boundaries

Current compatibility packages:

- `controller`, `service`, `dto`, `model`, `service/store`, `integrations`,
  `google`, `config`, `exception`, and `util` remain active during migration.

Target module packages:

- `booking`
- `verification`
- `admin`
- `availability`
- `routing`
- `finance`
- `history`
- `shared`

Backend ownership map:

| Current area | Target owner |
| --- | --- |
| `ServicoController`, booking methods in `ServicoService` | `booking/api`, `booking/application`, `booking/domain` |
| `VerificationController`, `VerificationService` | `verification/api`, `verification/application`, `verification/domain` |
| `RecoveryController`, recovery methods | `verification` for OTP session, `booking` for recovered booking listing |
| `AdminAuthController`, `AdminAuthService`, admin stores | `admin/api`, `admin/application`, `admin/domain`, `admin/adapter/out` |
| `AdminAvailabilityBlockController`, `AvailabilityBlockService` | `availability/api`, `availability/application`, `availability/domain` |
| `AvailabilityPolicyService`, `ScheduleRules` | `availability/domain` |
| `RoutesController`, `RoutesService`, route integrations | `routing/api`, `routing/application`, `routing/port/out`, `routing/adapter/out` |
| `AdminFinanceController`, `AdminFinanceService`, banking integrations | `finance/api`, `finance/application`, `finance/port/out`, `finance/adapter/out` |
| `InternalCleanupService`, history stores | `history/application`, `history/port/out`, `history/adapter/out` |
| `exception` | `shared/error` |
| `util/PhoneNumberNormalizer` | `shared/phone` |
| `config` provider selection | module-specific config where practical, `shared/config` for cross-cutting setup |

Backend allowed dependencies:

- `api` -> `application`
- `application` -> `domain` and `port/out`
- `adapter/out` -> external SDK/HTTP/Supabase and implements `port/out`
- `config` wires concrete adapters into application services
- `shared` has no dependency on feature modules

Backend forbidden dependencies:

- Domain importing Spring, HTTP clients, Supabase, Google SDK, Banco Inter SDK/HTTP,
  or environment properties.
- Application importing concrete Supabase, Google, Geoapify, NotificationAPI, Meta
  WhatsApp, or Banco Inter clients.
- Generic repository abstractions.
- Renaming/removing public endpoints without a compatibility layer.
