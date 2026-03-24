-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TENANTS (Clínicas/Empresas)
-- ============================================================
CREATE TABLE tenants (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(200) NOT NULL,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    cnpj        VARCHAR(20),
    email       VARCHAR(200) NOT NULL,
    phone       VARCHAR(30),
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    plan        VARCHAR(50) NOT NULL DEFAULT 'trial',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    email           VARCHAR(200) NOT NULL,
    password_hash   TEXT NOT NULL,
    role            VARCHAR(50) NOT NULL DEFAULT 'operator',
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- ============================================================
-- REFRESH TOKENS
-- ============================================================
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DEVEDORES
-- ============================================================
CREATE TABLE debtors (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL,
    cpf         VARCHAR(20),
    email       VARCHAR(200),
    phone       VARCHAR(30),
    phone2      VARCHAR(30),
    address     JSONB,
    notes       TEXT,
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DÍVIDAS
-- ============================================================
CREATE TYPE debt_status AS ENUM (
    'pending', 'negotiating', 'agreed', 'paid', 'cancelled'
);

CREATE TABLE debts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    debtor_id       UUID NOT NULL REFERENCES debtors(id) ON DELETE CASCADE,
    description     VARCHAR(500) NOT NULL,
    original_amount NUMERIC(12,2) NOT NULL,
    current_amount  NUMERIC(12,2) NOT NULL,
    due_date        DATE NOT NULL,
    status          debt_status NOT NULL DEFAULT 'pending',
    reference_code  VARCHAR(100),
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ACORDOS
-- ============================================================
CREATE TYPE agreement_status AS ENUM (
    'active', 'fulfilled', 'broken', 'cancelled'
);

CREATE TABLE agreements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    debt_id         UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
    debtor_id       UUID NOT NULL REFERENCES debtors(id),
    total_amount    NUMERIC(12,2) NOT NULL,
    discount_pct    NUMERIC(5,2) DEFAULT 0,
    installments    INT NOT NULL DEFAULT 1,
    first_due_date  DATE NOT NULL,
    status          agreement_status NOT NULL DEFAULT 'active',
    channel         VARCHAR(50),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE agreement_installments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agreement_id    UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
    installment_num INT NOT NULL,
    amount          NUMERIC(12,2) NOT NULL,
    due_date        DATE NOT NULL,
    paid_at         TIMESTAMPTZ,
    paid_amount     NUMERIC(12,2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CHAMADAS / INTERAÇÕES
-- ============================================================
CREATE TYPE call_channel AS ENUM ('whatsapp', 'voice', 'email', 'manual');
CREATE TYPE call_outcome AS ENUM (
    'no_answer', 'accepted', 'refused',
    'wants_installment', 'already_paid', 'callback_requested', 'error'
);

CREATE TABLE calls (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    debt_id         UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
    debtor_id       UUID NOT NULL REFERENCES debtors(id),
    channel         call_channel NOT NULL,
    outcome         call_outcome,
    duration_sec    INT,
    transcript      TEXT,
    ai_used         BOOLEAN DEFAULT FALSE,
    initiated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at        TIMESTAMPTZ,
    metadata        JSONB
);

-- ============================================================
-- MENSAGENS WHATSAPP
-- ============================================================
CREATE TYPE message_direction AS ENUM ('outbound', 'inbound');
CREATE TYPE message_status AS ENUM ('queued', 'sent', 'delivered', 'read', 'failed');

CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    call_id         UUID REFERENCES calls(id),
    debtor_id       UUID NOT NULL REFERENCES debtors(id),
    direction       message_direction NOT NULL,
    channel         call_channel NOT NULL DEFAULT 'whatsapp',
    content         TEXT NOT NULL,
    status          message_status NOT NULL DEFAULT 'queued',
    external_id     VARCHAR(200),
    sent_at         TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id),
    action      VARCHAR(100) NOT NULL,
    entity      VARCHAR(100),
    entity_id   UUID,
    old_value   JSONB,
    new_value   JSONB,
    ip_address  INET,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX idx_users_tenant       ON users(tenant_id);
CREATE INDEX idx_debtors_tenant     ON debtors(tenant_id);
CREATE INDEX idx_debtors_cpf        ON debtors(tenant_id, cpf);
CREATE INDEX idx_debts_tenant       ON debts(tenant_id);
CREATE INDEX idx_debts_status       ON debts(tenant_id, status);
CREATE INDEX idx_debts_due_date     ON debts(tenant_id, due_date);
CREATE INDEX idx_agreements_tenant  ON agreements(tenant_id);
CREATE INDEX idx_calls_tenant       ON calls(tenant_id);
CREATE INDEX idx_messages_tenant    ON messages(tenant_id);
CREATE INDEX idx_audit_tenant       ON audit_logs(tenant_id);

-- ============================================================
-- TRIGGER updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_upd    BEFORE UPDATE ON tenants    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_upd      BEFORE UPDATE ON users      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_debtors_upd    BEFORE UPDATE ON debtors    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_debts_upd      BEFORE UPDATE ON debts      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_agreements_upd BEFORE UPDATE ON agreements FOR EACH ROW EXECUTE FUNCTION set_updated_at();
