# CalendarMate Current Architecture State

Date: 2026-06-16

This document records the repository state before deeper architecture refactors.
It is intentionally descriptive: no endpoint, route, or current flow should be
removed without an explicit replacement and validation.

## Required Docs

- Read: `README.md`.
- Not found in the repository root:
  - `guia_arquitetura_frontend.md`
  - `guia_padroes_arquitetura.md`

## Frontend Summary

Stack:

- React 19
- Vite 7
- TanStack Query 5
- React Router DOM 6

Active entry and app files:

- `frontend/src/app/main.tsx`
- `frontend/src/app/router.tsx`
- `frontend/src/app/providers.tsx`
- `frontend/src/app/styles.css`

Active routes:

| Route | Page | Current implementation source |
| --- | --- | --- |
| `/` | `pages/home/HomePage.tsx` | `features/landing/ui/LandingPage.tsx` -> `components/screens/CalendarMateRoutes.tsx` |
| `/meus-agendamentos` | `pages/my/MyBookingsPage.tsx` | `features/appointments/ui/AppointmentsPage.tsx` -> `CalendarMateRoutes.tsx` |
| `/my` | redirect | `/meus-agendamentos` |
| `/recover` | `pages/recover/RecoverPage.tsx` | `features/recovery/*` |
| `/403` | shared page | `pages/shared/ForbiddenPage.tsx` |
| `/500` | shared page | `pages/shared/ServerErrorPage.tsx` |
| `/admin` | `pages/admin/AdminGatePage.tsx` | `features/landing/ui/AdminLandingPage.tsx` -> `CalendarMateRoutes.tsx` |
| `/admin/dashboard` | `pages/admin/AdminDashboardPage.tsx` | `features/appointments/ui/AdminAppointmentsDashboardPage.tsx` -> `CalendarMateRoutes.tsx` |
| `/admin/booking/:eventId` | `pages/admin/AdminBookingPage.tsx` | `features/appointments/ui/AdminAppointmentDetailsPage.tsx` -> `CalendarMateRoutes.tsx` |
| `*` | shared page | `pages/shared/NotFoundPage.tsx` |

Holding mode:

- When `isSiteHoldingPageEnabled()` returns true, all routes render
  `components/screens/SitePreparationPage.tsx`.

Current frontend folders:

- `app`: entry, router, providers, theme, home booking context, major app CSS.
- `assets`: brand images, landing carousel images, wireframe images/icons.
- `components`: legacy layout/UI/admin/screen components.
- `data`: static UI copy, service types, allowed cities, status legend.
- `features`: mixed feature folders for admin, appointments, booking form,
  bookings, calendar, feedback, finance, history, home, landing, maps,
  notifications, OTP, public config, and recovery.
- `layouts`: thin public/admin layout wrappers.
- `lib`: API client, env, storage, masks, dates, query keys, constants.
- `pages`: route-level wrappers.
- `shared`: emerging shared UI/styles.
- `stores`: admin/session stores.
- `styles`: global CSS and responsive overrides.
- `types`: backend DTO-like shared types.

Frontend coupling points:

- `CalendarMateRoutes.tsx` still exports large route implementation pieces and is
  imported by current features/pages.
- Several components consume `types/api` directly, so backend DTOs are reaching UI.
- API calls are mostly under `features/*/api`, but raw calls still appear in:
  - `features/booking-form/api/search-addresses.ts`
  - `features/bookings/components/HomeBookingsTimeline.tsx`
  - `features/admin/components/AdminTokenGate.tsx`
- Query keys are split between `lib/query-keys.ts` and string literals.
- Persistent state is accessed directly from components in some flows
  (`localStorage` and `sessionStorage`) instead of going through a stable adapter.
- Cross-feature imports are common, especially booking form -> calendar/bookings/OTP,
  bookings -> admin/maps/public-config, home -> bookings/calendar/recovery.
- `app/home-booking-provider.tsx` is global client state for the home booking flow.

Frontend global CSS state:

- `frontend/src/app/styles.css` imports nearly all global CSS.
- CSS Modules exist for some newer shared/widgets:
  - `shared/ui/ModalShell`
  - `shared/ui/PageTitle`
  - `shared/ui/ResponsiveAsset`
  - `shared/ui/NavbarMenu`
  - `features/landing/ui/LandingHero`
  - `features/appointments/ui/*`
- Existing global CSS contains multiple final/override/fix files. These should be
  migrated gradually and not expanded.

Largest frontend files found:

| Lines | File |
| ---: | --- |
| 10835 | `frontend/src/styles/appointments-wireframe-overrides.css` |
| 6024 | `frontend/src/app/admin-isolated-overrides.css` |
| 3256 | `frontend/src/styles/landing-responsive.css` |
| 3160 | `frontend/src/components/screens/CalendarMateRoutes.tsx` |
| 2712 | `frontend/src/styles/modals.css` |
| 2695 | `frontend/src/styles/landing-client-wireframe-final.css` |
| 2293 | `frontend/src/styles/responsive-foundation.css` |
| 2257 | `frontend/src/styles/landing.css` |
| 1947 | `frontend/src/app/home-mobile-dock.css` |
| 1619 | `frontend/src/features/appointments/ui/AppointmentCard/AppointmentCard.module.css` |
| 904 | `frontend/src/features/booking-form/components/BookingFormModal.tsx` |
| 704 | `frontend/src/features/bookings/components/HomeBookingsTimeline.tsx` |
| 609 | `frontend/src/features/booking-form/api/search-addresses.ts` |

Duplicated or legacy UI candidates:

- Navbars: `components/layout/*Navbar*`, `styles/navbar*.css`,
  `styles/client-navbar-unified.css`.
