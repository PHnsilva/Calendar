# ADR 0001 - Incremental Modular Refactor

Date: 2026-06-16

## Status

Accepted

## Context

CalendarMate already has working production-oriented flows for public bookings,
OTP verification, booking recovery, admin sessions, OWNER/PROVIDER roles,
availability blocks, 4x4 scheduling, history retention, finance providers, and
route providers. The main risk is not missing architecture concepts; it is
breaking working flows while untangling large files and global CSS.

## Decision

Refactor incrementally using:

- FSD-lite on the frontend.
- Modular monolith on the backend.
- Pragmatic ports/adapters only where they protect external providers,
  Supabase/in-memory fallbacks, provider strategies, or important business rules.
- Strangler Fig by route/feature/use case.
- Characterization tests before critical behavior moves.

The refactor will not use:

- Microservices.
- Next.js migration.
- Full/dogmatic Clean Architecture.
- Generic repositories.
- Ceremonial boundaries for every small action.
- New global CSS override files.

## Consequences

- Old and new structures will coexist temporarily.
- Compatibility entry files stay in place until callers migrate.
- Some duplication is acceptable during migration when it keeps changes
  reversible.
- Legacy code is removed only after equivalent module-owned code is validated.
