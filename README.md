# 🏥 Agente de Cobrança por Voz

SaaS multi-tenant de cobrança automatizada para clínicas médicas.

## 📋 Sobre

Sistema que automatiza o ciclo completo de cobrança de inadimplentes via IA, WhatsApp e voz. Cada clínica tem seu painel isolado com métricas em tempo real.

## 🚀 Funcionalidades

- ✅ Autenticação JWT multi-tenant
- ✅ CRUD de devedores e dívidas
- ✅ Motor de cobrança automatizado
- ✅ Campanhas WhatsApp automáticas
- ✅ IA controlada de negociação
- ✅ Dashboard com métricas em tempo real
- ✅ Histórico completo de chamadas

## 🛠️ Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 16 + Tailwind CSS |
| Backend | Node.js 24 + Express |
| Banco | PostgreSQL (Supabase) |
| Auth | JWT + Refresh Token |
| Estado | Zustand |
| HTTP | Axios |

## 📁 Estrutura

```
dividas/
├── backend/          # API REST
│   ├── src/
│   │   ├── config/   # DB e env
│   │   ├── middlewares/
│   │   └── modules/  # auth, debtors, debts, ai, whatsapp...
│   └── sql/          # Schema do banco
└── frontend/         # Painel web
    ├── app/          # Páginas Next.js
    └── lib/          # API client e auth store
```

## ⚙️ Configuração

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Preencha as variáveis no .env
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Preencha as variáveis no .env.local
npm run dev
```

## 🔐 Variáveis de Ambiente

### Backend (`.env`)

```
PORT=3000
NODE_ENV=development
SUPABASE_URL=sua_url_aqui
SUPABASE_SERVICE_KEY=sua_chave_aqui
JWT_SECRET=sua_chave_secreta_aqui
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
```

### Frontend (`.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## 📊 API

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /api/auth/register | Cadastra clínica |
| POST | /api/auth/login | Login |
| GET | /api/debtors | Lista devedores |
| POST | /api/debts | Cadastra dívida |
| POST | /api/collections/run | Executa cobrança |
| POST | /api/whatsapp/send | Dispara WhatsApp |
| POST | /api/ai/start | Inicia negociação IA |
| POST | /api/ai/reply | Responde na negociação |
| GET | /api/dashboard/metrics | Métricas em tempo real |

## 🗄️ Schema do Banco

O schema completo está em `backend/sql/001_init.sql`.

Tabelas:
- `tenants` — Clínicas cadastradas
- `users` — Usuários por clínica
- `debtors` — Pacientes devedores
- `debts` — Dívidas (pending/negotiating/agreed/paid/cancelled)
- `calls` — Histórico de chamadas e interações
- `messages` — Mensagens WhatsApp
- `agreements` — Acordos firmados
- `refresh_tokens` — Sessões ativas
- `audit_logs` — Rastreabilidade completa

## 🤖 IA Controlada

Fluxo de negociação com estados fixos — sem respostas livres:

```
greeting → aceitou / não pode / já pagou / parcelar
               ↓
         installment_offer → 3x / 6x / nenhuma
               ↓
         acordo firmado + link de pagamento gerado
```

## 📈 Roadmap

- [ ] Deploy (Vercel + Railway)
- [ ] Integração WhatsApp real (Z-API / Meta API)
- [ ] Voz com Twilio + ElevenLabs
- [ ] Relatórios PDF/Excel
- [ ] App mobile

## 📄 Licença

MIT — veja [LICENSE](LICENSE)
