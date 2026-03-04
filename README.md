# 🗓️ CalendarMate

---

## 🚧 Status do Projeto
![Java](https://img.shields.io/badge/Java-17%2B-007ec6?style=for-the-badge&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-007ec6?style=for-the-badge&logo=springboot&logoColor=white)
![Google Calendar](https://img.shields.io/badge/Google%20Calendar-API-007ec6?style=for-the-badge&logo=google&logoColor=white)
![WhatsApp](https://img.shields.io/badge/WhatsApp-Cloud%20API-007ec6?style=for-the-badge&logo=whatsapp&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-opcional-007ec6?style=for-the-badge&logo=supabase&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-007ec6?style=for-the-badge)

---

## 📚 Índice
- [Links Úteis](#-links-úteis)
- [Sobre o Projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Integrações](#-integrações)
- [Endpoints](#-endpoints)
- [Configuração](#-configuração)
- [Como Rodar Localmente](#-como-rodar-localmente)
- [Dicas Rápidas](#-dicas-rápidas)
- [Build](#-build)
- [Deploy](#-deploy)
- [Estrutura de Pastas](#-estrutura-de-pastas)
- [Testes](#-testes)
- [Licença](#-licença)

---

## 🔗 Links Úteis
- 🐙 **Repositório:** (adicione aqui)
- 📄 **Documentação/Notas:** (adicione aqui)

---

## 📝 Sobre o Projeto
Backend de agendamentos com integração ao **Google Calendar**, fluxo de confirmação via **OTP (WhatsApp)** e validações para reduzir erros de input (data, horário, área atendida).  
O sistema evita login: após criar um agendamento, o usuário recebe um **token de gerenciamento** para consultar/editar/cancelar seus próprios agendamentos.

O projeto inclui modos “dummy” para desenvolvimento local quando integrações externas não estão configuradas.

---

## ✨ Funcionalidades
- Criar agendamento com validações:
  - janela de datas (mês atual ou próximo)
  - minutos válidos (00/30)
  - área atendida (cidades/UF)
- Consultar horários disponíveis por dia (`/available`)
- Token de gerenciamento (sem login)
- OTP (start/resend/confirm) para confirmar telefone
- Recuperação por telefone (OTP + listagem)
- Admin (via header `X-ADMIN-TOKEN`):
  - listar todos os agendamentos
  - excluir por `eventId`
  - executar limpeza interna (pendências/histórico)
- Regra de folga **4x4** configurável por `app.schedule.cycleStart`
- Proxy de rotas via **Google Routes** (quando habilitado)
- Extrato bancário no painel admin via provider plugável (**DUMMY/INTER**) para cálculo de totais no mês

---

## 🔌 Integrações

### Google Calendar
- **Produção:** `GoogleCalendarClient` (OAuth: clientId/clientSecret/refreshToken)
- **Dev:** `DummyCalendarClient` quando credenciais não estão definidas
- Eventos do sistema são identificados por `extendedProperties.private.appSource=calendar-backend`

### WhatsApp (OTP)
- **Produção:** `MetaWhatsAppClient` (WhatsApp Cloud API)
- **Dev:** `DummyWhatsAppClient` (código aparece no console)

### Supabase (opcional)
- **Produção (opcional):** persistência de stores (verification/pending/history)
- **Dev:** modo in-memory quando `supabase.enabled=false`

### CEP (ViaCEP)
- Endpoint `GET /api/cep/{cep}` consulta ViaCEP e valida cidade/UF permitidos

### Google Routes (proxy)
- Quando habilitado (`google.maps.enabled=true`), o backend calcula rotas/tempo/polylines via Google Routes API

### Banking / Extrato (Admin)
- Provider plugável:
  - **DUMMY:** extrato fake para desenvolvimento/testes de UI
  - **INTER:** extrato via Banco Inter PJ (mTLS + OAuth) quando configurado

---

## 🔌 Endpoints

### Público
- `POST /api/servicos`  
  Cria agendamento e retorna `manageToken` + dados do OTP.
- `GET /api/servicos/available?date=YYYY-MM-DD&slotMinutes=60`  
  Lista slots disponíveis no dia (considera conflitos e regra 4x4).
- `GET /api/servicos/me?token=...`  
  Busca um agendamento do token.
- `GET /api/servicos/my?token=...`  
  Lista agendamentos do token.
- `PUT /api/servicos/me/{eventId}?token=...`  
  Atualiza agendamento do token.
- `DELETE /api/servicos/me/{eventId}?token=...`  
  Cancela agendamento do token.

### OTP (WhatsApp)
- `POST /api/verify/start`
- `POST /api/verify/resend`
- `POST /api/verify/confirm`

### Recuperação (por telefone)
- `POST /api/recovery/start`
- `POST /api/recovery/confirm`

### CEP
- `GET /api/cep/{cep}`

### Rotas (proxy)
- `POST /api/routes/compute`

### Admin (header `X-ADMIN-TOKEN`)
- `GET /api/servicos/admin`
- `DELETE /api/servicos/admin/{eventId}`
- `POST /api/internal/cleanup`
- `GET /api/admin/finance/statement?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/admin/finance/health`

---

## ⚙️ Configuração

### Variáveis de ambiente
O projeto usa `.env` para configuração local. Exemplos de grupos:
- Segurança: `ADMIN_TOKEN`, `HMAC_SECRET`
- Google Calendar: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_CALENDAR_ID`
- WhatsApp: `WHATSAPP_*`
- Supabase: `SUPABASE_*`
- Google Routes: `GOOGLE_MAPS_*`
- Banking/Inter: `BANKING_*`, `INTER_*`

### application.properties
Centraliza valores e permite sobrescrita via env usando placeholders `${ENV_VAR:default}`.  
Também contém `app.schedule.cycleStart` para regra de escala de trabalho 4x4.

---

## ▶️ Como Rodar Localmente

### Pré-requisitos
- Java 17+
- Maven Wrapper (`./mvnw`) ou Maven instalado

### Passos
1. Configure `.env` (ou exporte as variáveis no terminal)
2. Rode a aplicação:
```bash
cd backend
./gradlew bootRun
```
3. API disponível em:
```bash
http://localhost:8080
````

---

## Dicas rápidas

Sem credenciais Google → DummyCalendarClient (funciona para desenvolvimento)

Com WhatsApp desabilitado → OTP aparece no console (DummyWhatsAppClient)

Banking em DUMMY → extrato fake para validar a dashboard

---

## 🧱 Build
```bash
./gradlew clean build
````

---

## 🚀 Deploy

Em preparação.

---

## 📁 Estrutura de Pastas

Em preparação.

---

## 🧪 Testes

Ainda não há testes automatizados.

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE.
