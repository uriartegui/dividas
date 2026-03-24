const router = require('express').Router()
const auth = require('../../middlewares/auth.middleware')
const supabase = require('../../config/db')

router.use(auth)

// Lista acordos com filtros e paginação
router.get('/', async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query
    const from = (page - 1) * limit
    const to = from + Number(limit) - 1

    let query = supabase
      .from('agreements')
      .select('*, debtors(name, phone), debts(description, original_amount)', { count: 'exact' })
      .eq('tenant_id', req.tenantId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (status) query = query.eq('status', status)

    const { data, error, count } = await query
    if (error) throw error
    res.json({ data, total: count, page: Number(page), limit: Number(limit) })
  } catch (err) { next(err) }
})

// Cria acordo manualmente
router.post('/', async (req, res, next) => {
  try {
    const { debt_id, debtor_id, total_amount, installments, first_due_date, discount_pct, channel, notes } = req.body
    if (!debt_id || !debtor_id || !total_amount || !installments || !first_due_date)
      return res.status(400).json({ error: 'Campos obrigatórios: debt_id, debtor_id, total_amount, installments, first_due_date' })

    const { data: agreement, error } = await supabase.from('agreements')
      .insert({ tenant_id: req.tenantId, debt_id, debtor_id, total_amount, installments, first_due_date, discount_pct: discount_pct || 0, channel, notes })
      .select().single()
    if (error) throw error

    // Cria as parcelas
    const installmentAmount = (total_amount / installments).toFixed(2)
    const installmentRows = []
    for (let i = 0; i < installments; i++) {
      const dueDate = new Date(first_due_date)
      dueDate.setMonth(dueDate.getMonth() + i)
      installmentRows.push({
        tenant_id: req.tenantId,
        agreement_id: agreement.id,
        installment_num: i + 1,
        amount: installmentAmount,
        due_date: dueDate.toISOString().split('T')[0],
      })
    }
    await supabase.from('agreement_installments').insert(installmentRows)

    // Atualiza status da dívida
    await supabase.from('debts').update({ status: 'agreed' }).eq('id', debt_id)

    res.status(201).json(agreement)
  } catch (err) { next(err) }
})

// Detalhe de um acordo com parcelas
router.get('/:id', async (req, res, next) => {
  try {
    const { data: agreement, error } = await supabase
      .from('agreements')
      .select('*, debtors(name, phone, cpf), debts(description, original_amount)')
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .single()
    if (error) return res.status(404).json({ error: 'Acordo não encontrado' })

    const { data: installments } = await supabase
      .from('agreement_installments')
      .select('*')
      .eq('agreement_id', req.params.id)
      .order('installment_num')

    res.json({ ...agreement, installment_list: installments })
  } catch (err) { next(err) }
})

// Marca parcela como paga
router.patch('/installments/:installmentId/pay', async (req, res, next) => {
  try {
    const { paid_amount } = req.body
    const { data, error } = await supabase
      .from('agreement_installments')
      .update({ paid_at: new Date().toISOString(), paid_amount: paid_amount || null })
      .eq('id', req.params.installmentId)
      .select().single()
    if (error) throw error
    res.json(data)
  } catch (err) { next(err) }
})

module.exports = router