- Modals: `components/ui/Modal.tsx`, `shared/ui/ModalShell`, legacy
  `components/Modal*.jsx`, many feature-specific modal components.
- Cards: `components/ui/Card.tsx`, `features/appointments/ui/AppointmentCard`,
  booking cards in `features/bookings`, calendar event cards.
- Buttons/inputs: TS components in `components/ui`, legacy JSX components, and
  component-specific CSS.

## Backend Summary

Stack:

- Spring Boot 3.2.5
- Java 17
- Gradle
- Docker target for Render

Current backend folders:

- `config`: application wiring and provider selection.
- `controller`: REST controllers.
- `dto`: request/response DTOs shared across features.
- `exception`: API errors and global exception handler.
- `google`: Google Calendar client and dummy calendar client.
- `integrations`: SMS, WhatsApp, Supabase, routes, banking providers.
- `model`: current domain/data models.
- `service`: application/business orchestration services.
- `service/store`: store interfaces and in-memory/Supabase implementations.
- `util`: phone/location helpers.

Controllers and endpoints:

- `ServicoController`: `/api/servicos`, public booking, client token management,
  admin booking list/history/update/delete/assignment, available slots.
- `VerificationController`: `/api/verify`.
- `RecoveryController`: `/api/recovery`.
- `AdminAuthController`: `/api/admin/auth`.
- `AdminDashboardController`: `/api/admin/dashboard`.
- `AdminBookingOpsController`: `/api/admin/bookings`.
- `AdminAvailabilityBlockController`: `/api/admin/availability-blocks`.
- `AdminFinanceController`: `/api/admin/finance`.
- `RoutesController`: `/api/routes`.
- `CepController`: `/api/cep`.
- `AddressAutocompleteController`: `/api/enderecos`.
- `PublicBootstrapController`: `/api/public`.
- `InternalCleanupController`: `/api/internal`.

Backend coupling points:

- `ServicoService` coordinates validation, booking creation/update/cancel, calendar
  integration, token checks, pending cleanup, history, availability, admin filters,
  DTO mapping, and Google Calendar event details.
- `AppConfig` wires verification provider selection, Supabase/in-memory store
  selection, service construction, route provider selection, and HTTP client setup.
- `AddressAutocompleteService` mixes Geoapify provider access, request building,
  validation, fallback behavior, and response shaping.
- Service methods frequently accept/return DTOs, so API shapes reach application
  logic.
- Google Calendar SDK models are visible in service logic.
- Supabase is already mostly isolated under `integrations/supabase` and
  `service/store/Supabase*`, but the package name is still legacy rather than
  module-local adapter paths.

Largest backend files found:

| Lines | File |
| ---: | --- |
| 969 | `backend/src/main/java/br/com/calendarmate/service/ServicoService.java` |
| 544 | `backend/src/main/java/br/com/calendarmate/service/AddressAutocompleteService.java` |
| 395 | `backend/src/main/java/br/com/calendarmate/integrations/supabase/SupabaseClient.java` |
| 384 | `backend/src/main/java/br/com/calendarmate/service/AvailabilityBlockService.java` |
| 381 | `backend/src/main/java/br/com/calendarmate/config/AppConfig.java` |
| 357 | `backend/src/main/java/br/com/calendarmate/google/GoogleCalendarClient.java` |
| 317 | `backend/src/main/java/br/com/calendarmate/config/AppProperties.java` |
| 311 | `backend/src/main/java/br/com/calendarmate/service/AdminAuthService.java` |
| 290 | `backend/src/main/java/br/com/calendarmate/google/DummyCalendarClient.java` |
| 246 | `backend/src/main/java/br/com/calendarmate/integrations/NotificationApiSmsClient.java` |
| 239 | `backend/src/main/java/br/com/calendarmate/service/VerificationService.java` |
| 206 | `backend/src/main/java/br/com/calendarmate/integrations/geoapify/GeoapifyRoutesClient.java` |

Current integrations:

- OTP delivery: dummy, NotificationAPI SMS, Meta WhatsApp.
- Calendar: dummy and Google Calendar.
- Persistence/session/history: in-memory and Supabase stores.
- Routes: Geoapify and Google Routes.
- Finance: dummy and Banco Inter.
- Address/autocomplete: backend Geoapify proxy plus frontend direct fallback.

Critical flows to protect:

1. Create booking.
2. Validate city, date, time, and phone.
3. Confirm and resend OTP.
4. Recover bookings by phone.
5. Query available slots.
6. Use management token without login.
7. Edit/cancel client booking.
8. Admin login by phone/SMS.
9. Admin session with `X-ADMIN-SESSION`.
10. List/update/delete/admin-assign bookings with OWNER/PROVIDER rules.
11. Availability blocks and 4x4 schedule.
12. History retention and cleanup.
13. Admin finance with dummy/Banco Inter provider.
14. Routes with Geoapify/Google Routes.
15. Dummy/in-memory fallbacks in dev.
16. Vercel frontend and Render backend builds.

## Baseline Validation

Commands executed before edits:

- `npm ci`: first `npm` PowerShell wrapper failed due script execution policy;
  `npm.cmd ci` succeeded.
- `npm.cmd run lint`: failed with 26 existing lint errors.
- `npm.cmd run test`: passed, 7 test files and 18 tests.
- `npm.cmd run build`: passed, with Vite chunk size warning.
- `.\\gradlew.bat test`: passed.
- `.\\gradlew.bat clean build`: passed, with Gradle deprecation warnings and Java
  deprecated/unchecked API notes.

No `typecheck` script exists in `frontend/package.json`; type checking currently
runs through `npm run build` via `tsc -b`.
