# CalendarMate Frontend

React/Vite client for the public booking flow, client booking recovery, and admin/provider workspaces.

## Scripts

```bash
npm install
npm run dev
npm run test
npm run build
```

## Environment

Use `.env.example` as the base:

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_GEOAPIFY_PUBLIC_KEY=
VITE_ADMIN_ENABLED=true
```

## Admin And Provider Workspaces

Admin login uses the backend OTP flow:

- `POST /api/admin/auth/start`
- `POST /api/admin/auth/confirm`

After an `OWNER` session is confirmed, the UI opens a workspace modal:

- `Entrar como Admin`
- `Entrar como <ProviderName>`

The selected workspace is stored with the admin session in local storage. Provider workspace requests automatically send:

```http
X-ADMIN-SESSION: <token>
X-ADMIN-WORKSPACE: PROVIDER
X-ADMIN-PROVIDER-ID: <providerId>
```

Admin workspace requests send `X-ADMIN-WORKSPACE: ADMIN`.

Provider workspace UI intentionally shows only the provider agenda plus agenda-level actions such as email and budget. It hides admin history, finance/extrato, global bloqueios, assignment, deletion, bulk operations, and new booking controls. Backend authorization still enforces the same boundaries.

## Provider Registry

Providers come from the backend `admin_users` registry or `ADMIN_USERS` fallback config. The frontend does not hardcode provider names or phones; it loads provider workspace options with `/api/admin/auth/providers`.
