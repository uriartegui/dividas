const supabase = require('../../config/db')

exports.list = async (req, res, next) => {
  try {
    let query = supabase.from('debts').select('*, debtors(name, phone)')
      .eq('tenant_id', req.tenantId).order('due_date')
    if (req.query.status) query = query.eq('status', req.query.status)
    const { data, error } = await query
    if (error) throw error
    res.json(data)
  } catch (err) { next(err) }
}

exports.getOne = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('debts').select('*, debtors(name, phone)')
      .eq('id', req.params.id).eq('tenant_id', req.tenantId).single()
    if (error) return res.status(404).json({ error: 'Dívida não encontrada' })
    res.json(data)
  } catch (err) { next(err) }
}

exports.create = async (req, res, next) => {
  try {
    const { debtor_id, description, original_amount, due_date, reference_code } = req.body
    if (!debtor_id || !description || !original_amount || !due_date)
      return res.status(400).json({ error: 'Campos obrigatórios: debtor_id, description, original_amount, due_date' })
    const { data, error } = await supabase.from('debts')
      .insert({ tenant_id: req.tenantId, debtor_id, description, original_amount, current_amount: original_amount, due_date, reference_code })
      .select().single()
    if (error) throw error
    res.status(201).json(data)
  } catch (err) { next(err) }
}

exports.update = async (req, res, next) => {
  try {
    const { description, current_amount, due_date, reference_code } = req.body
    const { data, error } = await supabase.from('debts')
      .update({ description, current_amount, due_date, reference_code })
      .eq('id', req.params.id).eq('tenant_id', req.tenantId).select().single()
    if (error) return res.status(404).json({ error: 'Dívida não encontrada' })
    res.json(data)
  } catch (err) { next(err) }
}

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body
    const valid = ['pending', 'negotiating', 'agreed', 'paid', 'cancelled']
    if (!valid.includes(status)) return res.status(400).json({ error: 'Status inválido' })
    const { data, error } = await supabase.from('debts')
      .update({ status }).eq('id', req.params.id).eq('tenant_id', req.tenantId).select().single()
    if (error) return res.status(404).json({ error: 'Dívida não encontrada' })
    res.json(data)
  } catch (err) { next(err) }
}
