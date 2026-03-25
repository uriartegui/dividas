const router = require('express').Router()
const auth = require('../../middlewares/auth.middleware')
const supabase = require('../../config/db')

router.use(auth)

// GET /api/profile — retorna dados da clínica
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name, slug, email, phone, cnpj, plan, created_at')
      .eq('id', req.tenantId)
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) { next(err) }
})

// PUT /api/profile — atualiza dados da clínica
router.put('/', async (req, res, next) => {
  try {
    const { name, email, phone, cnpj } = req.body
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' })
    const { data, error } = await supabase
      .from('tenants')
      .update({ name, email, phone, cnpj, updated_at: new Date().toISOString() })
      .eq('id', req.tenantId)
      .select()
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) { next(err) }
})

module.exports = router
