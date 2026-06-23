# CalendarMate Target Architecture

Date: 2026-06-16

The target architecture is an incremental structure for a React/Vite SPA and a
Spring Boot modular monolith. It is not a microservice migration and it is not a
full Clean Architecture rewrite.

## Frontend Target

Use FSD-lite with this dependency direction:

`app -> pages -> widgets -> features -> entities -> shared`

Rules:

- `pages` may use `widgets`, `features`, `entities`, and `shared`.
- `widgets` may use `features`, `entities`, and `shared`.
- `features` may use `entities` and `shared`.
- `entities` may use `shared`.
- `shared` must not import app, pages, widgets, features, or entities.
- One feature must not import another feature's internal files. Cross-feature
  composition belongs in pages/widgets.
- UI components must not consume raw backend DTOs.

Target folder ownership:

| Owner | Target path |
| --- | --- |
| App entry/router/providers/styles | `src/app` |
| Route screens | `src/pages/*` |
| Public navbar | `src/widgets/public-navbar` |
| Admin navbar | `src/widgets/admin-navbar` |
| Client footer | `src/widgets/client-footer` |
| Landing hero | `src/widgets/landing-hero` |
| Service carousel | `src/widgets/service-carousel` |
| Booking list panel | `src/widgets/booking-list-panel` |
| Admin booking board | `src/widgets/admin-booking-board` |
| Admin finance panel | `src/widgets/admin-finance-panel` |
| Availability calendar | `src/widgets/availability-calendar` |
| Supported cities panel | `src/widgets/supported-cities-panel` |
| Create booking | `src/features/booking-create` |
| Edit booking | `src/features/booking-edit` |
| Cancel booking | `src/features/booking-cancel` |
| Recover booking | `src/features/booking-recover` |
| OTP/phone verification | `src/features/phone-verification` |
| Admin auth | `src/features/admin-auth` |
| Admin booking update | `src/features/admin-booking-update` |
| Admin provider assignment | `src/features/admin-provider-assign` |
| Availability block management | `src/features/admin-availability-block` |
| Admin finance statement | `src/features/admin-finance-statement` |
| Address autocomplete | `src/features/address-autocomplete` |
| Route computation | `src/features/route-compute` |
| Notification view | `src/features/notification-view` |
| Booking model/api/ui | `src/entities/booking` |
| Admin model/api | `src/entities/admin` |
| Availability model/api | `src/entities/availability` |
| Address model/api | `src/entities/address` |
| Finance model/api | `src/entities/finance` |
| Route model/api | `src/entities/route` |
| API, UI primitives, lib, config, styles | `src/shared` |

Frontend API contract:

`HTTP response -> DTO -> mapper -> frontend model -> query hook/mutation -> component`

Target API locations:

- `shared/api/http-client.ts`: fetch wrapper and common HTTP behavior.
- `shared/api/api-error.ts`: common error type.
- `shared/api/query-client.ts`: TanStack Query client.
- `shared/api/query-keys.ts`: standardized query keys.
- `entities/*/api`: DTOs and mappers for entity-owned backend shapes.
- `features/*/api`: feature-specific commands or non-entity operations.
- `features/*/hooks`: query/mutation hooks used by UI.

State classification:

- Local UI state: component `useState`/`useReducer`.
- Complex screen state: page/feature reducer.
- Server state: TanStack Query.
- URL state: React Router search params.
- Session/auth: small auth provider/store.
- Persisted state: `shared/lib/storage`.
- Global client state: only for cross-screen UI state, never remote data.

CSS target:

- Keep global CSS for reset, tokens, base styles, cascade layers, and minimal
  utilities.
- Migrate route/widget/feature CSS to CSS Modules gradually.
- Do not add new final-fix, mobile-fix, override-final, or similar global files.
- Preserve existing visuals until each route/widget is strangled and validated.
- Use CSS custom properties for color, spacing, radius, shadow, font, breakpoint,
  z-index, motion, and duration tokens.
- Use cascade layers: `reset`, `theme`, `base`, `components`, `utilities`,
  `overrides`.

Responsive target:

- Page layout owns macro breakpoints.
- Components prefer `clamp()`, `min()`, `max()`, `minmax()`, `auto-fit`,
  `auto-fill`, flex/grid wrapping, intrinsic sizing, and container queries.
- Avoid one media query per component per width.
- Validate affected UI at 320, 360, 390, 480, 640, 768, 900, 1024, 1280,
  1440, 1800, 1920, 2200, and 2500 px.

## Backend Target

Use a REST API plus modular monolith with pragmatic ports/adapters where they
protect real seams:

- external providers;
- Supabase and in-memory fallbacks;
- provider strategies;
- isolated business rules;
- testable workflows.

Do not introduce ceremonial input boundaries, output boundaries, interactors,
presenters, gateways, or generic repositories for every action.

Target module structure:

| Module | Responsibility |
| --- | --- |
| `booking` | Booking creation, edit, cancel, listing, available slots facade, booking domain policies |
| `verification` | OTP sessions, resend/confirm, delivery port, SMS/WhatsApp/dummy adapters |
| `admin` | Admin auth, sessions, roles, provider assignment, admin-only actions |
| `availability` | Availability blocks, schedule policy, 4x4 cycle, conflict policy |
| `routing` | Route compute use cases and Geoapify/Google/disabled providers |
| `finance` | Statement use cases and dummy/Banco Inter providers |
| `history` | History records, retention, cleanup |
| `shared` | Config, error, security, time, phone, validation helpers |

Per-module package convention when extracting:

- `api`: controllers, requests, responses, API mapper.
- `application`: use cases/application services.
- `domain`: models, policies, invariants, transitions.
- `port/out`: internal contracts for persistence/providers.
- `adapter/out`: Supabase, in-memory, dummy, external providers.

Backend dependency rules:

- Controllers stay thin and translate HTTP to application calls.
- Application coordinates use cases and ports.
- Domain contains rules and must not know Spring, HTTP, Supabase, SDKs, or env.
- External DTOs must not enter domain.
- Configuration chooses real/dummy/in-memory implementations.
- Supabase client may only live in Supabase adapters/infrastructure.
- Use `Store` names for technical persistence and sessions.
- Use `Gateway`/provider names for external systems.
- Do not create `GenericRepository`.

Supabase target:

- Current `SupabaseClient` becomes infrastructure used only by concrete stores.
- Target store names:
  - `SupabaseAdminSessionStore`
  - `InMemoryAdminSessionStore`
  - `SupabaseVerificationSessionStore`
  - `InMemoryVerificationSessionStore`
  - `SupabaseBookingHistoryStore`
  - `InMemoryBookingHistoryStore`
- Application/domain depend on interfaces such as `AdminSessionStore`,
  `VerificationSessionStore`, and `BookingHistoryStore`.

Provider strategies:

- Verification: DUMMY, SMS/NotificationAPI, WhatsApp/Meta.
- Routing: Geoapify, Google Routes, disabled.
- Finance: DUMMY, Banco Inter.
- Calendar: dummy, Google Calendar.

External compatibility:

- Existing REST endpoints remain stable.
- Existing frontend routes remain stable.
- DTOs can be mapped internally, but public request/response contracts must remain
  compatible until versioned.
