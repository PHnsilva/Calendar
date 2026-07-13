# CalendarMate Incremental Migration Plan

Date: 2026-06-16

This plan uses Strangler Fig and Branch by Abstraction. Each phase should keep
existing flows working and should run validations before moving to the next
phase.

## Phase 0 - Freeze Current Behavior

Status: started.

Goals:

- Keep route and endpoint contracts unchanged.
- Record current architecture and large/coupled files.
- Capture baseline validation failures.
- Add characterization tests before touching critical flows.

Done in this run:

- Documented current state.
- Added target architecture docs.
- Added initial route/provider/shared API scaffolding.
- Added backend module package markers.

Recommended next tests:

- Frontend characterization tests for booking creation modal, OTP confirm/resend,
  recovery flow, admin auth happy path, and admin session header usage.
- Backend characterization tests for booking create, available slots, admin auth,
  admin owner/provider authorization, recovery, finance provider selection, route
  provider selection, and cleanup retention.

## Phase 1 - Scaffolding

Goal:

- Make target boundaries visible without moving business logic.

Frontend steps:

- Keep `src/app/router.tsx` as compatibility entry while route definitions live
  under `src/app/router/routes.tsx`.
- Keep `src/app/providers.tsx` as compatibility entry while provider composition
  lives under `src/app/providers/app-providers.tsx`.
- Route all new HTTP work through `src/shared/api`.
- Add `entities/*` folders only when the first model/mapper is extracted.
- Add import aliases only after current relative imports are stable enough to
  migrate safely.

Backend steps:

- Keep existing controllers and endpoints.
- Introduce ports only when a concrete legacy implementation is being strangled.
- Move by use case, not by package rename.
- Keep Supabase behind concrete store implementations.

Validation after each block:

- Frontend: `npm.cmd run test`, `npm.cmd run build`, and `npm.cmd run lint`
  once baseline lint issues are addressed.
- Backend: `.\\gradlew.bat test`, `.\\gradlew.bat clean build`.

## Phase 2 - Minimal Design System

Goal:

- Establish reusable UI primitives without changing visual behavior.

Extract or consolidate:

- Button
- Input
- Modal/Dialog
- Toast
- Spinner
- PageTitle
- StatusBadge
- BookingCard base

Rules:

- Keep old components as compatibility exports during migration.
- Prefer CSS Modules for new primitives.
- Do not add new global override files.
- Validate navbar, footer, hero, cards, modals, OTP forms, and admin dashboard
  only when touched.

## Phase 3 - Landing Extraction

Goal:

- Remove landing dependency on `CalendarMateRoutes.tsx`.

Move ownership:

- `pages/landing`
- `widgets/public-navbar`
- `widgets/landing-hero`
- `widgets/service-carousel`
- `widgets/supported-cities-panel`
- `widgets/client-footer`

Validation:

- Routes `/`, `/admin`, and holding page mode.
- Widths: 320, 360, 390, 480, 640, 768, 900, 1024, 1280, 1440, 1800, 1920,
  2200, 2500.

## Phase 4 - Client Booking Flow

Goal:

- Extract client booking ownership from mixed feature folders.

Move ownership:

- `entities/booking`
- `entities/availability`
- `features/booking-create`
- `features/phone-verification`
- `features/booking-recover`
- `features/booking-edit`
- `features/booking-cancel`
- `pages/my-bookings`

Backend work:

- Add booking application use cases one at a time:
  - create booking;
  - get by token;
  - list my bookings;
  - update by token;
  - cancel by token;
  - get available slots.
- Add domain policies before moving logic out of `ServicoService`.
- Keep `ServicoController` endpoints unchanged until new controllers are ready.

Characterization tests first:

- City/date/time/phone validation.
- Conflict on unavailable slot.
- Pending cleanup.
- OTP start rollback if delivery fails.
- Token access rules.

## Phase 5 - Admin Flow

Goal:

- Extract admin auth/session and booking board behavior.

Move ownership:

- `features/admin-auth`
- `pages/admin-dashboard`
- `widgets/admin-booking-board`
- `features/admin-booking-update`
- `features/admin-provider-assign`
- `features/admin-availability-block`

Backend work:

- Move admin session/user stores behind admin module ports.
- Extract owner/provider authorization policies.
- Extract availability block use cases.
- Keep `X-ADMIN-SESSION` behavior unchanged.

## Phase 6 - Integrations

Goal:

- Isolate provider-specific code and keep dummy fallbacks.

Frontend:

- `features/address-autocomplete` + `entities/address`.
- `features/route-compute` + `entities/route`.
- `features/admin-finance-statement` + `entities/finance`.

Backend:

- `routing` module with `RouteProviderPort`.
- `finance` module with `FinanceStatementProviderPort`.
- `verification` module with `OtpDeliveryPort`.
- Calendar adapter port for booking use cases.
- Supabase stores module-localized behind ports.

Validation:

- Provider disabled/dummy cases.
- Missing credential errors remain friendly.
- Geoapify priority over Google Routes.
- Banco Inter disabled falls back to dummy.

## Phase 7 - Legacy Removal

Goal:

- Remove legacy only after migrated routes/features are live and validated.

Candidates:

- Reduce and then remove `CalendarMateRoutes.tsx`.
- Remove legacy JSX components after equivalent TS/shared components are wired.
- Remove dead global CSS only after usage is verified.
- Remove duplicate query key literals.
- Replace raw DTO consumption with entity models/mappers.

Exit criteria:

- Existing routes and endpoints still exist or have explicit compatible
  replacements.
- Frontend build/test/lint pass.
- Backend test/build pass.
- Critical flows are covered by automated or documented manual validation.
