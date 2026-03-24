const router = require('express').Router()
const auth = require('../../middlewares/auth.middleware')
const { runCollection } = require('./collection.service')

router.use(auth)

router.post('/run', async (req, res, next) => {
  try {
    const result = await runCollection(req.tenantId)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.get('/calls', async (req, res, next) => {
  try {
    const supabase = require('../../config/db')
    const { data, error } = await supabase
      .from('calls')
      .select('*, debtors(name, phone), debts(description, current_amount)')
      .eq('tenant_id', req.tenantId)
      .order('initiated_at', { ascending: false })
      .limit(50)
    if (error) throw error
    res.json(data)
  } catch (err) {
    next(err)
  }
})

module.exports = router
