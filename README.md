# CalendarMate

Sistema de agendamentos para serviços locais, com frontend React/Vite, backend Spring Boot, deploy em Vercel/Render e integrações externas ativáveis por variáveis de ambiente.

## Status

![Java](https://img.shields.io/badge/Java-17%2B-1f6fd1?style=for-the-badge&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2-1f6fd1?style=for-the-badge&logo=springboot&logoColor=white)
![React](https://img.shields.io/badge/React-19-1f6fd1?style=for-the-badge&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-1f6fd1?style=for-the-badge&logo=vite&logoColor=white)
![Render](https://img.shields.io/badge/Render-backend-1f6fd1?style=for-the-badge&logo=render&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-frontend-1f6fd1?style=for-the-badge&logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/License-Source--Available-c24a2d?style=for-the-badge)

## Sobre

O CalendarMate permite criar, consultar, confirmar, recuperar e administrar agendamentos. O fluxo atual prioriza confirmação por **SMS**, usa **Geoapify** como opção principal de mapas/rotas por custo e praticidade, mantém **Meta WhatsApp Cloud API** como integração opcional e permite persistência via **Supabase** para histórico e sessões recentes.

O backend mantém modos dummy/fallback para desenvolvimento local. Assim, o projeto pode rodar sem credenciais reais enquanto as integrações externas não estiverem configuradas.

## Arquitetura

```txt
frontend/  React + Vite + React Query
backend/   Spring Boot + Java 17 + Docker
```

Deploy atual previsto:

```txt
Vercel  -> frontend
Render  -> backend Dockerizado
```

## Funcionalidades

- Criação de agendamento com validações de data, cidade, horário e telefone.
- Confirmação por OTP.
- Canal de OTP alternável: `DUMMY`, `SMS/NotificationAPI` ou `META/WHATSAPP`.
- Consulta de horários disponíveis por dia.
- Consulta pública de agendamentos por telefone, sem token, conta ou OTP.
- Cancelamento público por telefone com verificação de pertencimento, histórico e limite de tentativas.
- Painel admin por telefone/SMS, sessao temporaria e papeis `OWNER`/`PROVIDER`.
- Apos confirmar o telefone do owner `31995438467`, selecao de workspace entre Admin e prestadores cadastrados.
- Bloqueios de disponibilidade e escala 4x4.
- Histórico com retenção configurável, por padrão 2 meses.
- Extrato/admin financeiro via provider `DUMMY` ou Banco Inter.
- Rotas por Geoapify ou Google Routes.

## Integrações e alternância

| Integração | Padrão seguro em dev | Produção real | Obrigatória? | Variáveis principais |
|---|---:|---:|---:|---|
| OTP dummy | Sim | Não | Não | `VERIFICATION_CHANNEL=DUMMY` |
| SMS/NotificationAPI | Opcional | Recomendado no fluxo atual | Sim, se usar SMS real | `VERIFICATION_CHANNEL=SMS`, `SMS_NOTIFICATIONAPI_ENABLED=true` |
| Meta WhatsApp | Desativado | Opcional/futuro | Não | `VERIFICATION_CHANNEL=META`, `WHATSAPP_ENABLED=true` |
| Google Calendar | Dummy sem credenciais | Opcional/real | Não para dev | `GOOGLE_CALENDAR_ENABLED`, `GOOGLE_*` |
| Geoapify | Opcional | Principal no projeto real | Sim, para mapas/rotas reais | `GEOAPIFY_ENABLED=true`, `GEOAPIFY_API_KEY` |
| Google Routes | Desativado | Alternativa ao Geoapify | Não | `GOOGLE_MAPS_ENABLED=true` |
| Supabase | In-memory se desativado | Recomendado | Sim para histórico real | `SUPABASE_ENABLED=true` |
| Banco Inter | `DUMMY` | Opcional | Não | `BANKING_PROVIDER=INTER`, `INTER_ENABLED=true` |

A prioridade de rotas no backend é: **Geoapify habilitado com chave > Google Routes habilitado com chave > rotas desabilitadas**.

## Backend: variáveis principais

Arquivo base: `backend/.env.example`.

### Segurança e deploy

```env
SERVER_PORT=8080
FRONTEND_URL=https://seu-front.vercel.app
HMAC_SECRET=troque-este-segredo-longo
ADMIN_SESSION_TTL_DAYS=7
ADMIN_BOOKING_ACTIVE_PAST_DAYS=10
BOOKING_CANCELLATION_NOTICE_HOURS=2
APP_HISTORY_RETENTION_MONTHS=2.0
PUBLIC_BOOKING_LOOKUP_RATE_WINDOW_SECONDS=600
PUBLIC_BOOKING_LOOKUP_RATE_PER_IP=10
PUBLIC_BOOKING_LOOKUP_RATE_PER_PHONE=10
PUBLIC_BOOKING_CANCEL_RATE_WINDOW_SECONDS=3600
PUBLIC_BOOKING_CANCEL_RATE_PER_IP=3
PUBLIC_BOOKING_CANCEL_RATE_PER_PHONE=3
PUBLIC_BOOKING_RATE_LIMIT_MAX_ENTRIES=10000
TRUST_PROXY_HEADERS=false
TRUSTED_PROXY_ADDRESSES=
```

Os cabeçalhos `X-Forwarded-For`/`X-Real-IP` só são considerados quando `TRUST_PROXY_HEADERS=true` e o endereço do proxy direto está na lista exata `TRUSTED_PROXY_ADDRESSES`. O aviso mínimo de cancelamento é compartilhado pelo backend e pelo frontend por meio do bootstrap público.

### Confirmação por SMS

O SMS real usa NotificationAPI. O limite mensal padrão é de 100 SMS, e o backend bloqueia automaticamente novos envios ao atingir esse limite para evitar custos.

```env
VERIFICATION_CHANNEL=SMS
SMS_NOTIFICATIONAPI_ENABLED=true
SMS_NOTIFICATIONAPI_API_KEY=...
SMS_NOTIFICATIONAPI_BASE_URL=https://api.pingram.io
SMS_NOTIFICATIONAPI_TYPE=calendar_mate_otp
SMS_NOTIFICATIONAPI_MONTHLY_LIMIT=100
SMS_NOTIFICATIONAPI_USAGE_FILE=/tmp/calendarmate-sms-usage.properties
```

### Meta WhatsApp opcional

```env
VERIFICATION_CHANNEL=META
WHATSAPP_ENABLED=true
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_TEMPLATE_NAME=...
WHATSAPP_LANGUAGE=pt_BR
```

### Geoapify como padrão real

```env
GEOAPIFY_ENABLED=true
GEOAPIFY_API_KEY=...
GOOGLE_MAPS_ENABLED=false
```

### Supabase

```env
SUPABASE_ENABLED=true
SUPABASE_URL=...
SUPABASE_KEY=...
SUPABASE_SCHEMA=public
```

Execute [docs/supabase-admin-auth.sql](docs/supabase-admin-auth.sql) para criar/atualizar o histórico, inclusive o índice de telefone e os metadados opcionais de cancelamento. Em produção, mantenha `GOOGLE_CALENDAR_ENABLED=true` para que eventos e ocupação de horários sobrevivam a reinícios; use também `SUPABASE_ENABLED=true` para snapshots históricos resilientes. O `DummyCalendarClient` é apenas um fallback local em memória. As consultas públicas combinam os eventos persistidos do Google Calendar com os snapshots do Supabase e removem duplicatas pelo identificador.

### Banco Inter

```env
BANKING_ENABLED=true
BANKING_PROVIDER=INTER
INTER_ENABLED=true
INTER_BASE_URL=https://cdpj.partners.bancointer.com.br
INTER_CLIENT_ID=...
INTER_CLIENT_SECRET=...
INTER_CERT_P12_PATH=/etc/secrets/inter.p12
INTER_CERT_P12_PASSWORD=...
INTER_CONTA_CORRENTE=...
```

Para testar UI financeira sem Inter:

```env
BANKING_ENABLED=false
BANKING_PROVIDER=DUMMY
INTER_ENABLED=false
```

## Frontend: variáveis principais

Arquivo base: `frontend/.env.example`.

```env
VITE_API_BASE_URL=https://seu-backend.onrender.com
VITE_GEOAPIFY_PUBLIC_KEY=...
VITE_ADMIN_ENABLED=true
VITE_SUPPORT_WHATSAPP_NUMBER=553195415323
```

`VITE_SUPPORT_WHATSAPP_NUMBER` deve conter o telefone comercial no formato internacional, somente dígitos. Ele é usado de forma centralizada pelos links `wa.me`.

## Consulta pública de agendamentos

O cliente informa o telefone na tela “My Bookings”. O telefone é enviado somente no corpo de requisições `POST`:

- `POST /api/servicos/public/lookup` com `{ "phone": "..." }`;
- `POST /api/servicos/public/cancel` com `{ "eventId": "...", "phone": "..." }`.

A listagem pública retorna apenas `eventId`, `serviceType`, `start` e `status`. Nome, e-mail, endereço, complemento, CEP, observações, dados administrativos, links privados e tokens não fazem parte desse DTO. O `localStorage` guarda no máximo o telefone para preencher o campo; o backend é a fonte de verdade. O histórico administrativo consulta exatamente os 30 dias de calendário incluindo hoje, com limites e exibição em `America/Sao_Paulo`.

No Vercel, configure `VITE_API_BASE_URL` com a URL pública do backend no Render e `VITE_GEOAPIFY_PUBLIC_KEY` no mesmo ambiente (Production/Preview/Development conforme o deploy). A chave pública precisa permitir o domínio do Vercel nas restrições do Geoapify. O backend também deve ter `GEOAPIFY_API_KEY` configurada para o proxy de autocomplete/fallback seguro e `FRONTEND_URL` deve incluir os domínios do Vercel permitidos no CORS. Depois de alterar variáveis `VITE_`, faça um novo deploy para o bundle receber os valores.

## Rodar localmente

### Backend

```bash
cd backend
./gradlew bootRun
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Build

### Backend

```bash
cd backend
./gradlew clean build
```

### Frontend

```bash
cd frontend
npm run build
```

Se o Vite/Rollup falhar por dependência opcional do Rollup em ambiente Linux, remova `node_modules` e reinstale:

```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Deploy

### Render — backend Dockerizado

- Root Directory: `backend`
- Environment: Docker
- Dockerfile: `backend/Dockerfile`
- Porta: `8080`
- Variáveis: use `backend/.env.example` como base.

Obrigatórias em produção:

```env
FRONTEND_URL=https://seu-front.vercel.app
HMAC_SECRET=...
ADMIN_SESSION_TTL_DAYS=7
```

### Vercel — frontend

- Root Directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Variáveis: use `frontend/.env.example` como base.

Obrigatória em produção:

```env
VITE_API_BASE_URL=https://seu-backend.onrender.com
```

## Endpoints principais

### Público

- `POST /api/servicos`
- `GET /api/servicos/available?date=YYYY-MM-DD&slotMinutes=60`
- `GET /api/servicos/me?token=...`
- `GET /api/servicos/my?token=...`
- `PUT /api/servicos/me/{eventId}?token=...`
- `DELETE /api/servicos/me/{eventId}?token=...`

### OTP

- `POST /api/verify/start`
- `POST /api/verify/resend`
- `POST /api/verify/confirm`

### Recuperação

- `POST /api/recovery/start`
- `POST /api/recovery/confirm`

### Mapas/rotas

- `GET /api/cep/{cep}`
- `POST /api/routes/compute`

### Admin

O admin/prestador usa `/api/admin/auth/start` e `/api/admin/auth/confirm` para login por SMS. As demais rotas exigem `X-ADMIN-SESSION`.

Workspaces:

- `OWNER` pode entrar como Admin ou como qualquer prestador ativo.
- `PROVIDER` entra somente no proprio workspace de prestador.
- Chamadas em workspace de prestador enviam `X-ADMIN-WORKSPACE: PROVIDER` e `X-ADMIN-PROVIDER-ID`.
- O backend aplica o filtro de prestador nas rotas de agenda e rejeita historico, financeiro, bloqueios globais, atribuicao, exclusao, bulk cancel e cleanup fora do workspace Admin/OWNER.

Registro central de prestadores:

- Supabase: tabela `admin_users` com `id`, `phone_digits`, `name`, `role`, `active`.
- Fallback sem Supabase: `ADMIN_USERS=telefone|nome|OWNER|id;telefone|nome|PROVIDER|id`.
- O seed/documentacao inclui `provider-1`, `provider-2` e `provider-3`; troque os telefones placeholder antes de producao.

- `GET /api/servicos/admin`
- `GET /api/servicos/admin/history`
- `PUT /api/servicos/admin/{eventId}`
- `PUT /api/servicos/admin/{eventId}/assignee` (`OWNER`)
- `DELETE /api/servicos/admin/{eventId}` (`OWNER`)
- `POST /api/internal/cleanup` (`OWNER`)
- `GET /api/admin/finance/statement?from=YYYY-MM-DD&to=YYYY-MM-DD` (`OWNER`)
- `GET /api/admin/finance/health` (`OWNER`)

## Licença

Este projeto usa licença **source-available personalizada**. O uso é permitido para estudo, avaliação, aprendizado, uso privado e fins educacionais. Uso comercial concorrente, revenda, oferta como SaaS, marketplace ou produto equivalente sem autorização são proibidos.

Veja `LICENSE.md`.
