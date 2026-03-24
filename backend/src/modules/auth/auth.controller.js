const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const supabase = require('../../config/db')
const env = require('../../config/env')

function generateTokens(user) {
  const payload = { userId: user.id, tenantId: user.tenant_id, role: user.role }
  const accessToken = jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn })
  const refreshToken = crypto.randomBytes(64).toString('hex')
  return { accessToken, refreshToken }
}

exports.register = async (req, res, next) => {
  try {
    const { tenantName, tenantSlug, tenantEmail, name, email, password } = req.body
    if (!tenantName || !tenantSlug || !tenantEmail || !name || !email || !password)
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' })

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants').insert({ name: tenantName, slug: tenantSlug, email: tenantEmail })
      .select().single()
    if (tenantError) {
      if (tenantError.code === '23505') return res.status(409).json({ error: 'Tenant já existe' })
      throw tenantError
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const { data: user, error: userError } = await supabase
      .from('users').insert({ tenant_id: tenant.id, name, email, password_hash: passwordHash, role: 'admin' })
      .select().single()
    if (userError) throw userError

    const { accessToken, refreshToken } = generateTokens(user)
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    await supabase.from('refresh_tokens').insert({ user_id: user.id, tenant_id: tenant.id, token_hash: tokenHash, expires_at: expiresAt })

    res.status(201).json({ accessToken, refreshToken, tenantId: tenant.id })
  } catch (err) { next(err) }
}

exports.login = async (req, res, next) => {
  try {
    const { email, password, tenantSlug } = req.body
    if (!email || !password || !tenantSlug)
      return res.status(400).json({ error: 'Email, senha e slug são obrigatórios' })

    const { data: tenant } = await supabase.from('tenants').select('*').eq('slug', tenantSlug).eq('active', true).single()
    if (!tenant) return res.status(404).json({ error: 'Empresa não encontrada' })

    const { data: user } = await supabase.from('users').select('*').eq('email', email).eq('tenant_id', tenant.id).eq('active', true).single()
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' })

    await supabase.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', user.id)

    const { accessToken, refreshToken } = generateTokens(user)
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    await supabase.from('refresh_tokens').insert({ user_id: user.id, tenant_id: tenant.id, token_hash: tokenHash, expires_at: expiresAt })

    res.json({ accessToken, refreshToken })
  } catch (err) { next(err) }
}

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token não fornecido' })

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')

    const { data: tokenData } = await supabase.from('refresh_tokens').select('*')
      .eq('token_hash', tokenHash).eq('revoked', false).gt('expires_at', new Date().toISOString()).single()
    if (!tokenData) return res.status(401).json({ error: 'Refresh token inválido' })

    const { data: user } = await supabase.from('users').select('*').eq('id', tokenData.user_id).single()
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' })

    await supabase.from('refresh_tokens').update({ revoked: true }).eq('token_hash', tokenHash)

    const tokens = generateTokens(user)
    const newHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    await supabase.from('refresh_tokens').insert({ user_id: user.id, tenant_id: user.tenant_id, token_hash: newHash, expires_at: expiresAt })

    res.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken })
  } catch (err) { next(err) }
}

exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token não fornecido' })
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
    await supabase.from('refresh_tokens').update({ revoked: true }).eq('token_hash', tokenHash)
    res.json({ message: 'Logout realizado com sucesso' })
  } catch (err) { next(err) }
}
