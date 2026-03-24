const router = require('express').Router()
const auth = require('../../middlewares/auth.middleware')
const { runWhatsAppCampaign } = require('./whatsapp.service')
const supabase = require('../../config/db')

router.use(auth)

router.post('/send', async (req, res, next) => {
  try {
    const result = await runWhatsAppCampaign(req.tenantId)
    res.json(result)
  } catch (err) { next(err) }
})

router.get('/messages', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*, debtors(name, phone)')
      .eq('tenant_id', req.tenantId)
      .eq('channel', 'whatsapp')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    res.json(data)
  } catch (err) { next(err) }
})

module.exports = router
