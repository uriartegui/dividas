const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const supabase = require("../../config/db");
const env = require("../../config/env");

function generateTokens(user) {
  const payload = {
    userId: user.id,
    tenantId: user.tenant_id,
    role: user.role,
  };
  const accessToken = jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });
  const refreshToken = crypto.randomBytes(64).toString("hex");
  return { accessToken, refreshToken };
}

exports.register = async (req, res, next) => {
  try {
    const { tenantName, tenantSlug, tenantEmail, name, email, password } =
      req.body;
    if (
      !tenantName ||
      !tenantSlug ||
      !tenantEmail ||
      !name ||
      !email ||
      !password
    )
      return res
        .status(400)
        .json({ error: "Todos os campos são obrigatórios" });

    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({ name: tenantName, slug: tenantSlug, email: tenantEmail })
      .select()
      .single();
    if (tenantError) {
      if (tenantError.code === "23505")
        return res.status(409).json({ error: "Tenant já existe" });
      throw tenantError;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        tenant_id: tenant.id,
        name,
        email,
        password_hash: passwordHash,
        role: "admin",
      })
      .select()
      .single();
    if (userError) throw userError;

    const { accessToken, refreshToken } = generateTokens(user);
    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    await supabase
      .from("refresh_tokens")
      .insert({
        user_id: user.id,
        tenant_id: tenant.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      });

    res.status(201).json({ accessToken, refreshToken, tenantId: tenant.id });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password, tenantSlug } = req.body;
    if (!email || !password || !tenantSlug)
      return res
        .status(400)
        .json({ error: "Email, senha e slug são obrigatórios" });

    const { data: tenant } = await supabase
      .from("tenants")
      .select("*")
      .eq("slug", tenantSlug)
      .eq("active", true)
      .single();
    if (!tenant)
      return res.status(404).json({ error: "Empresa não encontrada" });

    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .eq("tenant_id", tenant.id)
      .eq("active", true)
      .single();
    if (!user) return res.status(401).json({ error: "Credenciais inválidas" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Credenciais inválidas" });

    await supabase
      .from("users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", user.id);

    const { accessToken, refreshToken } = generateTokens(user);
    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    await supabase
      .from("refresh_tokens")
      .insert({
        user_id: user.id,
        tenant_id: tenant.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      });

    res.json({ accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ error: "Refresh token não fornecido" });

    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const { data: tokenData } = await supabase
      .from("refresh_tokens")
      .select("*")
      .eq("token_hash", tokenHash)
      .eq("revoked", false)
      .gt("expires_at", new Date().toISOString())
      .single();
    if (!tokenData)
      return res.status(401).json({ error: "Refresh token inválido" });

    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("id", tokenData.user_id)
      .single();
    if (!user) return res.status(401).json({ error: "Usuário não encontrado" });

    await supabase
      .from("refresh_tokens")
      .update({ revoked: true })
      .eq("token_hash", tokenHash);

    const tokens = generateTokens(user);
    const newHash = crypto
      .createHash("sha256")
      .update(tokens.refreshToken)
      .digest("hex");
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    await supabase
      .from("refresh_tokens")
      .insert({
        user_id: user.id,
        tenant_id: user.tenant_id,
        token_hash: newHash,
        expires_at: expiresAt,
      });

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ error: "Refresh token não fornecido" });
    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");
    await supabase
      .from("refresh_tokens")
      .update({ revoked: true })
      .eq("token_hash", tokenHash);
    res.json({ message: "Logout realizado com sucesso" });
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email, tenantSlug } = req.body;
    if (!email || !tenantSlug)
      return res.status(400).json({ error: "Email e slug são obrigatórios" });

    const { data: tenant } = await supabase
      .from("tenants")
      .select("*")
      .eq("slug", tenantSlug)
      .single();
    if (!tenant)
      return res.json({
        message: "Se o email existir, você receberá um link.",
      });

    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .eq("tenant_id", tenant.id)
      .single();
    if (!user)
      return res.json({
        message: "Se o email existir, você receberá um link.",
      });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hora

    await supabase
      .from("password_reset_tokens")
      .insert({ user_id: user.id, token, expires_at: expiresAt });

    const resetUrl = `${env.frontendUrl}/reset-password?token=${token}`;

    const { Resend } = require("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "Cobranças SaaS <onboarding@resend.dev>",
      to: user.email,
      subject: "Redefinição de senha",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="color:#1D4ED8">Redefinição de senha</h2>
          <p>Olá, <strong>${user.name}</strong>!</p>
          <p>Clique no botão abaixo para redefinir sua senha. O link expira em <strong>1 hora</strong>.</p>
          <a href="${resetUrl}" style="display:inline-block;background:#1D4ED8;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
            Redefinir senha
          </a>
          <p style="color:#6B7280;font-size:12px">Se você não solicitou isso, ignore este email.</p>
        </div>
      `,
    });

    res.json({ message: "Se o email existir, você receberá um link." });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res.status(400).json({ error: "Token e senha são obrigatórios" });

    const { data: tokenData } = await supabase
      .from("password_reset_tokens")
      .select("*")
      .eq("token", token)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!tokenData)
      return res.status(400).json({ error: "Token inválido ou expirado" });

    const passwordHash = await bcrypt.hash(password, 12);
    await supabase
      .from("users")
      .update({ password_hash: passwordHash })
      .eq("id", tokenData.user_id);
    await supabase
      .from("password_reset_tokens")
      .update({ used: true })
      .eq("id", tokenData.id);

    res.json({ message: "Senha redefinida com sucesso!" });
  } catch (err) {
    next(err);
  }
};
