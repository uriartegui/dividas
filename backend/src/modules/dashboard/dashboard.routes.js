const router = require('express').Router()
const auth = require('../../middlewares/auth.middleware')
const supabase = require('../../config/db')

router.use(auth)

router.get('/metrics', async (req, res, next) => {
  try {
    const tenantId = req.tenantId

    const { data: debts } = await supabase
      .from('debts')
      .select('current_amount, status')
      .eq('tenant_id', tenantId)

    const { data: calls } = await supabase
      .from('calls')
      .select('outcome')
      .eq('tenant_id', tenantId)

    const { count: messagesCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'sent')

    const totalOpen = debts
      ?.filter(d => ['pending', 'negotiating'].includes(d.status))
      .reduce((acc, d) => acc + Number(d.current_amount), 0) || 0

    const totalRecovered = debts
      ?.filter(d => ['agreed', 'paid'].includes(d.status))
      .reduce((acc, d) => acc + Number(d.current_amount), 0) || 0

    const totalDebts = debts?.length || 0
    const recoveredCount = debts?.filter(d => ['agreed', 'paid'].includes(d.status)).length || 0
    const recoveryRate = totalDebts > 0 ? ((recoveredCount / totalDebts) * 100).toFixed(1) : 0

    const totalCalls = calls?.length || 0
    const successfulCalls = calls?.filter(c =>
      ['accepted', 'already_paid', 'wants_installment'].includes(c.outcome)
    ).length || 0

    const outcomeBreakdown = calls?.reduce((acc, c) => {
      acc[c.outcome] = (acc[c.outcome] || 0) + 1
      return acc
    }, {}) || {}

    res.json({
      totalOpen,
      totalRecovered,
      recoveryRate: Number(recoveryRate),
      totalDebts,
      recoveredCount,
      totalCalls,
      successfulCalls,
      messagesSent: messagesCount || 0,
      outcomeBreakdown,
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
