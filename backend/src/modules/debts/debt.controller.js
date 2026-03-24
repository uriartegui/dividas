const supabase = require('../../config/db')

exports.list = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query
    const from = (page - 1) * limit
    const to = from + Number(limit) - 1

    let query = supabase.from('debts')
      .select('*, debtors(name, phone)', { count: 'exact' })
      .eq('tenant_id', req.tenantId)
      .order('due_date')
      .range(from, to)

    if (status) query = query.eq('status', status)
    if (search) query = query.ilike('description', `%${search}%`)

    const { data, error, count } = await query
    if (error) throw error
    res.json({ data, total: count, page: Number(page), limit: Number(limit) })
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
