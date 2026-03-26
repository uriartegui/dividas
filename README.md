# 🏥 Cobranças SaaS — Sistema de Recuperação de Inadimplência

SaaS multi-tenant de cobrança automatizada para clínicas médicas. A IA negocia, o sistema fecha o acordo e notifica — tudo sem intervenção humana.

## 🚀 Funcionalidades

| Feature | Status |
|---------|--------|
| Autenticação JWT multi-tenant | ✅ |
| CRUD de devedores e dívidas | ✅ |
| Dashboard com métricas em tempo real | ✅ |
| Score de pagamento (prioridade de cobrança) | ✅ |
| WhatsApp automático via Z-API | ✅ |
| CRM inbox bidirecional | ✅ |
| IA negociadora (Claude Haiku) | ✅ |
| Régua de cobrança D+1 / D+7 / D+30 | ✅ |
| Acordos automáticos (à vista e parcelado) | ✅ |
| Portal do paciente (link único por devedor) | ✅ |
| Relatório PDF de inadimplência | ✅ |
| Notificações por email (Resend) | ✅ |
| Esqueci minha senha | ✅ |
| Billing via Stripe | ✅ |

## 🛠️ Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 16 + TypeScript + Tailwind CSS |
| Backend | Node.js + Express |
| Banco | PostgreSQL (Supabase) |
| Auth | JWT + Refresh Token |
| WhatsApp | Z-API |
| IA | Anthropic Claude Haiku |
| Email | Resend |
| PDF | PDFKit |
| Agendador | node-cron |
| Billing | Stripe |
| Deploy Frontend | Vercel |
| Deploy Backend | Render |

## 📁 Estrutura

```
dividas/
├── backend/
│   └── src/
│       ├── config/              # DB e env
│       ├── middlewares/         # Auth JWT
│       └── modules/
│           ├── auth/            # Login, registro, forgot password
│           ├── debtors/         # Cadastro de devedores
│           ├── debts/           # Gestão de dívidas
│           ├── agreements/      # Acordos e parcelas
│           ├── whatsapp/        # Webhook Z-API + CRM inbox
│           ├── ai-negotiator/   # IA de negociação (Claude)
│           ├── scheduler/       # Régua de cobrança automática
│           ├── collection-rules/# Regras por tenant (D+1/D+7/D+30)
│           ├── dashboard/       # Métricas e score de pagamento
│           ├── export/          # Relatório PDF
│           ├── portal/          # Portal do paciente (público)
│           └── notifications/   # Email via Resend
└── frontend/
    └── app/
        ├── login/               # Login
        ├── forgot-password/     # Recuperação de senha
        ├── reset-password/      # Nova senha
        ├── portal/              # Portal do paciente (público)
        └── dashboard/
            ├── page.tsx         # Dashboard principal + score
            ├── debtors/         # Cadastro de devedores
            ├── debts/           # Gestão de dívidas
            ├── agreements/      # Acordos
            ├── whatsapp/        # CRM inbox WhatsApp
            ├── collection-rules/# Régua de cobrança
            └── reports/         # Relatórios PDF
```

## ⚙️ Configuração

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## 🔐 Variáveis de Ambiente

### Backend (`.env`)

```
PORT=3000
NODE_ENV=development
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
JWT_SECRET=
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3001
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
ZAPI_INSTANCE_ID=
ZAPI_TOKEN=
ZAPI_CLIENT_TOKEN=
RESEND_API_KEY=
ANTHROPIC_API_KEY=
PORTAL_SECRET=
```

### Frontend (`.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## 📊 Principais Endpoints

### Auth
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /api/auth/register | Cadastra clínica |
| POST | /api/auth/login | Login |
| POST | /api/auth/refresh | Renova token |
| POST | /api/auth/forgot-password | Recuperação de senha |
| POST | /api/auth/reset-password | Nova senha via token |

### Devedores e Dívidas
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/debtors | Lista devedores |
| POST | /api/debtors | Cadastra devedor |
| GET | /api/debts | Lista dívidas |
| POST | /api/debts | Cadastra dívida |

### Dashboard
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/dashboard/metrics | Métricas gerais |
| GET | /api/dashboard/monthly | Dados mensais |
| GET | /api/dashboard/scores | Score e prioridade de cobrança |

### WhatsApp
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /api/whatsapp/webhook | Webhook Z-API (inbound) |
| GET | /api/whatsapp/conversations | Lista conversas |
| GET | /api/whatsapp/conversations/:id | Mensagens de um devedor |
| POST | /api/whatsapp/reply | Responde manualmente |

### Portal do Paciente
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/portal/link/:debtorId | Gera link do portal (autenticado) |
| GET | /api/portal/access | Dados do devedor (público) |
| POST | /api/portal/agree | Aceita acordo (público) |

### Outros
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/export/report/pdf | Relatório PDF |
| GET | /api/collection-rules | Régua de cobrança |
| GET | /api/agreements | Acordos firmados |

## 🗄️ Banco de Dados

Tabelas principais:
- `tenants` — Clínicas cadastradas
- `users` — Usuários por clínica
- `debtors` — Pacientes devedores
- `debts` — Dívidas (pending / negotiating / agreed / paid / cancelled)
- `agreements` — Acordos firmados
- `agreement_installments` — Parcelas dos acordos
- `messages` — Mensagens WhatsApp (inbound/outbound)
- `calls` — Histórico de interações
- `collection_rules` — Régua de cobrança por tenant
- `password_reset_tokens` — Tokens de recuperação de senha
- `refresh_tokens` — Sessões ativas
- `audit_logs` — Rastreabilidade completa

## 🤖 IA Negociadora

O Claude Haiku analisa cada mensagem recebida no WhatsApp levando em conta:
- Histórico da conversa (últimas 10 mensagens)
- Dias em atraso
- Valor da dívida
- Desconto máximo permitido por perfil

Tabela de descontos automáticos:

| Atraso | Desconto máximo |
|--------|----------------|
| 0–30 dias | 0% |
| 31–60 dias | 5% |
| 61–90 dias | 10% |
| 90+ dias | 15% |

Quando o devedor confirma o pagamento, o sistema:
1. Cria o acordo automaticamente
2. Gera as parcelas
3. Atualiza o status da dívida
4. Notifica a clínica por email
5. Confirma para o devedor via WhatsApp

## 📄 Licença

MIT
