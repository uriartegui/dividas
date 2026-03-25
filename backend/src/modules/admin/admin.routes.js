const router = require('express').Router()
const auth = require('../../middlewares/auth.middleware')
const supabase = require('../../config/db')

// Middleware: só superadmin
const superadminOnly = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Acesso negado' })
  }
  next()
}

router.use(auth, superadminOnly)

// GET /api/admin/tenants — lista todas as clínicas
router.get('/tenants', async (req, res, next) => {
  try {
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id, name, slug, email, plan, active, created_at, stripe_customer_id')
      .neq('slug', 'superadmin')
      .order('created_at', { ascending: false })
    if (error) throw error

    // Conta devedores e dívidas por tenant
    const enriched = await Promise.all(tenants.map(async (t) => {
      const [{ count: debtors }, { count: debts }, { count: calls }] = await Promise.all([
        supabase.from('debtors').select('*', { count: 'exact', head: true }).eq('tenant_id', t.id).eq('active', true),
        supabase.from('debts').select('*', { count: 'exact', head: true }).eq('tenant_id', t.id),
        supabase.from('calls').select('*', { count: 'exact', head: true }).eq('tenant_id', t.id),
      ])
      return { ...t, debtors: debtors || 0, debts: debts || 0, calls: calls || 0 }
    }))

    res.json(enriched)
  } catch (err) { next(err) }
})

// GET /api/admin/metrics — métricas gerais
router.get('/metrics', async (req, res, next) => {
  try {
    const [
      { count: totalTenants },
      { count: totalDebtors },
      { count: totalDebts },
      { count: totalCalls },
      { data: plans }
    ] = await Promise.all([
      supabase.from('tenants').select('*', { count: 'exact', head: true }).neq('slug', 'superadmin').eq('active', true),
      supabase.from('debtors').select('*', { count: 'exact', head: true }).eq('active', true),
      supabase.from('debts').select('*', { count: 'exact', head: true }),
      supabase.from('calls').select('*', { count: 'exact', head: true }),
      supabase.from('tenants').select('plan').neq('slug', 'superadmin'),
    ])

    const planBreakdown = plans?.reduce((acc, t) => {
      acc[t.plan] = (acc[t.plan] || 0) + 1
      return acc
    }, {}) || {}

    res.json({ totalTenants, totalDebtors, totalDebts, totalCalls, planBreakdown })
  } catch (err) { next(err) }
})

// PATCH /api/admin/tenants/:id/toggle — ativar/desativar clínica
router.patch('/tenants/:id/toggle', async (req, res, next) => {
  try {
    const { data: tenant } = await supabase.from('tenants').select('active').eq('id', req.params.id).single()
    const { data, error } = await supabase.from('tenants')
      .update({ active: !tenant.active })
      .eq('id', req.params.id).select().single()
    if (error) throw error
    res.json(data)
  } catch (err) { next(err) }
})

module.exports = router
