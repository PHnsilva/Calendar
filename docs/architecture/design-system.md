# Design System First Pass

This document records the Phase 3 shared UI foundation. The goal is to give future route and feature extractions stable primitives without changing current screens broadly.

## Current Inventory

- `frontend/src/components/Button.jsx` and `frontend/src/components/Input.jsx` are legacy JSX components backed by global CSS in `frontend/src/styles/components`.
- `frontend/src/components/ui/Button.tsx`, `Input.tsx`, `Modal.tsx`, `Badge.tsx`, and `Card.tsx` currently exist as zero-byte placeholders and should not be imported by new code.
- `frontend/src/shared/ui/ModalShell`, `PageTitle`, `ResponsiveAsset`, and `NavbarMenu` are the first shared UI modules already in use by the scaffolded routes.
- Feedback components under `frontend/src/features/feedback/components` are also zero-byte placeholders, so no shared toast API was promoted in this pass.
- Booking cards and booking status badges remain business-specific in legacy screens and `features/bookings`. They should move to `entities/booking/ui` only after booking DTOs are mapped to frontend models.

## New Shared UI Modules

- `shared/ui/button` exposes a generic `Button`.
- `shared/ui/input` exposes a generic labeled `Input`.
- `shared/ui/dialog` exposes a generic modal dialog shell with Escape close and initial close-button focus.
- `shared/ui/spinner` exposes a generic loading spinner.
- `shared/ui/status-badge` exposes a generic tone-based badge.
- `shared/ui/page-title` provides a lowercase import boundary for the existing `PageTitle`.

## Import Rules

- `shared/ui` components must stay generic and must not import from `app`, `pages`, `widgets`, `features`, or `entities`.
- Booking, admin, finance, route, and notification-specific variants should live under their owning entity or feature.
- New extracted routes should import shared primitives from their folder entry points, for example `shared/ui/button`, not internal files.
- Do not migrate all legacy usage at once. Replace legacy components only inside the route or feature currently being extracted.

## Migration Targets

- Promote booking card UI to `entities/booking/ui/booking-card` after booking models and mappers exist.
- Replace zero-byte `components/ui` placeholders by redirecting future imports to `shared/ui` or deleting them when no imports remain.
- Keep global CSS limited to reset, tokens, base styles, and proven helpers. New component styling should use CSS Modules.
